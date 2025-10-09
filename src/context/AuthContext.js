import React, { createContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { authAPI } from '../services/api';

export const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Učitaj korisnika iz storage-a prilikom pokretanja
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await storage.getItem('user');
      const token = await storage.getItem('token');

      if (storedUser && token) {
        // Proveri da li je token istekao
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = Date.now() >= payload.exp * 1000;

        if (isExpired) {
          // Token je istekao, obriši podatke
          await storage.removeItem('user');
          await storage.removeItem('token');
          setUser(null);
        } else {
          setUser(storedUser);
        }
      }
    } catch (error) {
      console.error('Greška pri učitavanju korisnika:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, token) => {
    try {
      setUser(userData);
      await storage.setItem('user', userData);
      await storage.setItem('token', token);
      return true;
    } catch (error) {
      console.error('Greška pri čuvanju korisnika:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await storage.removeItem('user');
      await storage.removeItem('token');
    } catch (error) {
      console.error('Greška pri odjavi:', error);
    }
  };

  const updateUser = async (userData) => {
    try {
      setUser(userData);
      await storage.setItem('user', userData);
    } catch (error) {
      console.error('Greška pri ažuriranju korisnika:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
