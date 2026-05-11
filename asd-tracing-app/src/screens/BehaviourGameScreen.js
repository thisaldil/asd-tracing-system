import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChild } from '../context/ChildContext';
import {
  startSession,
  getNextBehaviourScenario,
  submitBehaviourTrial,
} from '../services/apiService';

const ASSET_MAP = {
  eating_spoon_neat:        require('../../assets/behaviour/eating_spoon_neat.jpg'),
  eating_hands_messy:       require('../../assets/behaviour/eating_hands_messy.jpg'),
  eating_sitting_table:     require('../../assets/behaviour/eating_sitting_table.jpg'),
  eating_walking_around:    require('../../assets/behaviour/eating_walking_around.jpg'),
  hands_washing_soap:       require('../../assets/behaviour/hands_washing_soap.jpg'),
  hands_dirty_reaching:     require('../../assets/behaviour/hands_dirty_reaching.jpg'),
  brushing_teeth_morning:   require('../../assets/behaviour/brushing_teeth_morning.jpg'),
  skipping_teeth_candy:     require('../../assets/behaviour/skipping_teeth_candy.jpg'),
  sharing_toy_smiling:      require('../../assets/behaviour/sharing_toy_smiling.jpg'),
  grabbing_toy_crying:      require('../../assets/behaviour/grabbing_toy_crying.jpg'),
  sharing_snack_friends:    require('../../assets/behaviour/sharing_snack_friends.jpg'),
  hiding_snack_alone:       require('../../assets/behaviour/hiding_snack_alone.jpg'),
  crossing_zebra_lines:     require('../../assets/behaviour/crossing_zebra_lines.jpg'),
  crossing_random_spot:     require('../../assets/behaviour/crossing_random_spot.png'),
  safety_walk_away_adult:   require('../../assets/behaviour/safety_walk_away_adult.jpg'),
  safety_taking_sweets:     require('../../assets/behaviour/safety_taking_sweets.jpg'),
  toys_packed_box:          require('../../assets/behaviour/toys_packed_box.jpg'),
  toys_scattered_floor:     require('../../assets/behaviour/toys_scattered_floor.jpg'),
  greeting_wave_smile:      require('../../assets/behaviour/greeting_wave_smile.png'),
  greeting_turning_away:    require('../../assets/behaviour/greeting_turning_away.jpg'),
  queue_standing_calm:      require('../../assets/behaviour/queue_standing_calm.jpg'),
  queue_pushing_front:      require('../../assets/behaviour/queue_pushing_front.jpg'),
  game_waiting_patiently:   require('../../assets/behaviour/game_waiting_patiently.jpg'),
  game_snatching_controller: require('../../assets/behaviour/game_snatching_controller.jpg'),
};

const { width: SW, height: SH } = Dimensions.get('window');
const H_PAD = 20;
const CARD_RADIUS = 28;
const TRIALS_PER_SESSION = 8;

// ─── Palette (matches existing app) ──────────────────────
const C = {
  bg:         '#F7F3EE',
  bgDeep:     '#EDE8E1',
  sand:       '#C4A882',
  sandLight:  '#E8DFD3',
  cream:      '#FAF7F2',
  warmWhite:  '#FFFCF8',
  ink:        '#1C1610',
  inkMid:     '#4A3F35',
  inkSoft:    '#7A6E65',
  inkFaint:   '#A89E96',
  teal:       '#2BBFA4',
  tealLight:  '#D0F5EE',
  tealDark:   '#1A8C79',
  coral:      '#FF6B4A',
  coralLight: '#FFE8E2',
  amber:      '#F5A623',
  amberLight: '#FFF0D0',
  plum:       '#7B5EA7',
  plumLight:  '#EDE5F7',
  sky:        '#4A9FD4',
  skyLight:   '#DDF0FA',
  heroA:      '#2BBFA4',
  heroB:      '#1A7FA8',
  heroC:      '#0F4F7A',
};

const shadow = (depth = 8) => Platform.select({
  web:     { boxShadow: `0 ${depth}px ${depth * 2.5}px rgba(0,0,0,0.07)` },
  default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: depth, shadowOffset: { width: 0, height: depth / 2 }, elevation: Math.round(depth / 2) },
});

function BehaviourImage({ assetKey, style }) {
  const asset = ASSET_MAP[assetKey];
  if (asset) {
    return <Image source={asset} style={style} resizeMode="contain" />;
  }
  // Placeholder: colourful icon grid until real images are added
  const colors = [C.tealLight, C.coralLight, C.amberLight, C.plumLight, C.skyLight];
  const color = colors[assetKey.length % colors.length];
  const icons = ['happy-outline', 'heart-outline', 'star-outline', 'flower-outline', 'leaf-outline'];
  const icon = icons[assetKey.length % icons.length];
  return (
    <View style={[style, { backgroundColor: color, justifyContent: 'center', alignItems: 'center', borderRadius: 20 }]}>
      <Ionicons name={icon} size={56} color={color.replace('Light', '').replace('FF', '')} />
      <Text style={{ fontSize: 11, color: C.inkFaint, marginTop: 8, textAlign: 'center', paddingHorizontal: 8 }}>
        {assetKey.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

// ─── Feedback overlay ─────────────────────────────────────
function FeedbackOverlay({ visible, isCorrect, onDone }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scale,   { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onDone());
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[fs.overlay, { opacity }]}>
      <Animated.View style={[fs.bubble, {
        backgroundColor: isCorrect ? C.teal : C.coral,
        transform: [{ scale }],
      }]}>
        <Text style={fs.emoji}>{isCorrect ? '⭐' : '💛'}</Text>
        <Text style={fs.feedbackTitle}>
          {isCorrect ? 'Well done!' : "Let's try again!"}
        </Text>
        <Text style={fs.feedbackSi}>
          {isCorrect ? 'ඉතා හොඳයි!' : 'නැවත උත්සාහ කරන්න!'}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const fs = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 100,
  },
  bubble: {
    width: 220,
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    ...shadow(20),
  },
  emoji:         { fontSize: 52, marginBottom: 10 },
  feedbackTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  feedbackSi:    { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
});

// ─── Progress bar ─────────────────────────────────────────
function ProgressBar({ current, total }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: current / total,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [current]);
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: C.sandLight, borderRadius: 8, overflow: 'hidden', marginTop: 10 },
  fill:  { height: 8, backgroundColor: C.teal, borderRadius: 8 },
});

// ─── Choice card ──────────────────────────────────────────
function ChoiceCard({ image, onPress, selected, feedback, isCorrect, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.94, friction: 8, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1,    friction: 8, useNativeDriver: true }),
      ]).start();
      Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    } else {
      borderAnim.setValue(0);
    }
  }, [selected]);

  const borderColor = feedback
    ? (isCorrect ? C.teal : C.coral)
    : C.sandLight;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={{ flex: 1 }}
    >
      <Animated.View style={[
        cc.card,
        { transform: [{ scale }] },
        selected && { borderColor, borderWidth: 3 },
      ]}>
        <BehaviourImage
          assetKey={image.assetKey}
          style={cc.image}
        />
        {selected && feedback && (
          <View style={[cc.badge, { backgroundColor: isCorrect ? C.teal : C.coral }]}>
            <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={16} color="#fff" />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.warmWhite,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: C.sandLight,
    ...shadow(10),
  },
  image: {
    width: '100%',
    height: (SW - H_PAD * 2 - 16) / 2 - 4,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────
export default function BehaviourGameScreen({ navigation }) {
  const { activeChild } = useChild();
  const childId  = activeChild?._id;
  const childName = activeChild?.alias || 'Child';

  // Session state
  const [sessionId,      setSessionId]      = useState(null);
  const [trialNumber,    setTrialNumber]     = useState(0);
  const [shownIds,       setShownIds]        = useState([]);
  const [difficulty,     setDifficulty]      = useState(1);
  const [score,          setScore]           = useState(0);

  // Current trial state
  const [scenario,       setScenario]        = useState(null);
  const [loading,        setLoading]         = useState(true);
  const [trialStartTime, setTrialStartTime]  = useState(null);
  const [selectedKey,    setSelectedKey]     = useState(null);
  const [showFeedback,   setShowFeedback]    = useState(false);
  const [lastCorrect,    setLastCorrect]     = useState(false);
  const [hintShown,      setHintShown]       = useState(false);
  const hintTimer = useRef(null);

  // Slide-in animation for each new card
  const slideAnim = useRef(new Animated.Value(SW)).current;

  useEffect(() => {
    initSession();
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, []);

  const initSession = async () => {
    try {
      const session = await startSession(childId, {
        platform: Platform.OS,
        screenWidth: SW,
        screenHeight: SH,
        appVersion: '1.0.0',
      });
      setSessionId(session._id);
      await loadNextScenario([], 1);
    } catch (e) {
      console.log('Session init failed:', e.message);
      setLoading(false);
    }
  };

  const loadNextScenario = useCallback(async (excludeIds, currentDifficulty) => {
    setLoading(true);
    setSelectedKey(null);
    setHintShown(false);
    slideAnim.setValue(SW);

    try {
      const data = await getNextBehaviourScenario(childId, currentDifficulty, excludeIds);
      setScenario(data.scenario);
      setTrialStartTime(Date.now());

      // Hint timer — show hint after 6 seconds of no tap
      hintTimer.current = setTimeout(() => setHintShown(true), 6000);

      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 10,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      console.log('Load scenario failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  const handleChoice = async (image) => {
    if (selectedKey || !scenario || !sessionId) return;
    if (hintTimer.current) clearTimeout(hintTimer.current);

    const responseTimeMs = Date.now() - trialStartTime;
    setSelectedKey(image.assetKey);

    try {
      const result = await submitBehaviourTrial({
        childId,
        sessionId,
        scenarioId: scenario._id,
        selectedAssetKey: image.assetKey,
        responseTimeMs,
        hintShown,
        attemptNumber: 1,
      });

      const correct = result.trial.isCorrect;
      setLastCorrect(correct);
      if (correct) setScore(s => s + 1);
      setShowFeedback(true);
    } catch (e) {
      console.log('Submit trial failed:', e.message);
      // Compute locally as fallback
      const correct = image.isCorrect;
      setLastCorrect(correct);
      if (correct) setScore(s => s + 1);
      setShowFeedback(true);
    }
  };

  const handleFeedbackDone = () => {
    setShowFeedback(false);
    const nextTrialNumber = trialNumber + 1;

    if (nextTrialNumber >= TRIALS_PER_SESSION) {
      // Session complete → go to result screen
      navigation.replace('BehaviourResult', {
        sessionId,
        childName,
        score,
        total: TRIALS_PER_SESSION,
      });
      return;
    }

    setTrialNumber(nextTrialNumber);
    const newShownIds = [...shownIds, scenario._id];
    setShownIds(newShownIds);
    loadNextScenario(newShownIds, difficulty);
  };

  if (loading && !scenario) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={s.loadingTxt}>Getting ready… / සූදානම් වෙමින්…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <LinearGradient
        colors={[C.heroA, C.heroB]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Good Behaviour</Text>
          <Text style={s.headerSi}>හොඳ හැසිරීම</Text>
        </View>
        <View style={s.scorePill}>
          <Text style={s.scoreText}>⭐ {score}</Text>
        </View>
      </LinearGradient>

      {/* ── Progress ── */}
      <View style={s.progressWrap}>
        <View style={s.progressRow}>
          <Text style={s.progressTxt}>
            Trial {trialNumber + 1} of {TRIALS_PER_SESSION}
          </Text>
          <Text style={s.diffTxt}>Level {difficulty}</Text>
        </View>
        <ProgressBar current={trialNumber} total={TRIALS_PER_SESSION} />
      </View>

      {/* ── Prompt ── */}
      {scenario && (
        <View style={s.promptCard}>
          <Text style={s.promptEn}>{scenario.prompt?.en}</Text>
          {scenario.prompt?.si ? (
            <Text style={s.promptSi}>{scenario.prompt.si}</Text>
          ) : null}
        </View>
      )}

      {/* ── Image choices ── */}
      {scenario && (
        <Animated.View
          style={[s.choicesRow, { transform: [{ translateX: slideAnim }] }]}
        >
          {scenario.images.map((img) => (
            <ChoiceCard
              key={img.assetKey}
              image={img}
              onPress={() => handleChoice(img)}
              selected={selectedKey === img.assetKey}
              feedback={!!selectedKey}
              isCorrect={img.isCorrect}
              disabled={!!selectedKey}
            />
          ))}
        </Animated.View>
      )}

      {/* ── Hint ── */}
      {hintShown && !selectedKey && (
        <View style={s.hintBubble}>
          <Ionicons name="bulb-outline" size={16} color={C.amber} />
          <Text style={s.hintTxt}>Think carefully! / හොඳට හිතන්න!</Text>
        </View>
      )}

      {/* ── Feedback overlay ── */}
      <FeedbackOverlay
        visible={showFeedback}
        isCorrect={lastCorrect}
        onDone={handleFeedbackDone}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 16 },
  loadingTxt:  { fontSize: 14, color: C.inkFaint },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 18,
    paddingHorizontal: H_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow(12),
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSi:     { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  scorePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  scoreText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  progressWrap: { paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 4 },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  progressTxt:  { fontSize: 13, color: C.inkMid, fontWeight: '600' },
  diffTxt:      { fontSize: 12, color: C.inkFaint },

  promptCard: {
    marginHorizontal: H_PAD,
    marginTop: 14,
    backgroundColor: C.warmWhite,
    borderRadius: CARD_RADIUS,
    padding: 20,
    alignItems: 'center',
    ...shadow(8),
  },
  promptEn: { fontSize: 20, fontWeight: '800', color: C.ink, textAlign: 'center' },
  promptSi: { fontSize: 14, color: C.inkFaint, marginTop: 6, textAlign: 'center' },

  choicesRow: {
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: H_PAD,
    marginTop: 16,
    flex: 1,
    maxHeight: (SW - H_PAD * 2 - 14) / 2 + 4,
  },

  hintBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.amberLight,
    marginHorizontal: H_PAD,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  hintTxt: { fontSize: 13, color: C.inkMid, fontWeight: '600' },
});