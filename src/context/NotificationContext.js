import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';
import { AuthContext } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications mora biti korišćen unutar NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pushToken, setPushToken] = useState(null);

  /**
   * Učitaj notifikacije sa servera
   */
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.fetchNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);

      // Postavi badge broj na ikoni aplikacije
      await notificationService.setBadgeCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Greška pri učitavanju notifikacija:', err);
      setError('Nije moguće učitati notifikacije');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Označi notifikaciju kao pročitanu
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Ažuriraj lokalni state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );

      // Smanji unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Ažuriraj badge
      const newCount = Math.max(0, unreadCount - 1);
      await notificationService.setBadgeCount(newCount);
    } catch (err) {
      console.error('Greška pri označavanju notifikacije:', err);
    }
  }, [unreadCount]);

  /**
   * Obriši notifikaciju
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);

      // Ukloni iz lokalnog state-a
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));

      // Ažuriraj unread count ako je notifikacija bila nepročitana
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        const newCount = Math.max(0, unreadCount - 1);
        await notificationService.setBadgeCount(newCount);
      }
    } catch (err) {
      console.error('Greška pri brisanju notifikacije:', err);
      throw err;
    }
  }, [notifications, unreadCount]);

  /**
   * Dodaj novu notifikaciju u state (kada stigne push)
   */
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  /**
   * Registruj uređaj za push notifikacije
   */
  const registerPushNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setPushToken(token);
        console.log('Push notifikacije su aktivirane');
      }
    } catch (err) {
      console.error('Greška pri registraciji push notifikacija:', err);
    }
  }, [user]);

  /**
   * Handler kada stigne nova notifikacija dok je app otvoren
   */
  const handleNotificationReceived = useCallback((notification) => {
    console.log('Nova notifikacija primljena:', notification);

    // Dodaj notifikaciju u listu
    const newNotif = {
      _id: notification.request.content.data?.notificationId || Date.now().toString(),
      title: notification.request.content.title,
      message: notification.request.content.body,
      type: notification.request.content.data?.type || 'work_order',
      isRead: false,
      createdAt: new Date().toISOString(),
      ...notification.request.content.data,
    };

    addNotification(newNotif);

    // Refresh notifikacija sa servera za sigurnost
    setTimeout(() => {
      fetchNotifications();
    }, 1000);
  }, [addNotification, fetchNotifications]);

  /**
   * Handler kada korisnik klikne na notifikaciju
   */
  const handleNotificationTapped = useCallback((response) => {
    console.log('Notifikacija kliknuta:', response);
    const notificationId = response.notification.request.content.data?.notificationId;

    if (notificationId) {
      // Označi kao pročitanu
      markAsRead(notificationId);
    }

    // TODO: Dodaj navigaciju na odgovarajući screen
    // Na primer, ako je work_order, navigiraj na Work Orders screen
  }, [markAsRead]);

  /**
   * Inicijalizacija - učitaj notifikacije i setup listeners
   */
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPushToken(null);
      return;
    }

    // Učitaj notifikacije
    fetchNotifications();

    // Registruj push notifikacije
    registerPushNotifications();

    // Setup listeners
    notificationService.setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    // Cleanup
    return () => {
      notificationService.removeNotificationListeners();
    };
  }, [user, fetchNotifications, registerPushNotifications, handleNotificationReceived, handleNotificationTapped]);

  /**
   * Periodično refresh notifikacija (svaka 2 minuta)
   */
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 2 * 60 * 1000); // 2 minuta

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    pushToken,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    addNotification,
    registerPushNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
