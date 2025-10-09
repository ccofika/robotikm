import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { workOrdersAPI } from '../services/api';

export const OverdueWorkOrdersContext = createContext({
  overdueOrders: [],
  hasOverdueOrders: false,
  isAllowedPath: () => true,
  checkOverdueOrders: () => {},
});

export const OverdueWorkOrdersProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [overdueOrders, setOverdueOrders] = useState([]);

  useEffect(() => {
    if (user?.role === 'technician' && user?._id) {
      checkOverdueOrders();
      
      // Proveri svakih 5 minuta
      const interval = setInterval(checkOverdueOrders, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkOverdueOrders = async () => {
    if (!user?._id || user?.role !== 'technician') return;

    try {
      const response = await workOrdersAPI.getTechnicianOverdueWorkOrders(user._id);
      setOverdueOrders(response.data || []);
    } catch (error) {
      console.error('Greška pri proveri overdue radnih naloga:', error);
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
        isAllowedPath,
        checkOverdueOrders 
      }}
    >
      {children}
    </OverdueWorkOrdersContext.Provider>
  );
};

export const useOverdueWorkOrders = () => useContext(OverdueWorkOrdersContext);
