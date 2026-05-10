import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, Vibration,
  Dimensions, ActivityIndicator, Platform,
  TouchableOpacity, Modal, FlatList
} from 'react-native';
import * as Haptics from 'expo-haptics';
import TracingCanvas from '../components/TracingCanvas';
import { SRI_LANKAN_SHAPES, getShapesForDifficulty } from '../data/shapes/sriLankanShapes';
import { submitTrial, startSession, endSession, syncOfflineQueue } from '../services/apiService';
import { useChild } from '../context/ChildContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/**
 * Determines performance phase from blended accuracy (0.0 – 1.0).
 * Uses frontend blendedAccuracy — no server roundtrip needed.
 *
 * POOR  < 0.40 — gentle retry, no punishment
 * OK    0.40 – 0.74 — encouraging, acknowledges effort
 * GREAT ≥ 0.75 — full reward, celebration
 */
function getPerformancePhase(blendedAccuracy) {
  if (blendedAccuracy >= 0.75) return 'great';
  if (blendedAccuracy >= 0.40) return 'ok';
  return 'poor';
}

export default function TracingGameScreen({ navigation }) {
  const { activeChild, cognitiveState, updateCognitiveState } = useChild();

  const [sessionId,       setSessionId]       = useState(null);
  const [currentShape,    setCurrentShape]    = useState(null);
  const [shapeSize,       setShapeSize]       = useState(240);
  const [guidanceLevel,   setGuidanceLevel]   = useState('voice');
const [difficultyLevel, setDifficultyLevel] = useState(1);
const [showLevelPicker, setShowLevelPicker] = useState(false);
  const trialNumberRef = useRef(0); // FIX 3: use ref to avoid race conditions
const [performancePhase, setPerformancePhase] = useState(null); // null | 'poor' | 'ok' | 'great'  const [showGuidance,    setShowGuidance]    = useState(false);
  const [sessionLoading,  setSessionLoading]  = useState(true);
  const [accuracy,        setAccuracy]        = useState(null);
  const sessionTrialsRef = useRef([]);

  // Start a new session when screen loads
  useEffect(() => {
    initSession();
    syncOfflineQueue(); // try to sync any offline trials
  }, []);

  // Pick a new shape whenever difficulty changes
  useEffect(() => {
    pickNextShape(difficultyLevel);
  }, [difficultyLevel]);

async function initSession() {
    // FIX 4: Guard against missing activeChild instead of using hardcoded fallback
    if (!activeChild) {
      console.warn('No active child selected');
      setSessionLoading(false);
      Alert.alert('Error', 'Please select a child first', [
        {
          text: 'Go Back',
          onPress: () => navigation.goBack()
        }
      ]);
      return;
    }
    const child = activeChild;

    setSessionLoading(true);
    const session = await startSession(child._id, {
      platform: 'web',
      screenWidth: Math.round(SCREEN_WIDTH),
      screenHeight: Math.round(Dimensions.get('window').height),
    });
    setSessionId(session._id || 'offline_session_001');

    const initialDifficulty = cognitiveState?.difficultyLevel || 1;
    setDifficultyLevel(initialDifficulty);
    setShapeSize(getSizeForDifficulty(initialDifficulty));
    setGuidanceLevel(getGuidanceForDifficulty(initialDifficulty));
    setSessionLoading(false);
  }

  function pickNextShape(difficulty) {
    const shapes = getShapesForDifficulty(difficulty);
    if (!shapes || shapes.length === 0) return; // FIX 2: guard against empty arrays
    const randomIndex = Math.floor(Math.random() * shapes.length);
    setCurrentShape(shapes[randomIndex]);
  }

  function getSizeForDifficulty(level) {
    return 300; // Keep constant size across all difficulty levels
  }

  function getGuidanceForDifficulty(level) {
    return { 1: 'full', 2: 'voice', 3: 'subtle', 4: 'none', 5: 'none' }[level] || 'voice';
  }

  // ADD THIS — called when user picks a level from dropdown:
function handleLevelSelect(level) {
  setShowLevelPicker(false);
  setDifficultyLevel(level);
  setShapeSize(getSizeForDifficulty(level));
  setGuidanceLevel(getGuidanceForDifficulty(level));
  setAccuracy(null);        // clear old accuracy display
  pickNextShape(level);     // immediately load a shape for that level
}

  /**
   * Called by TracingCanvas when a tracing attempt ends
   */
 async function handleTrialComplete({ metrics, touchPathSample, completed }) {
    // FIX 3: Use useRef instead of state to avoid race conditions
    trialNumberRef.current += 1;
    const currentTrial = trialNumberRef.current;
    
    // FIX 4: Guard against missing activeChild
    if (!activeChild) {
      console.warn('No active child selected during trial');
      return;
    }

    const trialData = {
      childId:        activeChild._id,
      sessionId,
      trialNumber:    currentTrial,
      shapeId:        currentShape.id,
      shapeCategory:  currentShape.category,
      difficultyLevel,
      metrics,
      touchPathSample,
      completed,
    };

    // Submit to backend (or offline queue)
    const result = await submitTrial(trialData);
    sessionTrialsRef.current.push(result.accuracyScore);

    // FIX 2: Clamp difficulty to max level 4
    const nextLevel = Math.min(result.currentDifficultyLevel || difficultyLevel, 4);
    
    // Update local cognitive state display
    if (nextLevel && nextLevel !== difficultyLevel) {
      setDifficultyLevel(nextLevel);
      setShapeSize(getSizeForDifficulty(nextLevel));
      setGuidanceLevel(getGuidanceForDifficulty(nextLevel));
    }

    setAccuracy(Math.round(result.accuracyScore * 100));

// ── Phase decision from frontend blendedAccuracy ──────────────────────────
const phase = getPerformancePhase(metrics.blendedAccuracy);
setPerformancePhase(phase);

if (phase === 'great') {
  // Full celebration — earned it
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => {
    setPerformancePhase(null);
    pickNextShape(nextLevel);
  }, 2200);

} else if (phase === 'ok') {
  // Gentle encouragement — light haptic, shorter display
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => {
    setPerformancePhase(null);
    pickNextShape(nextLevel);
  }, 1800);

} else {
  // Poor — no haptic (avoid negative reinforcement), very brief overlay
  setTimeout(() => {
    setPerformancePhase(null);
    // Keep same difficulty — don't advance
    pickNextShape(difficultyLevel);
  }, 1600);
}
  }

  // End session and go back
async function handleEndSession() {
    // FIX 4: Guard against missing activeChild
    if (!activeChild) {
      console.warn('No active child selected during session end');
      return;
    }
    
    const scores = sessionTrialsRef.current;
    const avgAccuracy = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    await endSession(sessionId, activeChild._id, {
      totalTrials:      scores.length,
      completedTrials:  scores.filter(s => s > 0).length,
      avgAccuracyScore: parseFloat(avgAccuracy.toFixed(3)),
      difficultyProgression: scores.map((_, i) => difficultyLevel),
    });

    // Safe navigation — only go back if there is a screen to go back to
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // For now, just reset the session so the game restarts
      trialNumberRef.current = 0; // FIX 3: reset useRef instead of useState
      setAccuracy(null);
      sessionTrialsRef.current = [];
      initSession();
    }
  }

  if (sessionLoading || !currentShape) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Getting ready...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.shapeName}>{currentShape.nameSinhala}</Text>
        <Text style={styles.shapeNameEn}>{currentShape.name}</Text>
        {accuracy !== null && (
          <Text style={styles.accuracyText}>
            Last: {accuracy}%
          </Text>
        )}
      </View>

      {/* Instruction text */}
      <Text style={styles.instruction}>
        Place your finger on the green dot and trace to the red dot
      </Text>

      {/* The tracing canvas */}
      <View style={styles.canvasContainer}>
        <TracingCanvas
          shape={currentShape}
          shapeSize={shapeSize}
          guidanceLevel={guidanceLevel}
          onTrialComplete={handleTrialComplete}
        />
      </View>

      {/* Reward overlay */}
      {/* Performance phase overlay — three distinct responses */}
{performancePhase === 'great' && (
  <View style={[styles.phaseOverlay, styles.phaseGreat]}>
    <Text style={styles.phaseStar}>★</Text>
    <Text style={styles.phaseTitle}>Well done!</Text>
    <Text style={styles.phaseSinhala}>ගොඩාක් හොඳයි!</Text>
  </View>
)}

{performancePhase === 'ok' && (
  <View style={[styles.phaseOverlay, styles.phaseOk]}>
    <Text style={styles.phaseStar}>👍</Text>
    <Text style={styles.phaseTitle}>Good try!</Text>
    <Text style={styles.phaseSinhala}>හොඳයි, නැවත උත්සාහ කරන්න!</Text>
  </View>
)}

{performancePhase === 'poor' && (
  <View style={[styles.phaseOverlay, styles.phasePoor]}>
    <Text style={styles.phaseStar}>🔵</Text>
    <Text style={styles.phaseTitle}>Let's try again</Text>
    <Text style={styles.phaseSinhala}>සෙමෙන් dots follow කරන්න</Text>
  </View>
)}

      

      {/* Difficulty indicator for therapist/parent to see */}
     {/* Level picker modal */}
<Modal
  visible={showLevelPicker}
  transparent
  animationType="fade"
  onRequestClose={() => setShowLevelPicker(false)}
>
  <TouchableOpacity
    style={styles.modalBackdrop}
    activeOpacity={1}
    onPress={() => setShowLevelPicker(false)}
  >
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerTitle}>Select Level</Text>
      {[
        { level: 1, label: 'Level 1 — Ball & Star',       hint: 'Simple circles and shapes' },
        { level: 2, label: 'Level 2 — Flower & Banana',   hint: 'Gentle curves' },
        { level: 3, label: 'Level 3 — Ship & Car',        hint: 'Compound outlines' },
        { level: 4, label: 'Level 4 — Hand & T-Shirt',    hint: 'Fine motor control' },
      ].map(({ level, label, hint }) => (
        <TouchableOpacity
          key={level}
          style={[
            styles.pickerItem,
            difficultyLevel === level && styles.pickerItemActive,
          ]}
          onPress={() => handleLevelSelect(level)}
        >
          <Text style={[
            styles.pickerItemText,
            difficultyLevel === level && styles.pickerItemTextActive,
          ]}>
            {label}
          </Text>
          <Text style={styles.pickerItemHint}>{hint}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </TouchableOpacity>
</Modal>

{/* Footer */}
<View style={styles.footer}>
  <TouchableOpacity
    style={styles.levelButton}
    onPress={() => setShowLevelPicker(true)}
  >
    <Text style={styles.levelButtonText}>Level {difficultyLevel} ▾</Text>
  </TouchableOpacity>
  <Text style={styles.trialCountText}>Trial {trialNumberRef.current}</Text>
  <TouchableOpacity onPress={handleEndSession}>
    <Text style={styles.endButton}>End Session</Text>
  </TouchableOpacity>
</View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',  // warm white — calm for ASD
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF5'
  },
  loadingText: {
    fontSize: 18, color: '#8B7355', marginTop: 16, fontFamily: 'System'
  },
  header: {
    alignItems: 'center', marginBottom: 8
  },
  shapeName: {
    fontSize: 28, color: '#3D2B1F', fontWeight: '500', letterSpacing: 1
  },
  shapeNameEn: {
    fontSize: 16, color: '#8B7355', marginTop: 2
  },
  accuracyText: {
    fontSize: 14, color: '#6B9B6B', marginTop: 4
  },
  instruction: {
    fontSize: 15, color: '#8B7355', textAlign: 'center',
    marginHorizontal: 24, marginBottom: 20, lineHeight: 22
  },
  canvasContainer: {
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }
    })
  },
  // ── Phase overlays ──────────────────────────────────────────────────────────
phaseOverlay: {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  justifyContent: 'center', alignItems: 'center',
  borderRadius: 20,
},
phaseGreat: {
  backgroundColor: 'rgba(255, 200, 50, 0.93)',  // warm gold — celebration
},
phaseOk: {
  backgroundColor: 'rgba(100, 180, 120, 0.88)', // soft green — encouraging
},
phasePoor: {
  backgroundColor: 'rgba(160, 200, 240, 0.88)', // calm blue — no alarm
},
phaseStar: {
  fontSize: 64, marginBottom: 8,
},
phaseTitle: {
  fontSize: 32, color: '#3D2B1F', fontWeight: '600', marginBottom: 6,
},
phaseSinhala: {
  fontSize: 18, color: '#5A3E28', marginTop: 2, textAlign: 'center',
  paddingHorizontal: 20,
},
  guidanceOverlay: {
    position: 'absolute', bottom: 100, left: 40, right: 40,
    backgroundColor: 'rgba(100, 160, 220, 0.88)',
    borderRadius: 16, padding: 16, alignItems: 'center'
  },
  guidanceText:        { fontSize: 20, color: '#fff', fontWeight: '500' },
  guidanceTextSinhala: { fontSize: 16, color: '#ddeeff', marginTop: 4 },
  footer: {
    position: 'absolute', bottom: 30,
    flexDirection: 'row', justifyContent: 'space-between',
    width: SCREEN_WIDTH * 0.85, alignItems: 'center'
  },
  difficultyText: { fontSize: 14, color: '#8B7355', backgroundColor: '#F0E8D8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  trialCountText: { fontSize: 14, color: '#8B7355' },
  endButton:      { fontSize: 14, color: '#C0392B', fontWeight: '500', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#C0392B', borderRadius: 8 },

  // ADD THESE:
levelButton: {
  backgroundColor: '#F0E8D8',
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#C8B89A',
},
levelButtonText: {
  fontSize: 14,
  color: '#5A3E28',
  fontWeight: '500',
},
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'flex-end',
  paddingBottom: 40,
  paddingHorizontal: 20,
},
pickerContainer: {
  backgroundColor: '#FFFDF5',
  borderRadius: 20,
  paddingVertical: 12,
  paddingHorizontal: 8,
  ...Platform.select({
    web: { boxShadow: '0 -4px 20px rgba(0,0,0,0.12)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 10,
    },
  }),
},
pickerTitle: {
  fontSize: 13,
  color: '#8B7355',
  textAlign: 'center',
  marginBottom: 8,
  letterSpacing: 0.5,
},
pickerItem: {
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  marginVertical: 2,
},
pickerItemActive: {
  backgroundColor: '#F0E8D8',
},
pickerItemText: {
  fontSize: 16,
  color: '#3D2B1F',
  fontWeight: '500',
},
pickerItemTextActive: {
  color: '#8B4513',
},
pickerItemHint: {
  fontSize: 12,
  color: '#8B7355',
  marginTop: 2,
},
});