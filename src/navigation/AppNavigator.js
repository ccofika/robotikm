import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import { useOverdueWorkOrders } from '../context/OverdueWorkOrdersContext';

// Import screens (krećemo sa placeholder-ima)
import LoginScreen from '../screens/LoginScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import EquipmentScreen from '../screens/EquipmentScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import BasicEquipmentScreen from '../screens/BasicEquipmentScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator za glavne stranice tehničara
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen 
        name="WorkOrders" 
        component={WorkOrdersScreen}
        options={{ tabBarLabel: 'Radni Nalozi' }}
      />
      <Tab.Screen 
        name="Equipment" 
        component={EquipmentScreen}
        options={{ tabBarLabel: 'Oprema' }}
      />
      <Tab.Screen 
        name="Materials" 
        component={MaterialsScreen}
        options={{ tabBarLabel: 'Materijal' }}
      />
      <Tab.Screen 
        name="BasicEquipment" 
        component={BasicEquipmentScreen}
        options={{ tabBarLabel: 'Osnovna Oprema' }}
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
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
