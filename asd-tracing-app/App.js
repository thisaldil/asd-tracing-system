import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { storage } from './src/utils/storage';

import { ChildProvider, useChild } from './src/context/ChildContext';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ChildSetupScreen from './src/screens/auth/ChildSetupScreen';
import ChildSelectScreen from './src/screens/auth/ChildSelectScreen';

// App Screens — Game 1: Tracing
import ParentDashboardScreen from './src/screens/ParentDashboardScreen';
import TracingGameScreen from './src/screens/TracingGameScreen';

// App Screens — Game 2: Behaviour picture-choice
import BehaviourGameScreen from './src/screens/BehaviourGameScreen';
import BehaviourResultScreen from './src/screens/BehaviourResultScreen';

const Stack = createStackNavigator();

// ─── Auth Stack ───────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── Child Select Stack ───────────────────────────────────
function ChildSelectStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      <Stack.Screen name="ChildSelect" component={ChildSelectScreen} />
      <Stack.Screen name="ChildSetup"  component={ChildSetupScreen} />
    </Stack.Navigator>
  );
}

// ─── App Stack ────────────────────────────────────────────
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main dashboard */}
      <Stack.Screen name="ParentDashboard"  component={ParentDashboardScreen} />

      {/* Game 1 — Tracing */}
      <Stack.Screen name="TracingGame"      component={TracingGameScreen} />

      {/* Game 2 — Behaviour */}
      <Stack.Screen name="BehaviourGame"    component={BehaviourGameScreen} />
      <Stack.Screen name="BehaviourResult"  component={BehaviourResultScreen} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────
function RootNavigator() {
  const { parentProfile, activeChild, authToken } = useChild();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await storage.get('auth_token');
        if (token) {
          console.log('[Auth Check] Token found, waiting for ChildContext to load');
        } else {
          console.log('[Auth Check] No token, user will see login screen');
        }
      } catch (error) {
        console.warn('[Auth Check] Error checking auth (will default to login):', error.message);
      } finally {
        setTimeout(() => setIsCheckingAuth(false), 500);
      }
    };
    checkAuth();
  }, []);

  if (isCheckingAuth) return null;

  return (
    <NavigationContainer>
      {!parentProfile ? (
        <AuthStack />
      ) : !activeChild ? (
        <ChildSelectStack />
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChildProvider>
        <RootNavigator />
      </ChildProvider>
    </GestureHandlerRootView>
  );
}