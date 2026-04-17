import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ChildProvider } from './src/context/ChildContext';
import TracingGameScreen from './src/screens/TracingGameScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChildProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="TracingGame" component={TracingGameScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ChildProvider>
    </GestureHandlerRootView>
  );
}