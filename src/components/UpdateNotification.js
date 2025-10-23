import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Download, X, AlertCircle } from 'lucide-react-native';
import apkUpdateService from '../services/apkUpdateService';

const { width } = Dimensions.get('window');

const UpdateNotification = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Only run on Android
    if (Platform.OS !== 'android') {
      return;
    }

    // Listen for update notifications
    const unsubscribe = apkUpdateService.addUpdateListener((info) => {
      setUpdateInfo(info);
      setIsVisible(true);
      slideDown();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const slideDown = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  };

  const slideUp = () => {
    Animated.spring(slideAnim, {
      toValue: -100,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start(() => {
      setIsVisible(false);
    });
  };

  const handleUpdate = async () => {
    if (!updateInfo || isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await apkUpdateService.downloadAndInstall(
        updateInfo,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

    } catch (error) {
      console.error('Error updating app:', error);
      alert('Greška pri ažuriranju aplikacije. Pokušajte ponovo.');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDismiss = () => {
    if (updateInfo?.isMandatory) {
      // Don't allow dismissing mandatory updates
      return;
    }
    slideUp();
  };

  if (!isVisible || !updateInfo) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Download size={24} color="#fff" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {updateInfo.isMandatory ? 'Obavezno ažuriranje!' : 'Nova verzija dostupna'}
            </Text>
            <Text style={styles.version}>
              Verzija {updateInfo.latestVersion}
            </Text>
          </View>

          {!updateInfo.isMandatory && (
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {updateInfo.changelog && (
          <Text style={styles.changelog} numberOfLines={2}>
            {updateInfo.changelog}
          </Text>
        )}

        {isDownloading ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${downloadProgress}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(downloadProgress)}%
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.updateButton,
              updateInfo.isMandatory && styles.mandatoryButton
            ]}
            onPress={handleUpdate}
          >
            <Download size={18} color="#fff" />
            <Text style={styles.updateButtonText}>
              {updateInfo.isMandatory ? 'Instaliraj odmah' : 'Ažuriraj'}
            </Text>
          </TouchableOpacity>
        )}

        {updateInfo.isMandatory && (
          <View style={styles.mandatoryWarning}>
            <AlertCircle size={16} color="#ff9800" />
            <Text style={styles.mandatoryText}>
              Ovo ažuriranje je obavezno i mora se instalirati
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 999
  },
  content: {
    backgroundColor: '#9333ea',
    margin: 10,
    marginTop: 50,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2
  },
  version: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  closeButton: {
    padding: 4
  },
  changelog: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 18
  },
  updateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  mandatoryButton: {
    backgroundColor: '#ff5722'
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  progressContainer: {
    gap: 8
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4
  },
  progressText: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600'
  },
  mandatoryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 6,
    gap: 8
  },
  mandatoryText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    lineHeight: 16
  }
});

export default UpdateNotification;
