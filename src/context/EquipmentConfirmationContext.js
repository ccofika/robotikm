import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from './AuthContext';
import { techniciansAPI } from '../services/api';

export const EquipmentConfirmationContext = createContext({
  pendingEquipment: [],
  hasPendingEquipment: false,
  loading: false,
  checkPendingEquipment: () => {},
  confirmEquipment: () => {},
  rejectEquipment: () => {},
});

export const EquipmentConfirmationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [pendingEquipment, setPendingEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkPendingEquipment = async () => {
    if (!user || user.role !== 'technician' || !user._id) {
      console.log('EquipmentConfirmation: User not technician or no ID');
      setPendingEquipment([]);
      return;
    }

    console.log('EquipmentConfirmation: Checking pending equipment for technician:', user._id);
    setLoading(true);
    try {
      const response = await techniciansAPI.getPendingEquipment(user._id);
      console.log('EquipmentConfirmation: API response:', response.data);
      setPendingEquipment(response.data);
    } catch (error) {
      console.error('Greška pri proveravanju pending opreme:', error);
      setPendingEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmEquipment = async (equipmentId) => {
    if (!user || !user._id) {
      throw new Error('User not found');
    }

    try {
      await techniciansAPI.confirmEquipment(user._id, { equipmentId });
      // Ukloni potvrđenu opremu iz liste
      setPendingEquipment(prev => prev.filter(eq => eq._id !== equipmentId));
      console.log('Equipment confirmed:', equipmentId);
    } catch (error) {
      console.error('Greška pri potvrđivanju opreme:', error);
      throw error;
    }
  };

  const rejectEquipment = async (equipmentId, reason) => {
    if (!user || !user._id) {
      throw new Error('User not found');
    }

    try {
      await techniciansAPI.rejectEquipment(user._id, { equipmentId, reason });
      // Ukloni odbijenu opremu iz liste
      setPendingEquipment(prev => prev.filter(eq => eq._id !== equipmentId));
      console.log('Equipment rejected:', equipmentId);
    } catch (error) {
      console.error('Greška pri odbijanju opreme:', error);
      throw error;
    }
  };

  // Inicijalna provera nakon login-a
  useEffect(() => {
    if (user && user.role === 'technician') {
      const initialTimeout = setTimeout(() => {
        checkPendingEquipment();
      }, 2000); // Proveri nakon 2 sekunde

      return () => clearTimeout(initialTimeout);
    }
  }, [user]);

  // Periodička provera svakih 1 minut (smanjeno sa 5 minuta za češće provere)
  useEffect(() => {
    if (user && user.role === 'technician') {
      const interval = setInterval(checkPendingEquipment, 1 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Proveri kada app dođe u foreground (kada se korisnik vrati u aplikaciju)
  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Ako se app prebacuje iz background/inactive u active (foreground)
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('EquipmentConfirmation: App came to foreground, checking pending equipment');
        checkPendingEquipment();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const value = {
    pendingEquipment,
    hasPendingEquipment: pendingEquipment.length > 0,
    loading,
    checkPendingEquipment,
    confirmEquipment,
    rejectEquipment,
  };

  return (
    <EquipmentConfirmationContext.Provider value={value}>
      {children}
    </EquipmentConfirmationContext.Provider>
  );
};

export const useEquipmentConfirmation = () => useContext(EquipmentConfirmationContext);
