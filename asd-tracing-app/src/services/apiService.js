import axios from 'axios';
import { storage } from '../utils/storage';

/**
 * =========================================================
 * ASD Tracing App API Service
 * React Native + Expo
 * Handles:
 * - Authentication (register, login)
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
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Interceptor: Add JWT token to every request
 */
api.interceptors.request.use(
  async (config) => {
    const token = await storage.get(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Interceptor: Handle 401 responses (invalid/expired token)
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and force re-login
      await storage.remove(AUTH_TOKEN_KEY);
      await storage.remove('active_child');
      // Note: Navigation to LoginScreen should be handled by the app's auth state
    }
    return Promise.reject(error);
  }
);

/* =========================================================
   AUTHENTICATION API
========================================================= */

/**
 * Register a new parent account
 */
export async function registerParent(fullName, email, password, confirmPassword) {
  try {
    console.log('Registering parent...');
    const res = await api.post('/auth/register', {
      fullName,
      email,
      password,
      confirmPassword
    });

    console.log('Registration successful:', res.data);

    // Save token
    if (res.data.token) {
      await storage.set(AUTH_TOKEN_KEY, res.data.token);
    }

    return res.data;
  } catch (error) {
    console.log('Registration failed:', error.message);
    throw error;
  }
}

/**
 * Login parent account
 */
export async function loginParent(email, password) {
  try {
    console.log('Logging in parent...');
    const res = await api.post('/auth/login', {
      email,
      password
    });

    console.log('Login successful:', res.data);

    // Save token
    if (res.data.token) {
      await storage.set(AUTH_TOKEN_KEY, res.data.token);
    }

    return res.data;
  } catch (error) {
    console.log('Login failed:', error.message);
    throw error;
  }
}

/**
 * Verify JWT token
 */
export async function verifyToken() {
  try {
    const token = await storage.get(AUTH_TOKEN_KEY);
    if (!token) return null;

    const res = await api.post('/auth/verify');
    return res.data;
  } catch (error) {
    console.log('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Logout parent
 */
export async function logoutParent() {
  try {
    await storage.remove(AUTH_TOKEN_KEY);
    await storage.remove('active_child');
    console.log('Logged out');
  } catch (error) {
    console.log('Logout error:', error.message);
  }
}

/* =========================================================
   OFFLINE QUEUE HELPERS
========================================================= */

/**
 * Save failed trial locally
 */
async function addToOfflineQueue(trial) {
  try {
    const existing = await storage.get(OFFLINE_QUEUE_KEY);
    const queue = existing ? existing : [];

    queue.push({
      ...trial,
      offlineCreated: true,
      queuedAt: new Date().toISOString(),
    });

    await storage.set(
      OFFLINE_QUEUE_KEY,
      queue
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
    const existing = await storage.get(OFFLINE_QUEUE_KEY);

    if (!existing) return;

    const queue = existing;

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

    await storage.set(
      OFFLINE_QUEUE_KEY,
      remaining
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

    // Continue game locally — FIX 7: echo back current difficulty from trial data
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
      currentDifficultyLevel: trialData.difficultyLevel,
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

    await storage.set(
      `cog_state_${childId}`,
      res.data
    );

    return res.data;
  } catch (error) {
    console.log('Using cached cognitive state');

    const cached = await storage.get(
      `cog_state_${childId}`
    );

    return cached ? cached : null;
  }
}

export async function getDashboard(childId) {
  const res = await api.get(`/dashboard/${childId}`);
  return res.data;
}

/* =========================================================
   CHILD API
========================================================= */

/**
 * Create a new child profile
 */
export async function createChild(childData) {
  try {
    console.log('Creating child profile...');
    const res = await api.post('/children', childData);
    console.log('Child created:', res.data);
    return res.data;
  } catch (error) {
    console.log('Create child failed:', error.message);
    throw error;
  }
}

/**
 * Get all children for the logged-in parent
 */
export async function getParentChildren(parentId) {
  try {
    console.log('Fetching children for parent...');
    const res = await api.get(`/children/parent/${parentId}`);
    console.log('Children fetched:', res.data);
    return res.data;
  } catch (error) {
    console.log('Get children failed:', error.message);
    throw error;
  }
}