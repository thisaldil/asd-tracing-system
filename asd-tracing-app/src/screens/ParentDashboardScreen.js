import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getDashboard } from '../services/apiService';
import { useChild } from '../context/ChildContext';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_RADIUS = 28;
const H_PAD = 20;

// ─── Palette ──────────────────────────────────────────────
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
  coralDark:  '#C94830',

  amber:      '#F5A623',
  amberLight: '#FFF0D0',
  amberDark:  '#B87A10',

  plum:       '#7B5EA7',
  plumLight:  '#EDE5F7',
  plumDark:   '#543E75',

  sky:        '#4A9FD4',
  skyLight:   '#DDF0FA',
  skyDark:    '#2E6E9E',

  heroA:      '#2BBFA4',
  heroB:      '#1A7FA8',
  heroC:      '#0F4F7A',
};

// ─── Animated Fade-in ─────────────────────────────────────
function FadeSlide({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Animated counter ─────────────────────────────────────
function AnimatedNumber({ target, suffix = '', style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 1200, easing: Easing.out(Easing.exp), useNativeDriver: false }).start();
    anim.addListener(({ value }) => setDisplay(Number(value.toFixed(1)).toString()));
    return () => anim.removeAllListeners();
  }, [target]);
  return <Text style={style}>{display}{suffix}</Text>;
}

// ─── Radial ring (SVG-free, pure RN) ──────────────────────
function RadialRing({ value = 0, size = 80, color = C.teal, label, sub }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1400, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  const pct = Math.min(Math.max(value, 0), 1);
  const strokeW = 7;
  const r = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * pct;
  // Simulate with a View arc overlay approach
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* Track */}
        <View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2,
          borderWidth: strokeW, borderColor: color + '22',
        }} />
        {/* Fill arc — approximated with rotation mask */}
        <View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2,
          borderWidth: strokeW,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: pct > 0.25 ? color : 'transparent',
          borderBottomColor: pct > 0.5 ? color : 'transparent',
          borderLeftColor: pct > 0.75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{Math.round(pct * 100)}</Text>
        <Text style={{ fontSize: 9, color: C.inkFaint, marginTop: -1 }}>%</Text>
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.inkMid, textAlign: 'center' }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: C.inkFaint, textAlign: 'center' }}>{sub}</Text> : null}
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────
function StatCard({ icon, iconLib = 'ion', value, label, color, bg, delay = 0 }) {
  const scale = useRef(new Animated.Value(0.88)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, delay, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, []);
  const IconComp = iconLib === 'ion' ? Ionicons : MaterialCommunityIcons;
  return (
    <Animated.View style={[s.statCard, { backgroundColor: bg, transform: [{ scale }] }]}>
      <View style={[s.statIconWrap, { backgroundColor: color + '22' }]}>
        <IconComp name={icon} size={20} color={color} />
      </View>
      <Text style={[s.statValue, { color: C.ink }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Section header ───────────────────────────────────────
function SectionHead({ title, sub, accent = C.teal }) {
  return (
    <View style={s.secHead}>
      <View style={[s.secAccent, { backgroundColor: accent }]} />
      <View>
        <Text style={s.secTitle}>{title}</Text>
        {sub ? <Text style={s.secSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Skeleton block ───────────────────────────────────────
function Skeleton({ w = '100%', h = 18, r = 10, style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.sandLight, opacity: pulse }, style]} />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 60 }}>
      <View style={{ marginHorizontal: H_PAD, borderRadius: CARD_RADIUS, padding: 24, backgroundColor: C.sandLight, marginBottom: 16 }}>
        <Skeleton w={120} h={14} r={8} style={{ marginBottom: 14 }} />
        <Skeleton w={200} h={28} r={10} style={{ marginBottom: 10 }} />
        <Skeleton w={160} h={14} r={8} style={{ marginBottom: 6 }} />
        <Skeleton w={140} h={12} r={8} />
      </View>
      <View style={{ marginHorizontal: H_PAD, flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {[1,2,3].map(i => <Skeleton key={i} w={(SW - H_PAD*2 - 24) / 3} h={110} r={20} />)}
      </View>
      <View style={{ marginHorizontal: H_PAD, borderRadius: CARD_RADIUS, padding: 24, backgroundColor: C.warmWhite }}>
        <Skeleton w={140} h={14} r={8} style={{ marginBottom: 16 }} />
        <Skeleton w='100%' h={180} r={16} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────
export default function ParentDashboardScreen({ navigation }) {
  const { activeChild } = useChild();
  const { logout } = useChild();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const childId = activeChild?._id || '69e0e39c84040d2901db4b04';
  const childName = activeChild?.alias || 'Kavindu';
  const parentInitial = 'A';

  useEffect(() => { loadDashboard(); }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (e) {
      console.log('Logout failed', e);
    } finally {
      setLoggingOut(false);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboard(childId);
      setData(res);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData    = data?.recentAccuracy?.length > 0 ? data.recentAccuracy.map(v => Math.max(0.01, v)) : [0.65, 0.72, 0.8, 0.76, 0.88, 0.91, 0.87];
  const totalSessions = data?.totalSessions   || 0;
  const totalTrials   = data?.totalTrials     || 0;
  const avgAccuracy   = Number(data?.avgAccuracy || 0);
  const attention     = data?.cognitive?.attentionScore || 0;
  const motor         = data?.cognitive?.motorScore     || 0;
  const vmi           = data?.cognitive?.vmiScore       || 0;
  const lastTrials    = data?.latestSession?.totalTrials || 0;
  const lastScore     = (data?.latestSession?.avgAccuracyScore || 0) * 100;

  const getEncouragement = () => {
    if (avgAccuracy >= 0.85) return { en: 'Outstanding progress! 🌟', si: 'අති විශිෂ්ට ප්‍රගතිය!', colors: [C.teal, C.tealDark] };
    if (avgAccuracy >= 0.65) return { en: 'Great work, keep going! ✨', si: 'හොඳ වැඩ, ඉදිරියට යන්න!', colors: [C.amber, C.amberDark] };
    return { en: 'Every step counts 💛', si: 'සෑම පියවරක්ම වැදගත්', colors: [C.coral, C.coralDark] };
  };
  const enc = getEncouragement();

  const getHour = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── HERO ── */}
        <FadeSlide delay={0}>
          <LinearGradient
            colors={[C.heroA, C.heroB, C.heroC]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            {/* Decorative circles */}
            <View style={s.heroBubble1} />
            <View style={s.heroBubble2} />

            <View style={s.heroTop}>
              <View>
                <Text style={s.heroGreetSm}>{getHour()},</Text>
                <Text style={s.heroGreet}>Amma / Thaththa</Text>
              </View>
              <View style={s.heroTopRight}>
                <TouchableOpacity style={s.heroIconBtn}>
                  <Ionicons name="notifications-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={s.heroIconBtn} onPress={handleLogout}>
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="log-out-outline" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
                <View style={s.heroAvatar}>
                  <Text style={s.heroAvatarTxt}>{parentInitial}</Text>
                </View>
              </View>
            </View>

            <View style={s.heroChild}>
              <View style={s.heroChildAvatar}>
                <Text style={s.heroChildAvatarTxt}>{childName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroChildName}>{childName}</Text>
                <Text style={s.heroChildSub}>
                  {avgAccuracy >= 0.75 ? '🌱 Thriving beautifully' : '📈 Making progress'}
                </Text>
              </View>
              <View style={s.heroRingWrap}>
                <RadialRing value={avgAccuracy} size={72} color="#FFFFFF" label="" sub="" />
                <Text style={s.heroRingLabel}>accuracy</Text>
              </View>
            </View>

            <Text style={s.heroSinhala}>
              අද දරුවාගේ ප්‍රගතිය බලන්න · {new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })}
            </Text>
          </LinearGradient>
        </FadeSlide>

        {/* ── CTA ── */}
        <FadeSlide delay={80}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('TracingGame')}
            style={s.ctaWrap}
          >
            <LinearGradient
              colors={[C.amber, C.coral]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.cta}
            >
              <View style={s.ctaLeft}>
                <View style={s.ctaIconWrap}>
                  <Ionicons name="play" size={18} color={C.amber} />
                </View>
                <View>
                  <Text style={s.ctaTitle}>Start New Trial</Text>
                  <Text style={s.ctaSi}>ට්‍රයල් ආරම්භ කරන්න</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward-circle" size={30} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>
        </FadeSlide>

        {/* ── STATS ── */}
        <FadeSlide delay={140} style={s.statRow}>
          <StatCard icon="calendar-outline"  value={totalSessions.toString()} label={`Sessions\nසැසි`}      color={C.sky}   bg={C.skyLight}   delay={160} />
          <StatCard icon="shapes-outline"    value={totalTrials.toString()}   label={`Trials\nට්‍රයල්`}  color={C.teal}  bg={C.tealLight}  delay={220} />
          <StatCard iconLib="mci" icon="target" value={`${(avgAccuracy*100).toFixed(0)}%`} label={`Accuracy\nනිරවද්‍යතාව`} color={C.coral}  bg={C.coralLight} delay={280} />
        </FadeSlide>

        {/* ── CHART ── */}
        <FadeSlide delay={200}>
          <View style={s.panel}>
            <SectionHead title="Progress Trend" sub="Accuracy across recent trials" accent={C.sky} />
            <LineChart
              data={{
                labels: chartData.map((_, i) => `${i + 1}`),
                datasets: [{ data: chartData, strokeWidth: 3 }],
              }}
              width={SW - H_PAD * 2 - 32}
              height={180}
              withDots
              withInnerLines={false}
              withOuterLines={false}
              withShadow={false}
              yAxisInterval={1}
              chartConfig={{
                decimalPlaces: 0,
                backgroundGradientFrom: C.warmWhite,
                backgroundGradientTo:   C.warmWhite,
                color:        (o) => `rgba(43,191,164,${o})`,
                labelColor:   (o) => `rgba(122,110,101,${o})`,
                propsForDots: { r: '5', strokeWidth: '2.5', stroke: C.tealDark },
              }}
              formatYLabel={v => `${Math.round(v * 100)}%`}
              bezier
              style={{ borderRadius: 16, marginTop: 12 }}
            />
          </View>
        </FadeSlide>

        {/* ── SKILLS ── */}
        <FadeSlide delay={260}>
          <View style={s.panel}>
            <SectionHead title="Skills Snapshot" sub="කුසලතා සාරාංශය" accent={C.plum} />
            <View style={s.skillsGrid}>
              <RadialRing value={attention} size={88} color={C.teal}  label="Attention"    sub="අවධානය" />
              <RadialRing value={motor}     size={88} color={C.plum}  label="Motor Skills" sub="චලන කුසලතා" />
              <RadialRing value={vmi}       size={88} color={C.coral} label="VMI"          sub="දෘශ්‍ය-චලන" />
            </View>

            {/* Linear backup bars */}
            {[
              { label: 'Attention',    si: 'අවධානය',        value: attention, color: C.teal  },
              { label: 'Motor Skills', si: 'චලන කුසලතා',  value: motor,     color: C.plum  },
              { label: 'VMI',          si: 'දෘශ්‍ය-චලන', value: vmi,       color: C.coral },
            ].map((sk) => (
              <SkillRow key={sk.label} {...sk} />
            ))}
          </View>
        </FadeSlide>

        {/* ── LATEST SESSION ── */}
        <FadeSlide delay={320}>
          <View style={s.panel}>
            <SectionHead title="Latest Session" sub="අවසන් සැසිය" accent={C.amber} />
            <View style={s.sessionGrid}>
              <SessionMetric icon="list-outline"   color={C.sky}   label="Trials"    value={lastTrials.toString()} />
              <SessionMetric icon="checkmark-done" color={C.teal}  label="Score"     value={`${lastScore.toFixed(0)}%`} />
              <SessionMetric icon="trophy-outline" color={C.amber} label="Level"     value={`L${data?.latestSession?.difficultyLevel || 1}`} />
              <SessionMetric icon="time-outline"   color={C.plum}  label="Duration"  value={data?.latestSession?.durationMin ? `${data.latestSession.durationMin}m` : '--'} />
            </View>
          </View>
        </FadeSlide>

        {/* ── ENCOURAGEMENT ── */}
        <FadeSlide delay={380}>
          <LinearGradient colors={enc.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.encCard}>
            <View style={s.encBubble} />
            <View style={s.encContent}>
              <Text style={s.encTitle}>{enc.en}</Text>
              <Text style={s.encSi}>{enc.si}</Text>
              <Text style={s.encBody}>
                Every tracing session builds fine motor skills and focus.{'\n'}දිනෙන් දින දරුවා වර්ධනය වෙයි.
              </Text>
            </View>
            <View style={s.encBadge}>
              <Ionicons name="heart" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </FadeSlide>

        {/* ── FOOTER NAV HINT ── */}
        <FadeSlide delay={420}>
          <View style={s.footerNav}>
            <NavPill icon="grid-outline"    label="Dashboard" active />
            <NavPill icon="bar-chart-outline" label="Reports" />
            <NavPill icon="person-outline"  label="Profile" />
            <NavPill icon="settings-outline" label="Settings" />
          </View>
        </FadeSlide>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────
function SkillRow({ label, si, value, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1200, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  const pct = Math.min(Math.max(value, 0), 1);
  return (
    <View style={s.skillRow}>
      <View style={s.skillRowTop}>
        <Text style={s.skillLabelTxt}>{label} <Text style={s.skillSi}>· {si}</Text></Text>
        <Text style={[s.skillPct, { color }]}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={s.skillTrack}>
        <Animated.View style={[s.skillFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) }]} />
      </View>
    </View>
  );
}

function SessionMetric({ icon, color, label, value }) {
  return (
    <View style={[s.sessMet, { borderColor: color + '30' }]}>
      <View style={[s.sessIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.sessVal}>{value}</Text>
      <Text style={s.sessLabel}>{label}</Text>
    </View>
  );
}

function NavPill({ icon, label, active = false }) {
  return (
    <TouchableOpacity style={[s.navPill, active && s.navPillActive]}>
      <Ionicons name={icon} size={20} color={active ? C.teal : C.inkFaint} />
      <Text style={[s.navLabel, active && { color: C.teal }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────
const shadow = (depth = 8) => Platform.select({
  web:     { boxShadow: `0 ${depth}px ${depth * 2.5}px rgba(0,0,0,0.07)` },
  default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: depth, shadowOffset: { width: 0, height: depth / 2 }, elevation: Math.round(depth / 2) },
});

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { paddingBottom: 16 },

  // Hero
  hero: {
    marginHorizontal: H_PAD, marginTop: Platform.OS === 'ios' ? 56 : 44,
    borderRadius: CARD_RADIUS, padding: 22, overflow: 'hidden',
    ...shadow(16),
  },
  heroBubble1: { position:'absolute', width:160, height:160, borderRadius:80, backgroundColor:'rgba(255,255,255,0.06)', top:-40, right:-30 },
  heroBubble2: { position:'absolute', width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.05)', bottom:-20, left:40 },
  heroTop:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  heroGreetSm:{ color:'rgba(255,255,255,0.75)', fontSize:13, fontWeight:'500' },
  heroGreet:  { color:'#fff', fontSize:22, fontWeight:'800', marginTop:2 },
  heroTopRight:{ flexDirection:'row', alignItems:'center', gap:10 },
  heroIconBtn: { width:38, height:38, borderRadius:19, backgroundColor:'rgba(255,255,255,0.18)', justifyContent:'center', alignItems:'center' },
  heroAvatar:  { width:38, height:38, borderRadius:19, backgroundColor:'rgba(255,255,255,0.95)', justifyContent:'center', alignItems:'center' },
  heroAvatarTxt:{ fontSize:16, fontWeight:'800', color: C.heroB },

  heroChild:      { flexDirection:'row', alignItems:'center', gap:12, marginTop:22, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:18, padding:14 },
  heroChildAvatar:{ width:44, height:44, borderRadius:22, backgroundColor:'rgba(255,255,255,0.25)', justifyContent:'center', alignItems:'center' },
  heroChildAvatarTxt:{ fontSize:20, fontWeight:'800', color:'#fff' },
  heroChildName:  { color:'#fff', fontSize:17, fontWeight:'700' },
  heroChildSub:   { color:'rgba(255,255,255,0.8)', fontSize:12, marginTop:2 },
  heroRingWrap:   { alignItems:'center' },
  heroRingLabel:  { color:'rgba(255,255,255,0.7)', fontSize:10, marginTop:2 },

  heroSinhala: { color:'rgba(255,255,255,0.65)', fontSize:12, marginTop:14, fontStyle:'italic' },

  // CTA
  ctaWrap: { marginHorizontal: H_PAD, marginTop: 14, borderRadius: 20, overflow:'hidden', ...shadow(10) },
  cta: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:18, paddingHorizontal:20 },
  ctaLeft: { flexDirection:'row', alignItems:'center', gap:14 },
  ctaIconWrap: { width:38, height:38, borderRadius:12, backgroundColor:'rgba(255,255,255,0.9)', justifyContent:'center', alignItems:'center' },
  ctaTitle: { color:'#fff', fontSize:17, fontWeight:'800' },
  ctaSi:    { color:'rgba(255,255,255,0.8)', fontSize:11, marginTop:1 },

  // Stats
  statRow:  { flexDirection:'row', gap:10, marginHorizontal: H_PAD, marginTop:14 },
  statCard: { flex:1, borderRadius:20, padding:14, alignItems:'flex-start', ...shadow(6) },
  statIconWrap: { width:38, height:38, borderRadius:12, justifyContent:'center', alignItems:'center', marginBottom:10 },
  statValue:    { fontSize:22, fontWeight:'800', color: C.ink },
  statLabel:    { fontSize:10, color: C.inkFaint, marginTop:2, lineHeight:14 },

  // Panel
  panel: {
    backgroundColor: C.warmWhite, marginHorizontal: H_PAD, marginTop:14,
    borderRadius: CARD_RADIUS, padding:20, ...shadow(8),
  },

  // Section header
  secHead:   { flexDirection:'row', alignItems:'center', gap:10, marginBottom:4 },
  secAccent: { width:4, height:22, borderRadius:2 },
  secTitle:  { fontSize:16, fontWeight:'800', color: C.ink },
  secSub:    { fontSize:11, color: C.inkFaint, marginTop:1 },

  // Skills
  skillsGrid: { flexDirection:'row', justifyContent:'space-around', paddingVertical:20 },
  skillRow:   { marginTop:14 },
  skillRowTop:{ flexDirection:'row', justifyContent:'space-between', marginBottom:7 },
  skillLabelTxt:{ fontSize:13, fontWeight:'600', color: C.inkMid },
  skillSi:    { fontSize:11, color: C.inkFaint, fontWeight:'400' },
  skillPct:   { fontSize:13, fontWeight:'700' },
  skillTrack: { height:8, backgroundColor: C.sandLight, borderRadius:8, overflow:'hidden' },
  skillFill:  { height:8, borderRadius:8 },

  // Session
  sessionGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, marginTop:14 },
  sessMet:  { width:(SW - H_PAD*2 - 40 - 10) / 2, backgroundColor: C.bg, borderRadius:16, padding:14, borderWidth:1 },
  sessIcon: { width:36, height:36, borderRadius:10, justifyContent:'center', alignItems:'center', marginBottom:8 },
  sessVal:  { fontSize:22, fontWeight:'800', color: C.ink },
  sessLabel:{ fontSize:11, color: C.inkFaint, marginTop:2 },

  // Encouragement
  encCard: { marginHorizontal: H_PAD, marginTop:14, borderRadius: CARD_RADIUS, padding:22, overflow:'hidden', ...shadow(12) },
  encBubble:{ position:'absolute', width:140, height:140, borderRadius:70, backgroundColor:'rgba(255,255,255,0.1)', top:-40, right:-30 },
  encContent:{ zIndex:1 },
  encTitle: { color:'#fff', fontSize:20, fontWeight:'800' },
  encSi:    { color:'rgba(255,255,255,0.85)', fontSize:13, marginTop:4 },
  encBody:  { color:'rgba(255,255,255,0.75)', fontSize:12, marginTop:10, lineHeight:18 },
  encBadge: { position:'absolute', top:18, right:20, width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center' },

  // Footer nav
  footerNav: {
    flexDirection:'row', marginHorizontal: H_PAD, marginTop:16,
    backgroundColor: C.warmWhite, borderRadius:24, padding:8,
    justifyContent:'space-around', ...shadow(10),
  },
  navPill:       { alignItems:'center', paddingVertical:8, paddingHorizontal:12, borderRadius:16, gap:3 },
  navPillActive: { backgroundColor: C.tealLight },
  navLabel:      { fontSize:10, color: C.inkFaint, fontWeight:'500' },
});