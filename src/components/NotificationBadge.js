import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Notification Badge Component
 * Prikazuje badge sa brojem nepročitanih notifikacija
 */
export default function NotificationBadge({ count }) {
  if (!count || count === 0) return null;

  // Prikazi "9+" ako je broj > 9
  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 18,
    backgroundColor: '#dc2626', // Red
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
