import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useOverdueWorkOrders } from '../context/OverdueWorkOrdersContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import EquipmentScreen from '../screens/EquipmentScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import BasicEquipmentScreen from '../screens/BasicEquipmentScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator - KOPIJA WEB DIZAJNA (Slate boje)
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb', // blue-600 (web)
        tabBarInactiveTintColor: '#94a3b8', // slate-400 (web)
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0', // slate-200
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="WorkOrders"
        component={WorkOrdersScreen}
        options={{
          tabBarLabel: 'Nalozi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Equipment"
        component={EquipmentScreen}
        options={{
          tabBarLabel: 'Oprema',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Materials"
        component={MaterialsScreen}
        options={{
          tabBarLabel: 'Materijal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BasicEquipment"
        component={BasicEquipmentScreen}
        options={{
          tabBarLabel: 'Osnovna',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // Ili Loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="WorkOrderDetail"
              component={WorkOrderDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Detalji Radnog Naloga',
                headerBackTitle: 'Nazad',
                headerStyle: {
                  backgroundColor: '#ffffff',
                  borderBottomColor: '#e2e8f0',
                  borderBottomWidth: 1,
                },
                headerTintColor: '#2563eb',
                headerTitleStyle: {
                  fontWeight: '600',
                  color: '#0f172a', // slate-900
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
