import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * =========================================================
 * ASD Tracing App API Service
 * React Native + Expo
 * Handles:
 * - Live backend sync
 * - Offline queue
 * - Session start/end
 * - Trial submission
 * - Cognitive state fetch
 * =========================================================
 */

/**
 * IMPORTANT:
 * Replace with your laptop IP address
 * Example from ipconfig:
 * 10.214.246.1
 */
const BASE_URL = 'http://192.168.8.104:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Storage Keys
 */
const OFFLINE_QUEUE_KEY = 'offline_trial_queue';

/* =========================================================
   OFFLINE QUEUE HELPERS
========================================================= */

/**
 * Save failed trial locally
 */
async function addToOfflineQueue(trial) {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];

    queue.push({
      ...trial,
      offlineCreated: true,
      queuedAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(queue)
    );

    console.log('Trial saved offline');
  } catch (error) {
    console.log('Offline queue save failed:', error.message);
  }
}

/**
 * Sync offline trials when internet returns
 */
export async function syncOfflineQueue() {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);

    if (!existing) return;

    const queue = JSON.parse(existing);

    if (queue.length === 0) return;

    console.log('Syncing offline queue:', queue.length);

    const remaining = [];

    for (const trial of queue) {
      try {
        await api.post('/trials', trial);
        console.log('Synced one offline trial');
      } catch (error) {
        remaining.push(trial);
      }
    }

    await AsyncStorage.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(remaining)
    );

    console.log('Remaining offline trials:', remaining.length);
  } catch (error) {
    console.log('Offline sync failed:', error.message);
  }
}

/* =========================================================
   SESSION API
========================================================= */

/**
 * Start child session
 */
export async function startSession(childId, deviceInfo) {
  try {
    console.log('Starting session...');

    const res = await api.post('/sessions/start', {
      childId,
      deviceInfo,
    });

    console.log('Session started:', res.data);

    return res.data;
  } catch (error) {
    console.log('Session start failed:', error.message);

    // fallback offline session
    return {
      _id: `offline_${Date.now()}`,
      childId,
      offline: true,
    };
  }
}

/**
 * End session
 */
export async function endSession(sessionId, childId, summary) {
  try {
    console.log('Ending session...');

    const res = await api.patch(
      `/sessions/${sessionId}/end`,
      {
        childId,
        ...summary,
      }
    );

    console.log('Session ended:', res.data);

    return res.data;
  } catch (error) {
    console.log('End session failed:', error.message);
    return null;
  }
}

/* =========================================================
   TRIAL API
========================================================= */

/**
 * Submit tracing trial
 */
export async function submitTrial(trialData) {
  try {
    console.log('Sending trial:', trialData);

    const res = await api.post('/trials', trialData);

    console.log('Trial success:', res.data);

    return res.data;
  } catch (error) {
    console.log('Trial failed:', error.message);

    // Save offline
    await addToOfflineQueue(trialData);

    // Continue game locally
    return {
      success: true,
      offline: true,
      accuracyScore: 0.5,
      rewardTriggered: false,
      nextTrialParams: {
        shapeSize: 240,
        guidance: 'voice',
        timerEnabled: false,
      },
      currentDifficultyLevel: 1,
      adaptationTriggered: 'none',
    };
  }
}

/* =========================================================
   COGNITIVE STATE API
========================================================= */

/**
 * Get live cognitive state
 */
export async function getCognitiveState(childId) {
  try {
    const res = await api.get(`/cognitive/${childId}`);

    await AsyncStorage.setItem(
      `cog_state_${childId}`,
      JSON.stringify(res.data)
    );

    return res.data;
  } catch (error) {
    console.log('Using cached cognitive state');

    const cached = await AsyncStorage.getItem(
      `cog_state_${childId}`
    );

    return cached ? JSON.parse(cached) : null;
  }
}

export async function getDashboard(childId) {
  const res = await api.get(`/dashboard/${childId}`);
  return res.data;
}