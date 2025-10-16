import React from 'react';
import { Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../../context/OfflineContext';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { Box } from '../ui/box';

/**
 * Network Status Banner
 * Prikazuje banner kada je uređaj offline ili ima pending/failed sync akcija
 */

export const NetworkStatusBanner = () => {
  const insets = useSafeAreaInsets();
  const {
    isOnline,
    isSyncing,
    pendingActions,
    failedActions,
    forceSyncAll
  } = useOffline();

  // Ako je online i nema pending/failed akcija, ne prikazuj banner
  if (isOnline && pendingActions === 0 && failedActions === 0 && !isSyncing) {
    return null;
  }

  // Determiniši tip i sadržaj bannera
  let bannerType, icon, message, bgColor, textColor, action;

  if (!isOnline) {
    // Offline mod
    bannerType = 'offline';
    icon = 'cloud-offline';
    message = pendingActions > 0
      ? `Offline - ${pendingActions} promena će biti sinhronizovano`
      : 'Offline mod - promene će biti sinhronizovane';
    bgColor = '#f59e0b';
    textColor = '#fff';
  } else if (isSyncing) {
    // Sinhronizacija u toku
    bannerType = 'syncing';
    icon = 'sync';
    message = 'Sinhronizacija u toku...';
    bgColor = '#3b82f6';
    textColor = '#fff';
  } else if (failedActions > 0) {
    // Neuspešne akcije
    bannerType = 'error';
    icon = 'alert-circle';
    message = `${failedActions} akcija nije uspelo - dodirnite za detalje`;
    bgColor = '#ef4444';
    textColor = '#fff';
    action = () => {
      // Ovo će otvoriti SyncErrorModal
      // Implementacija će biti u root komponenti
    };
  } else if (pendingActions > 0) {
    // Pending akcije
    bannerType = 'pending';
    icon = 'time';
    message = `${pendingActions} promena čeka na sinhronizaciju`;
    bgColor = '#8b5cf6';
    textColor = '#fff';
    action = forceSyncAll;
  }

  return (
    <Pressable
      onPress={action}
      disabled={!action}
      style={{
        backgroundColor: bgColor,
        paddingTop: insets.top + 8,
        paddingBottom: 8,
        paddingHorizontal: 16,
      }}
    >
      <HStack space="sm" className="items-center justify-center">
        <Ionicons
          name={icon}
          size={16}
          color={textColor}
          style={bannerType === 'syncing' ? { opacity: 0.8 } : {}}
        />
        <Text
          size="xs"
          bold
          style={{ color: textColor }}
        >
          {message}
        </Text>
        {bannerType === 'syncing' && (
          <Box className="ml-1">
            <Ionicons name="ellipsis-horizontal" size={16} color={textColor} />
          </Box>
        )}
      </HStack>
    </Pressable>
  );
};

export default NetworkStatusBanner;
