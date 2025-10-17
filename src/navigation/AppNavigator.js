import React, { useContext, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useOverdueWorkOrders } from '../context/OverdueWorkOrdersContext';
import { useEquipmentConfirmation } from '../context/EquipmentConfirmationContext';
import { useNotifications } from '../context/NotificationContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import WorkOrdersScreen from '../screens/WorkOrdersScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import EquipmentScreen from '../screens/EquipmentScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import BasicEquipmentScreen from '../screens/BasicEquipmentScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Import components
import NotificationBadge from '../components/NotificationBadge';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator - KOPIJA WEB DIZAJNA (Slate boje)
function MainTabNavigator() {
  const { hasPendingEquipment } = useEquipmentConfirmation();
  const { hasOverdueOrders, overdueOrders } = useOverdueWorkOrders();
  const { unreadCount } = useNotifications();

  // Sakrij tab bar ako ima pending equipment ili overdue orders
  const shouldHideTabBar = hasPendingEquipment || hasOverdueOrders;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb', // blue-600 (web)
        tabBarInactiveTintColor: '#94a3b8', // slate-400 (web)
        tabBarStyle: shouldHideTabBar ? { display: 'none' } : {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0', // slate-200
          borderTopWidth: 1,
        },
      }}
      screenListeners={{
        // Blokiraj swipe gestures između tabova kada ima pending/overdue
        swipeEnabled: !shouldHideTabBar,
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
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifikacije',
          tabBarIcon: ({ color, size, focused }) => (
            <>
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={size}
                color={color}
              />
              {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
            </>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator({ onNavigationReady }) {
  const { user, loading } = useContext(AuthContext);
  const navigationRef = useRef();

  const handleNavigationReady = () => {
    if (onNavigationReady && navigationRef.current) {
      onNavigationReady(navigationRef.current);
    }
  };

  if (loading) {
    return null; // Ili Loading screen
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
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
