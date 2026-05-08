import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * In-memory fallback storage for web when native AsyncStorage is unavailable
 */
const memoryStore = {};

/**
 * Check if AsyncStorage is available (may be null on Expo Go)
 */
let asyncStorageAvailable = false;
try {
  asyncStorageAvailable = AsyncStorage && typeof AsyncStorage.getItem === 'function';
} catch (e) {
  console.warn('[Storage] AsyncStorage not available, using fallback');
}

/**
 * Safe AsyncStorage wrapper with web fallback
 * On web/Expo Go, uses localStorage; on native, uses native AsyncStorage (if available)
 * Falls back to in-memory store if all else fails
 */
export const storage = {
  /**
   * Get and parse a stored value
   * @returns {Promise<any|null>} Parsed value or null if not found or error
   */
  async get(key) {
    try {
      // Try native AsyncStorage first (Android/iOS with proper setup)
      if (asyncStorageAvailable && Platform.OS !== 'web') {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }
      
      // Web fallback: try localStorage
      if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }
      
      // If localStorage not available, use memory store
      return memoryStore[key] || null;
    } catch (err) {
      console.warn(`[storage.get] Failed for key "${key}":`, err.message);
      // Return from memory store as final fallback
      return memoryStore[key] || null;
    }
  },

  /**
   * Set a value (stringified)
   * @returns {Promise<void>}
   */
  async set(key, value) {
    try {
      const stringified = JSON.stringify(value);
      
      // Try native AsyncStorage first
      if (asyncStorageAvailable && Platform.OS !== 'web') {
        await AsyncStorage.setItem(key, stringified);
      } else if (typeof localStorage !== 'undefined') {
        // Web: use localStorage
        localStorage.setItem(key, stringified);
      } else {
        // Fallback to memory store
        memoryStore[key] = value;
      }
    } catch (err) {
      console.warn(`[storage.set] Failed for key "${key}":`, err.message);
      // Always save to memory store as backup
      memoryStore[key] = value;
    }
  },

  /**
   * Remove a stored value
   * @returns {Promise<void>}
   */
  async remove(key) {
    try {
      if (asyncStorageAvailable && Platform.OS !== 'web') {
        await AsyncStorage.removeItem(key);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      } else {
        delete memoryStore[key];
      }
    } catch (err) {
      console.warn(`[storage.remove] Failed for key "${key}":`, err.message);
      delete memoryStore[key];
    }
  },

  /**
   * Clear all stored data
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      if (asyncStorageAvailable && Platform.OS !== 'web') {
        await AsyncStorage.clear();
      } else if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      // Clear memory store
      Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
    } catch (err) {
      console.warn('[storage.clear] Failed:', err.message);
      Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
    }
  },
};
