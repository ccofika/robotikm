import React from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../../context/OfflineContext';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { Box } from '../ui/box';

/**
 * Sync Status Indicator
 * Kompaktna ikonica koja prikazuje sync status (za header)
 */

export const SyncStatusIndicator = ({ onPress }) => {
  const {
    isOnline,
    isSyncing,
    pendingActions,
    failedActions,
    hasConflicts
  } = useOffline();

  // Determiniši koji status prikazati (prioritet)
  let icon, color, badgeCount, badgeColor;

  if (!isOnline) {
    // Offline
    icon = 'cloud-offline-outline';
    color = '#f59e0b';
    badgeCount = pendingActions;
    badgeColor = '#f59e0b';
  } else if (hasConflicts) {
    // Konflikti
    icon = 'warning-outline';
    color = '#ef4444';
    badgeCount = null;
    badgeColor = '#ef4444';
  } else if (failedActions > 0) {
    // Failed akcije
    icon = 'alert-circle-outline';
    color = '#ef4444';
    badgeCount = failedActions;
    badgeColor = '#ef4444';
  } else if (isSyncing) {
    // Sinhronizacija u toku
    icon = 'sync-outline';
    color = '#3b82f6';
    badgeCount = null;
    badgeColor = '#3b82f6';
  } else if (pendingActions > 0) {
    // Pending akcije
    icon = 'cloud-upload-outline';
    color = '#8b5cf6';
    badgeCount = pendingActions;
    badgeColor = '#8b5cf6';
  } else {
    // Sve sinhronizovano
    icon = 'checkmark-circle-outline';
    color = '#10b981';
    badgeCount = null;
    badgeColor = null;
  }

  return (
    <Pressable
      onPress={onPress}
      className="relative"
      style={{ padding: 8 }}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={24} color={color} />
      )}

      {/* Badge za broj akcija */}
      {badgeCount !== null && badgeCount > 0 && (
        <Box
          className="absolute -top-1 -right-1 rounded-full items-center justify-center min-w-[18px] h-[18px] px-1"
          style={{ backgroundColor: badgeColor }}
        >
          <Text
            size="xs"
            bold
            className="text-white"
            style={{ fontSize: 10, lineHeight: 12 }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </Box>
      )}

      {/* Dot za konflikte */}
      {hasConflicts && (
        <Box
          className="absolute top-0 right-0 rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: '#ef4444'
          }}
        />
      )}
    </Pressable>
  );
};

export default SyncStatusIndicator;
