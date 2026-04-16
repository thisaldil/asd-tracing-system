import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChildContext = createContext();

export function ChildProvider({ children }) {
  const [activeChild, setActiveChild] = useState(null);
  const [cognitiveState, setCognitiveState] = useState(null);

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