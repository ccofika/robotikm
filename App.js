import './global.css';
import 'react-native-gesture-handler';
import React, { useState, useEffect, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { OverdueWorkOrdersProvider, OverdueWorkOrdersContext } from './src/context/OverdueWorkOrdersContext';
import { EquipmentConfirmationProvider, EquipmentConfirmationContext } from './src/context/EquipmentConfirmationContext';
import AppNavigator from './src/navigation/AppNavigator';
import EquipmentConfirmationScreen from './src/screens/EquipmentConfirmationScreen';
import OverdueWorkOrdersScreen from './src/screens/OverdueWorkOrdersScreen';
import { NetworkStatusBanner, ConflictResolutionModal, SyncErrorModal } from './src/components/offline';
import UpdateNotification from './src/components/UpdateNotification';
import apkUpdateService from './src/services/apkUpdateService';

// VAŽNO: Registruj background notification task PRE inicijalizacije app-a
// Ovo omogućava procesiranje notifikacija kada je app zatvoren ili u background-u
import './src/services/backgroundTasks';
// KRITIČNO: Importuj setupNotificationChannels funkciju
import { setupNotificationChannels } from './src/services/notificationService';

// Import debugging utilities (samo u dev modu)
if (__DEV__) {
  require('./src/utils/clearSyncQueue');
}

// Inner component that has access to all contexts
function AppContent() {
  const { user } = useContext(AuthContext);
  const { hasPendingEquipment, checkPendingEquipment } = useContext(EquipmentConfirmationContext);
  const { hasOverdueOrders, checkOverdueOrders } = useContext(OverdueWorkOrdersContext);

  const [showEquipmentConfirmation, setShowEquipmentConfirmation] = useState(false);
  const [showOverdueWorkOrders, setShowOverdueWorkOrders] = useState(false);
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);

  // KRITIČNO: Kreiraj notification channels odmah pri pokretanju app-a
  // OVO MORA biti PRE nego što prva notifikacija stigne!
  useEffect(() => {
    setupNotificationChannels().then(success => {
      if (success) {
        console.log('🚀 App started - Notification channels ready');
      } else {
        console.warn('⚠️ App started - Notification channels failed to create');
      }
    });
  }, []);

  // Start APK update checking when app starts
  useEffect(() => {
    apkUpdateService.startAutoUpdateCheck();

    return () => {
      apkUpdateService.stopAutoUpdateCheck();
    };
  }, []);

  // Provera pending opreme i overdue naloga nakon login-a
  useEffect(() => {
    const checkBoth = async () => {
      if (!user || user.role !== 'technician' || !user._id) {
        setShowEquipmentConfirmation(false);
        setShowOverdueWorkOrders(false);
        return;
      }

      // Prvo proveri pending opremu
      await checkPendingEquipment();
      // Zatim proveri overdue naloge
      await checkOverdueOrders();
    };

    checkBoth();
  }, [user]);

  // Prati trenutni route
  useEffect(() => {
    if (!navigationRef) return;

    const unsubscribe = navigationRef.addListener('state', () => {
      const route = navigationRef.getCurrentRoute();
      setCurrentRoute(route);

      // Proveri pending equipment i overdue orders kada se korisnik vrati na Main screen
      if (route?.name === 'Main' && user?.role === 'technician') {
        console.log('Navigated to Main, checking pending equipment and overdue orders');
        checkPendingEquipment();
        checkOverdueOrders();
      }
    });

    return unsubscribe;
  }, [navigationRef, user]);

  // Prikazuj equipment confirmation modal ako ima pending opreme
  useEffect(() => {
    setShowEquipmentConfirmation(hasPendingEquipment);
  }, [hasPendingEquipment]);

  // Prikazuj overdue modal samo ako nema pending opreme i ako NIJE na WorkOrderDetail screen-u
  useEffect(() => {
    const isOnWorkOrderDetail = currentRoute?.name === 'WorkOrderDetail';

    // Overdue modal se prikazuje samo ako:
    // 1. Nema pending opreme
    // 2. Ima overdue orders
    // 3. Korisnik NIJE na WorkOrderDetail screen-u
    if (!hasPendingEquipment && hasOverdueOrders && !isOnWorkOrderDetail) {
      setShowOverdueWorkOrders(true);
    } else {
      setShowOverdueWorkOrders(false);
    }
  }, [hasPendingEquipment, hasOverdueOrders, currentRoute]);

  const handleEquipmentConfirmationComplete = () => {
    setShowEquipmentConfirmation(false);
    // Proveri da li ima overdue naloga nakon što je oprema potvrđena
    checkOverdueOrders();
  };

  const handleNavigateToWorkOrder = (orderId) => {
    // Navigiraj na detalje radnog naloga - modal će se automatski zatvoriti
    if (navigationRef) {
      navigationRef.navigate('WorkOrderDetail', { orderId });
    }
  };

  return (
    <>
      {/* Network Status Banner - Prikazuje se uvek na vrhu */}
      <NetworkStatusBanner />

      {/* APK Update Notification - Shows above everything */}
      <UpdateNotification />

      <AppNavigator onNavigationReady={(navRef) => setNavigationRef(navRef)} />
      <StatusBar style="auto" />

      {/* Equipment Confirmation Modal - Prioritet 1 */}
      {user?.role === 'technician' && (
        <EquipmentConfirmationScreen
          visible={showEquipmentConfirmation}
          onComplete={handleEquipmentConfirmationComplete}
        />
      )}

      {/* Overdue Work Orders Modal - Prioritet 2 */}
      {user?.role === 'technician' && !showEquipmentConfirmation && (
        <OverdueWorkOrdersScreen
          visible={showOverdueWorkOrders}
          onNavigateToWorkOrder={handleNavigateToWorkOrder}
        />
      )}

      {/* Sync Error Modal */}
      <SyncErrorModal
        visible={showSyncErrorModal}
        onClose={() => setShowSyncErrorModal(false)}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        visible={showConflictModal}
        onClose={() => setShowConflictModal(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineProvider>
          <NotificationProvider>
            <EquipmentConfirmationProvider>
              <OverdueWorkOrdersProvider>
                <AppContent />
              </OverdueWorkOrdersProvider>
            </EquipmentConfirmationProvider>
          </NotificationProvider>
        </OfflineProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
