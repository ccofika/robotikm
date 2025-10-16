import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from './AuthContext';
import { workOrdersAPI } from '../services/api';

export const OverdueWorkOrdersContext = createContext({
  overdueOrders: [],
  hasOverdueOrders: false,
  loading: false,
  isAllowedPath: () => true,
  checkOverdueOrders: () => {},
});

export const OverdueWorkOrdersProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (user?.role === 'technician' && user?._id) {
      checkOverdueOrders();

      // Proveri svakih 1 minut (smanjeno sa 5 minuta za češće provere)
      const interval = setInterval(checkOverdueOrders, 1 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Proveri kada app dođe u foreground (kada se korisnik vrati u aplikaciju)
  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Ako se app prebacuje iz background/inactive u active (foreground)
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('OverdueWorkOrders: App came to foreground, checking overdue orders');
        checkOverdueOrders();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const checkOverdueOrders = async () => {
    if (!user?._id || user?.role !== 'technician') return;

    setLoading(true);
    try {
      const response = await workOrdersAPI.getTechnicianOverdueWorkOrders(user._id);
      setOverdueOrders(response.data || []);
    } catch (error) {
      console.error('Greška pri proveri overdue radnih naloga:', error);
      setOverdueOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Dozvoljeni path-ovi kada postoje overdue radni nalozi
  const allowedPaths = [
    'WorkOrderDetail',
    'TechnicianWorkOrderDetail',
  ];

  const isAllowedPath = (routeName) => {
    return allowedPaths.includes(routeName);
  };

  const hasOverdueOrders = overdueOrders.length > 0;

  return (
    <OverdueWorkOrdersContext.Provider
      value={{
        overdueOrders,
        hasOverdueOrders,
        loading,
        isAllowedPath,
        checkOverdueOrders
      }}
    >
      {children}
    </OverdueWorkOrdersContext.Provider>
  );
};

export const useOverdueWorkOrders = () => useContext(OverdueWorkOrdersContext);
