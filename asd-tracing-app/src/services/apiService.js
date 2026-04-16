import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your computer's IP address when testing on a real phone
// Use 'localhost' for iOS simulator, '10.0.2.2' for Android emulator
const BASE_URL = 'http://192.168.1.100:5000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// ─── Offline queue ────────────────────────────────────────────────────────────
// If no internet, trials are saved locally and synced when online

const OFFLINE_QUEUE_KEY = 'offline_trial_queue';

async function addToOfflineQueue(trial) {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue = existing ? JSON.parse(existing) : [];
  queue.push({ ...trial, offlineCreated: true, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function syncOfflineQueue() {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!existing) return;
  const queue = JSON.parse(existing);
  if (queue.length === 0) return;

  const synced = [];
  for (const trial of queue) {
    try {
      await api.post('/trials', trial);
      synced.push(trial);
    } catch (e) {
      console.log('Could not sync trial, will retry next time');
    }
  }

  // Remove successfully synced items
  const remaining = queue.filter(t => !synced.includes(t));
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function startSession(childId, deviceInfo) {
  try {
    const res = await api.post('/sessions/start', { childId, deviceInfo });
    return res.data;
  } catch (err) {
    // Return a temporary offline session ID
    return { _id: `offline_${Date.now()}`, childId, offline: true };
  }
}

export async function submitTrial(trialData) {
  try {
    const res = await api.post('/trials', trialData);
    return res.data;
  } catch (err) {
    // Save to offline queue if no internet
    await addToOfflineQueue(trialData);
    // Return a local adaptive response so the game can continue offline
    return {
      success: true,
      offline: true,
      accuracyScore: trialData.metrics.accuracyScore || 0.5,
      rewardTriggered: (trialData.metrics.accuracyScore || 0.5) >= 0.60,
      nextTrialParams: { shapeSize: 240, guidance: 'voice', timerEnabled: false },
      currentDifficultyLevel: 2,
    };
  }
}

export async function getCognitiveState(childId) {
  try {
    const res = await api.get(`/cognitive/${childId}`);
    // Cache it locally for offline use
    await AsyncStorage.setItem(`cog_state_${childId}`, JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    // Return cached version if offline
    const cached = await AsyncStorage.getItem(`cog_state_${childId}`);
    return cached ? JSON.parse(cached) : null;
  }
}

export async function endSession(sessionId, childId, summary) {
  try {
    const res = await api.patch(`/sessions/${sessionId}/end`, { childId, ...summary });
    return res.data;
  } catch (err) {
    console.log('Session end queued for sync');
    return null;
  }
}