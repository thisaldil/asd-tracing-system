import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, Vibration,
  Dimensions, ActivityIndicator
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TracingCanvas from '../components/TracingCanvas';
import { SRI_LANKAN_SHAPES, getShapesForDifficulty } from '../data/shapes/sriLankanShapes';
import { submitTrial, startSession, endSession, syncOfflineQueue } from '../services/apiService';
import { useChild } from '../context/ChildContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TracingGameScreen({ navigation }) {
  const { activeChild, cognitiveState, updateCognitiveState } = useChild();

  const [sessionId,       setSessionId]       = useState(null);
  const [currentShape,    setCurrentShape]    = useState(null);
  const [shapeSize,       setShapeSize]       = useState(240);
  const [guidanceLevel,   setGuidanceLevel]   = useState('voice');
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [trialNumber,     setTrialNumber]     = useState(0);
  const [showReward,      setShowReward]      = useState(false);
  const [showGuidance,    setShowGuidance]    = useState(false);
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
    // TEMPORARY: hardcoded test child for development
    // Replace this with real child profile from context later
    const testChild = {
      _id: '69e0e39c84040d2901db4b04',
      alias: 'Test Child',
      asdSeverityLevel: 2,
      verbalAbility: 'limited',
      sensoryProfile: { preferredRewardType: 'visual' }
    };

    // If no active child, use test child
    const child = activeChild || testChild;

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
    const randomIndex = Math.floor(Math.random() * shapes.length);
    setCurrentShape(shapes[randomIndex]);
  }

  function getSizeForDifficulty(level) {
    return { 1: 300, 2: 240, 3: 180, 4: 130, 5: 110 }[level] || 240;
  }

  function getGuidanceForDifficulty(level) {
    return { 1: 'full', 2: 'voice', 3: 'subtle', 4: 'none', 5: 'none' }[level] || 'voice';
  }

  /**
   * Called by TracingCanvas when a tracing attempt ends
   */
 async function handleTrialComplete({ metrics, touchPathSample, completed }) {
    let currentTrial;
    setTrialNumber(prev => {
      currentTrial = prev + 1;
      return currentTrial;
    });
    await new Promise(r => setTimeout(r, 0)); 

    const trialData = {
      childId:        (activeChild || { _id: '69e0e39c84040d2901db4b04' })._id,
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

    // Update local cognitive state display
    if (result.currentDifficultyLevel && result.currentDifficultyLevel !== difficultyLevel) {
      setDifficultyLevel(result.currentDifficultyLevel);
      setShapeSize(getSizeForDifficulty(result.currentDifficultyLevel));
      setGuidanceLevel(getGuidanceForDifficulty(result.currentDifficultyLevel));
    }

    setAccuracy(Math.round(result.accuracyScore * 100));

    // Trigger reward if accuracy is good
    if (result.rewardTriggered) {
      setShowReward(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setShowReward(false);
        pickNextShape(result.currentDifficultyLevel || difficultyLevel);
      }, 2000);
    } else {
      // Soft guidance — no punishment, just a gentle visual cue
      if (result.adaptationTriggered === 'guidance_added') {
        setShowGuidance(true);
        setTimeout(() => {
          setShowGuidance(false);
          pickNextShape(difficultyLevel);
        }, 1500);
      } else {
        setTimeout(() => pickNextShape(difficultyLevel), 800);
      }
    }
  }

  // End session and go back
async function handleEndSession() {
    const scores = sessionTrialsRef.current;
    const avgAccuracy = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    await endSession(sessionId, (activeChild || { _id: '69e0e39c84040d2901db4b04' })._id, {
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
      setTrialNumber(0);
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
      {showReward && (
        <View style={styles.rewardOverlay}>
          <Text style={styles.rewardStar}>★</Text>
          <Text style={styles.rewardText}>Well done!</Text>
          <Text style={styles.rewardTextSinhala}>ගොඩාක් හොඳයි!</Text>
        </View>
      )}

      {/* Guidance overlay — gentle, not punishment */}
      {showGuidance && (
        <View style={styles.guidanceOverlay}>
          <Text style={styles.guidanceText}>Follow the dots slowly</Text>
          <Text style={styles.guidanceTextSinhala}>සෙමෙන් dots ගන්න...</Text>
        </View>
      )}

      {/* Difficulty indicator for therapist/parent to see */}
      <View style={styles.footer}>
        <Text style={styles.difficultyText}>Level {difficultyLevel}</Text>
        <Text style={styles.trialCountText}>Trial {trialNumber}</Text>
        <Text style={styles.endButton} onPress={handleEndSession}>End Session</Text>
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3
  },
  rewardOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 200, 50, 0.92)',
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 20,
  },
  rewardStar:  { fontSize: 80, color: '#FF8C00' },
  rewardText:  { fontSize: 36, color: '#3D2B1F', fontWeight: '600', marginTop: 8 },
  rewardTextSinhala: { fontSize: 22, color: '#5A3E28', marginTop: 4 },
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
});