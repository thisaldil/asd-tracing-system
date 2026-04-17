import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import { getDashboard } from '../services/apiService';

const screenWidth = Dimensions.get('window').width;

export default function ParentDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const childId = '69e0e39c84040d2901db4b04';

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboard(childId);
      setData(res);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const chartData =
    data?.recentAccuracy?.length > 0
      ? data.recentAccuracy
      : [0.65, 0.72, 0.8, 0.76, 0.88];

  const totalSessions = data?.totalSessions || 0;
  const totalTrials = data?.totalTrials || 0;
  const avgAccuracy = Number(data?.avgAccuracy || 0);

  const attention = data?.cognitive?.attentionScore || 0;
  const motor = data?.cognitive?.motorScore || 0;
  const vmi = data?.cognitive?.vmiScore || 0;

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#5B6CFF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO HEADER */}
        <LinearGradient
          colors={['#5B6CFF', '#7C5CFF', '#59C8C8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>P</Text>
            </View>
          </View>

          <Text style={styles.heroGreeting}>
            Welcome Amma / Thaththa
          </Text>

          <Text style={styles.heroChild}>
            Child: Kavindu
          </Text>

          <Text style={styles.heroSub}>
            Supporting focus, tracing, and daily growth.
          </Text>

          <Text style={styles.heroSubSinhala}>
            අද දරුවාගේ ප්‍රගතිය බලන්න
          </Text>
        </LinearGradient>

        {/* CTA BUTTON */}
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('TracingGame')}
        >
          <LinearGradient
            colors={['#FFD95A', '#FFB347']}
            style={styles.ctaGradient}
          >
            <Ionicons
              name="play-circle"
              size={24}
              color="#333"
            />
            <Text style={styles.ctaText}>
              Start Trial / ට්‍රයල් ආරම්භ කරන්න
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* STATS */}
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF1FF' }]}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color="#5B6CFF"
            />
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#EAFBF7' }]}>
            <Ionicons
              name="shapes-outline"
              size={24}
              color="#12B886"
            />
            <Text style={styles.statValue}>{totalTrials}</Text>
            <Text style={styles.statLabel}>Trials</Text>
          </View>

          <View style={[styles.statCardWide, { backgroundColor: '#FFF6D8' }]}>
            <MaterialCommunityIcons
              name="target"
              size={24}
              color="#E6A100"
            />
            <Text style={styles.statValue}>
              {(avgAccuracy * 100).toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Avg Accuracy</Text>
          </View>
        </View>

        {/* CHART */}
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>
            Progress / ප්‍රගතිය
          </Text>

          <Text style={styles.sectionSub}>
            Accuracy trend from recent trials
          </Text>

          <LineChart
            data={{
              labels: chartData.map((_, i) => `${i + 1}`),
              datasets: [{ data: chartData }],
            }}
            width={screenWidth - 48}
            height={220}
            withDots
            withInnerLines={false}
            withOuterLines={false}
            yAxisInterval={1}
            chartConfig={{
              decimalPlaces: 2,
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: opacity =>
                `rgba(91,108,255,${opacity})`,
              labelColor: opacity =>
                `rgba(120,120,120,${opacity})`,
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#7C5CFF',
              },
            }}
            bezier
            style={styles.chartStyle}
          />
        </View>

        {/* COGNITIVE */}
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>
            Skills Snapshot
          </Text>

          <SkillBar
            label="Attention / අවධානය"
            value={attention}
            color="#5B6CFF"
          />

          <SkillBar
            label="Motor Skills / චලන කුසලතා"
            value={motor}
            color="#12B886"
          />

          <SkillBar
            label="VMI / Visual Motor"
            value={vmi}
            color="#7C5CFF"
          />
        </View>

        {/* LATEST SESSION */}
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>
            Latest Session / අවසන් සැසිය
          </Text>

          <View style={styles.sessionRow}>
            <InfoPill
              label="Trials"
              value={data?.latestSession?.totalTrials || 0}
            />

            <InfoPill
              label="Score"
              value={`${(
                (data?.latestSession?.avgAccuracyScore || 0) *
                100
              ).toFixed(0)}%`}
            />
          </View>
        </View>

        {/* ENCOURAGEMENT */}
        <LinearGradient
          colors={['#F4ECFF', '#E8FFF8']}
          style={styles.encourageCard}
        >
          <Text style={styles.encourageTitle}>
            Great progress today 🌟
          </Text>

          <Text style={styles.encourageSub}>
            හොඳ ප්‍රගතියක් අද ලබාගෙන ඇත
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

function SkillBar({ label, value, color }) {
  const percent = Math.max(0, Math.min(value, 1));

  return (
    <View style={styles.skillWrap}>
      <View style={styles.skillTop}>
        <Text style={styles.skillLabel}>{label}</Text>
        <Text style={styles.skillPercent}>
          {(percent * 100).toFixed(0)}%
        </Text>
      </View>

      <View style={styles.skillTrack}>
        <View
          style={[
            styles.skillFill,
            {
              width: `${percent * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F8FF',
  },

  scrollContent: {
    paddingBottom: 30,
  },

  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8FF',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },

  heroCard: {
    margin: 16,
    padding: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5B6CFF',
  },

  heroGreeting: {
    marginTop: 20,
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },

  heroChild: {
    marginTop: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  heroSub: {
    marginTop: 10,
    color: '#EEF2FF',
    fontSize: 14,
    lineHeight: 22,
  },

  heroSubSinhala: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.9,
  },

  ctaButton: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
  },

  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  ctaText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#202020',
    marginBottom: 8,
  },

  sectionSub: {
    fontSize: 13,
    color: '#777',
    marginBottom: 10,
  },

  statsGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  statCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },

  statCardWide: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },

  statValue: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1E1E',
  },

  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },

  panel: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },

  chartStyle: {
    marginTop: 6,
    borderRadius: 16,
  },

  skillWrap: {
    marginTop: 14,
  },

  skillTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skillLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  skillPercent: {
    fontSize: 13,
    color: '#666',
  },

  skillTrack: {
    marginTop: 8,
    height: 10,
    backgroundColor: '#EDF0F7',
    borderRadius: 10,
    overflow: 'hidden',
  },

  skillFill: {
    height: 10,
    borderRadius: 10,
  },

  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  infoPill: {
    width: '48%',
    backgroundColor: '#F6F8FF',
    padding: 16,
    borderRadius: 16,
  },

  infoLabel: {
    fontSize: 13,
    color: '#777',
  },

  infoValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#202020',
  },

  encourageCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    padding: 18,
  },

  encourageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },

  encourageSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#555',
  },
});