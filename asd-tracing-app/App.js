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

// App Screens
import ParentDashboardScreen from './src/screens/ParentDashboardScreen';
import TracingGameScreen from './src/screens/TracingGameScreen';

const Stack = createStackNavigator();

// Auth Stack Navigator (Login/Register only)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Child Selection Stack (ChildSetup/ChildSelect - shown after login but before child selected)
function ChildSelectStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="ChildSelect" component={ChildSelectScreen} />
      <Stack.Screen name="ChildSetup" component={ChildSetupScreen} />
    </Stack.Navigator>
  );
}

// App Stack Navigator
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
      <Stack.Screen name="TracingGame" component={TracingGameScreen} />
    </Stack.Navigator>
  );
}

// Main Navigator Component
function RootNavigator() {
  const { parentProfile, activeChild, authToken } = useChild();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user has valid token on app startup
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
        // Errors are handled gracefully - user will see login screen
      } finally {
        // Delay slightly to allow ChildContext to rehydrate
        setTimeout(() => {
          setIsCheckingAuth(false);
        }, 500);
      }
    };

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return null; // Could show a splash screen here
  }

  return (
    <NavigationContainer>
      {!parentProfile ? (
        // Not logged in → Show Login/Register
        <AuthStack />
      ) : !activeChild ? (
        // Logged in but no child selected → Show ChildSelect/ChildSetup
        <ChildSelectStack />
      ) : (
        // Fully ready → Show main app with TracingGame
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