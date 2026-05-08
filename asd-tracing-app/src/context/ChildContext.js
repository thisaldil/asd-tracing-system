import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { logoutParent } from '../services/apiService';

const ChildContext = createContext();

export function ChildProvider({ children }) {
  const [activeChild, setActiveChild] = useState(null);
  const [cognitiveState, setCognitiveState] = useState(null);
  const [parentProfile, setParentProfile] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [childrenList, setChildrenList] = useState([]);

  // Rehydrate persisted child and auth on app launch
  useEffect(() => {
    Promise.all([
      storage.get('active_child').then(value => {
        if (value) {
          setActiveChild(value);
        }
      }),
      storage.get('auth_token').then(value => {
        if (value) {
          setAuthToken(value);
        }
      }),
      storage.get('parent_profile').then(value => {
        if (value) {
          setParentProfile(value);
        }
      })
    ]).catch(err => console.warn('Failed to restore app state:', err));
  }, []);

  const selectChild = async (child) => {
    setActiveChild(child);
    await storage.set('active_child', child);
  };

  const setParent = async (parent, token) => {
    setParentProfile(parent);
    setAuthToken(token);
    await storage.set('parent_profile', parent);
    await storage.set('auth_token', token);
  };

  const logout = async () => {
    setActiveChild(null);
    setParentProfile(null);
    setAuthToken(null);
    setChildrenList([]);
    setCognitiveState(null);
    await logoutParent();
  };

  const updateCognitiveState = (state) => {
    setCognitiveState(state);
  };

  const setChildren = (children) => {
    setChildrenList(children);
  };

  return (
    <ChildContext.Provider value={{
      activeChild, selectChild,
      parentProfile, setParent,
      authToken,
      childrenList, setChildren,
      cognitiveState, updateCognitiveState,
      logout
    }}>
      {children}
    </ChildContext.Provider>
  );
}

export const useChild = () => useContext(ChildContext);