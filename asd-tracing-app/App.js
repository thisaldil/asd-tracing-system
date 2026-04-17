import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChildProvider } from './src/context/ChildContext';

import ParentDashboardScreen from './src/screens/ParentDashboardScreen';
import TracingGameScreen from './src/screens/TracingGameScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChildProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="ParentDashboard"
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* First Screen */}
            <Stack.Screen
              name="ParentDashboard"
              component={ParentDashboardScreen}
            />

            {/* Game Screen */}
            <Stack.Screen
              name="TracingGame"
              component={TracingGameScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ChildProvider>
    </GestureHandlerRootView>
  );
}