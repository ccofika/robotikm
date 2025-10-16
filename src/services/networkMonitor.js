import NetInfo from '@react-native-community/netinfo';

/**
 * Network Monitor Service
 * Prati online/offline status uređaja i pruža funkcije za praćenje promene stanja
 */

class NetworkMonitor {
  constructor() {
    this.isOnline = true;
    this.listeners = [];
    this.unsubscribe = null;
  }

  /**
   * Inicijalizuje network monitoring
   */
  initialize() {
    // Inicijalno stanje
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected && state.isInternetReachable !== false;
      this.notifyListeners(this.isOnline);
    });

    // Subscribe na promene
    this.unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable !== false;

      // Notifikuj listenere samo ako se stanje promenilo
      if (wasOnline !== this.isOnline) {
        console.log(`[NetworkMonitor] Network status changed: ${this.isOnline ? 'Online' : 'Offline'}`);
        this.notifyListeners(this.isOnline);
      }
    });
  }

  /**
   * Zaustavlja network monitoring
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }

  /**
   * Dodaje listener za promene network statusa
   * @param {Function} callback - Funkcija koja se poziva kada se promeni status (prima boolean)
   * @returns {Function} Unsubscribe funkcija
   */
  addListener(callback) {
    this.listeners.push(callback);

    // Odmah pozovi callback sa trenutnim stanjem
    callback(this.isOnline);

    // Vrati unsubscribe funkciju
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notifikuje sve listenere o promeni statusa
   * @param {boolean} isOnline - Novi status
   */
  notifyListeners(isOnline) {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('[NetworkMonitor] Error notifying listener:', error);
      }
    });
  }

  /**
   * Vraća trenutni online status
   * @returns {boolean}
   */
  getIsOnline() {
    return this.isOnline;
  }

  /**
   * Vraća detaljne informacije o mreži
   * @returns {Promise<Object>}
   */
  async getNetworkState() {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details
    };
  }

  /**
   * Proverava da li je online
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable !== false;
    return this.isOnline;
  }
}

// Singleton instanca
const networkMonitor = new NetworkMonitor();

export default networkMonitor;
