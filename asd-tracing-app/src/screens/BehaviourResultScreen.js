import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getBehaviourSessionSummary } from '../services/apiService';

const { width: SW } = Dimensions.get('window');
const H_PAD = 20;
const CARD_RADIUS = 28;

// ─── Palette ──────────────────────────────────────────────
const C = {
  bg:         '#F7F3EE',
  sandLight:  '#E8DFD3',
  warmWhite:  '#FFFCF8',
  ink:        '#1C1610',
  inkMid:     '#4A3F35',
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
  heroA:      '#2BBFA4',
  heroB:      '#1A7FA8',
  heroC:      '#0F4F7A',
};

const shadow = (depth = 8) => Platform.select({
  web:     { boxShadow: `0 ${depth}px ${depth * 2.5}px rgba(0,0,0,0.07)` },
  default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: depth, shadowOffset: { width: 0, height: depth / 2 }, elevation: Math.round(depth / 2) },
});

// ─── Animated number ──────────────────────────────────────
function AnimCount({ target, suffix = '' }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    Animated.timing(anim, {
      toValue: target,
      duration: 1200,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value).toString()));
    return () => anim.removeListener(id);
  }, [target]);
  return <Text>{display}{suffix}</Text>;
}

// ─── Star rating ──────────────────────────────────────────
function Stars({ count }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 12 }}>
      {[1, 2, 3].map((i) => (
        <Animated.Text key={i} style={{ fontSize: 36 }}>
          {i <= count ? '⭐' : '☆'}
        </Animated.Text>
      ))}
    </View>
  );
}

// ─── Category row ─────────────────────────────────────────
function CategoryRow({ category, accuracy, total, correct }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: accuracy / 100,
      duration: 1000,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [accuracy]);

  const color = accuracy >= 80 ? C.teal : accuracy >= 60 ? C.amber : C.coral;
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <View style={cr.row}>
      <View style={cr.rowTop}>
        <Text style={cr.label}>{label}</Text>
        <Text style={[cr.pct, { color }]}>{accuracy}%</Text>
      </View>
      <View style={cr.track}>
        <Animated.View style={[cr.fill, {
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
      </View>
      <Text style={cr.sub}>{correct}/{total} correct</Text>
    </View>
  );
}

const cr = StyleSheet.create({
  row:    { marginBottom: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:  { fontSize: 13, fontWeight: '600', color: '#4A3F35' },
  pct:    { fontSize: 13, fontWeight: '700' },
  track:  { height: 8, backgroundColor: '#E8DFD3', borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  fill:   { height: 8, borderRadius: 8 },
  sub:    { fontSize: 11, color: '#A89E96' },
});

// ─── Main screen ──────────────────────────────────────────
export default function BehaviourResultScreen({ route, navigation }) {
  const { sessionId, childName, score, total } = route.params;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await getBehaviourSessionSummary(sessionId);
      setSummary(data);
    } catch (e) {
      console.log('Load summary failed:', e.message);
      // Fallback to route params
      setSummary({
        totalTrials: total,
        correctTrials: score,
        accuracy: Math.round((score / total) * 100),
        avgResponseTimeMs: 0,
        categoryBreakdown: [],
      });
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8,  useNativeDriver: true }),
      ]).start();
    }
  };

  const accuracy  = summary?.accuracy  ?? Math.round((score / total) * 100);
  const starCount = accuracy >= 85 ? 3 : accuracy >= 60 ? 2 : 1;

  const getMessage = () => {
    if (accuracy >= 85) return { en: 'Fantastic! 🌟',         si: 'අති විශිෂ්ටයි!' };
    if (accuracy >= 60) return { en: 'Good job! Keep going!', si: 'හොඳ වැඩ! ඉදිරියට!' };
    return               { en: 'Nice try! Practice more 💛',  si: 'හොඳ උත්සාහයක්!' };
  };
  const msg = getMessage();

  const gradColors = accuracy >= 85
    ? [C.heroA, C.heroB, C.heroC]
    : accuracy >= 60
      ? ['#F5A623', '#E8821A', '#C4600F']
      : ['#FF6B4A', '#E04A2A', '#C03010'];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero result card ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={gradColors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <View style={s.heroBubble1} />
            <View style={s.heroBubble2} />

            <Text style={s.childName}>{childName}</Text>
            <Stars count={starCount} />
            <Text style={s.msgEn}>{msg.en}</Text>
            <Text style={s.msgSi}>{msg.si}</Text>

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>
                  <AnimCount target={accuracy} suffix="%" />
                </Text>
                <Text style={s.heroStatLabel}>Accuracy</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>
                  <AnimCount target={summary?.correctTrials ?? score} />/{total}
                </Text>
                <Text style={s.heroStatLabel}>Correct</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>
                  {summary?.avgResponseTimeMs
                    ? `${(summary.avgResponseTimeMs / 1000).toFixed(1)}s`
                    : '--'}
                </Text>
                <Text style={s.heroStatLabel}>Avg Time</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Category breakdown ── */}
        {summary?.categoryBreakdown?.length > 0 && (
          <Animated.View style={[s.panel, { opacity: fadeAnim }]}>
            <View style={s.secHead}>
              <View style={[s.secAccent, { backgroundColor: C.teal }]} />
              <View>
                <Text style={s.secTitle}>Category Breakdown</Text>
                <Text style={s.secSub}>කාණ්ඩ අනුව ප්‍රතිඵල</Text>
              </View>
            </View>
            {summary.categoryBreakdown.map((cat) => (
              <CategoryRow
                key={cat.category}
                category={cat.category}
                accuracy={cat.accuracy}
                total={cat.total}
                correct={cat.correct}
              />
            ))}
          </Animated.View>
        )}

        {/* ── Encouragement ── */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={[C.amber, C.coral]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.encCard}
          >
            <View style={s.encBubble} />
            <Text style={s.encTitle}>Keep practising! 💪</Text>
            <Text style={s.encBody}>
              Every game builds your child's social understanding.{'\n'}
              දිනෙන් දින දරුවා වර්ධනය වෙයි.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Actions ── */}
        <Animated.View style={[s.actions, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={s.btnPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.replace('BehaviourGame')}
          >
            <LinearGradient
              colors={[C.heroA, C.heroB]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.btnGrad}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={s.btnPrimaryTxt}>Play Again</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnSecondary}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ParentDashboard')}
          >
            <Ionicons name="home-outline" size={20} color={C.teal} />
            <Text style={s.btnSecondaryTxt}>Back to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 16 },

  heroCard: {
    marginHorizontal: H_PAD,
    marginTop: Platform.OS === 'ios' ? 56 : 44,
    borderRadius: CARD_RADIUS,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow(20),
  },
  heroBubble1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -30 },
  heroBubble2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -20, left: 40 },

  childName:    { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  msgEn:        { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  msgSi:        { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 },

  heroStats:       { flexDirection: 'row', marginTop: 22, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 14, gap: 4 },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatVal:     { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroStatLabel:   { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 3 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 4 },

  panel: {
    backgroundColor: C.warmWhite,
    marginHorizontal: H_PAD,
    marginTop: 14,
    borderRadius: CARD_RADIUS,
    padding: 20,
    ...shadow(8),
  },
  secHead:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  secAccent: { width: 4, height: 22, borderRadius: 2 },
  secTitle:  { fontSize: 16, fontWeight: '800', color: C.ink },
  secSub:    { fontSize: 11, color: C.inkFaint, marginTop: 1 },

  encCard: {
    marginHorizontal: H_PAD,
    marginTop: 14,
    borderRadius: CARD_RADIUS,
    padding: 22,
    overflow: 'hidden',
    ...shadow(12),
  },
  encBubble: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)', top: -40, right: -30 },
  encTitle:  { color: '#fff', fontSize: 18, fontWeight: '800' },
  encBody:   { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 8, lineHeight: 20 },

  actions:      { marginHorizontal: H_PAD, marginTop: 16, gap: 12 },
  btnPrimary:   { borderRadius: 20, overflow: 'hidden', ...shadow(10) },
  btnGrad:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  btnPrimaryTxt:{ color: '#fff', fontSize: 17, fontWeight: '800' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 20,
    backgroundColor: C.tealLight,
    ...shadow(4),
  },
  btnSecondaryTxt: { color: C.teal, fontSize: 16, fontWeight: '700' },
});