import './global.css';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { OverdueWorkOrdersProvider } from './src/context/OverdueWorkOrdersContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <OverdueWorkOrdersProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </OverdueWorkOrdersProvider>
    </AuthProvider>
  );
}
