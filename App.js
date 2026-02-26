import './global.css';
import 'react-native-gesture-handler';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
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

// VAŽNO: Registruj background taskove PRE inicijalizacije app-a
// Ovo omogućava procesiranje notifikacija i lokacije kada je app zatvoren ili u background-u
import './src/services/backgroundTasks';
import './src/services/backgroundLocationTask';
// KRITIČNO: Importuj setupNotificationChannels funkciju
import notificationService, { setupNotificationChannels } from './src/services/notificationService';

// Import GPS Location Service
import gpsLocationService from './src/services/gpsLocationService';

// Battery optimization guide za agresivne OEM-ove
import BatteryOptimizationGuide, { useBatteryGuide } from './src/screens/BatteryOptimizationGuide';

// Import debugging utilities (samo u dev modu)
if (__DEV__) {
  require('./src/utils/clearSyncQueue');
}

// Inner component that has access to all contexts
function AppContent() {
  const { user } = useContext(AuthContext);
  const { hasPendingEquipment, checkPendingEquipment } = useContext(EquipmentConfirmationContext);
  const { hasOverdueOrders, checkOverdueOrders } = useContext(OverdueWorkOrdersContext);

  const { showGuide: showBatteryGuide, dismiss: dismissBatteryGuide } = useBatteryGuide();
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


  // Inicijalizacija GPS servisa i background tracking-a nakon login-a
  useEffect(() => {
    if (user && user.role === 'technician') {
      console.log('[App] Initializing GPS Location Service for technician...');
      gpsLocationService.initialize().then(success => {
        if (success) {
          console.log('[App] GPS Location Service initialized');
          // Pokreni periodično praćenje lokacije u pozadini
          gpsLocationService.startBackgroundTracking().then(trackingStarted => {
            if (trackingStarted) {
              console.log('[App] ✅ Background location tracking active');
            } else {
              console.warn('[App] ⚠️ Background tracking not started (no permission)');
            }
          });
        } else {
          console.warn('[App] GPS Location Service failed to initialize');
        }
      });
    } else {
      // Korisnik se izlogovao ili nije tehničar - zaustavi praćenje
      gpsLocationService.stopBackgroundTracking();
    }
  }, [user]);

  // Self-healing: kad se app vrati u foreground, proveri da li je tracking živ
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[App] App came to foreground - running GPS self-heal check');
        gpsLocationService.ensureTrackingRunning();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [user]);

  // Setup notification listener za gps_location_request push notifikacije
  useEffect(() => {
    // Handler za razne tipove notifikacija
    const handleNotification = async (notification) => {
      const data = notification?.request?.content?.data;

      // GPS Location Request - admin traži lokaciju
      if (data?.type === 'gps_location_request' && data?.action === 'send_location') {
        console.log('[App] 📍 Received GPS location request notification');
        console.log('[App] Request ID:', data?.requestId);

        try {
          const result = await gpsLocationService.handleGPSRequest(data);
          if (result.success) {
            console.log('[App] ✅ GPS location sent successfully');
          } else {
            console.error('[App] ❌ GPS location send failed:', result.error);
          }
        } catch (error) {
          console.error('[App] ❌ GPS location error:', error);
        }
        return;
      }

    };

    // Postavi listener
    notificationService.setupNotificationListeners(
      handleNotification, // onNotificationReceived
      handleNotification  // onNotificationTapped
    );

    return () => {
      notificationService.removeNotificationListeners();
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

      {/* Battery Optimization Guide - prikazuje se jednom na agresivnim OEM-ovima */}
      {user?.role === 'technician' && (
        <BatteryOptimizationGuide
          visible={showBatteryGuide}
          onDismiss={dismissBatteryGuide}
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
