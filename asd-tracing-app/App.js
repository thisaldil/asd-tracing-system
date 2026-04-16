import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ChildProvider } from './src/context/ChildContext';
import TracingGameScreen from './src/screens/TracingGameScreen';
// You will add more screens here as you build them

const Stack = createStackNavigator();

export default function App() {
  return (
    <ChildProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="TracingGame" component={TracingGameScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ChildProvider>
  );
}