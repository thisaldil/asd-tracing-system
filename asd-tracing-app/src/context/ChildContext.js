import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChildContext = createContext();

export function ChildProvider({ children }) {
  const [activeChild, setActiveChild] = useState(null);
  const [cognitiveState, setCognitiveState] = useState(null);

  // FIX 6: Rehydrate persisted child on app launch
  useEffect(() => {
    AsyncStorage.getItem('active_child').then(value => {
      if (value) {
        setActiveChild(JSON.parse(value));
      }
    }).catch(err => console.warn('Failed to restore active child:', err));
  }, []);

  const selectChild = async (child) => {
    setActiveChild(child);
    await AsyncStorage.setItem('active_child', JSON.stringify(child));
  };

  const updateCognitiveState = (state) => {
    setCognitiveState(state);
  };

  return (
    <ChildContext.Provider value={{
      activeChild, selectChild,
      cognitiveState, updateCognitiveState
    }}>
      {children}
    </ChildContext.Provider>
  );
}

export const useChild = () => useContext(ChildContext);