import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/cn';

/**
 * StatCard Component
 * Professional stat card with icon gradient background
 * Inspired by web app dashboard design
 */
export function StatCard({
  title,
  value,
  iconName,
  linkText,
  onPress,
  gradientColors = ['#dbeafe', '#bfdbfe'],
  iconColor = '#1d4ed8',
  className,
  ...props
}) {
  return (
    <Pressable
      className={cn(
        'bg-white/85 border border-white/30',
        'rounded-2xl p-6 shadow-lg',
        'active:scale-[0.98]',
        className
      )}
      onPress={onPress}
      android_ripple={{ color: 'rgba(52, 152, 219, 0.1)' }}
      {...props}
    >
      {/* Icon Container with Gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-16 h-16 rounded-2xl items-center justify-center mb-4 border border-blue-300"
      >
        {iconName && <Ionicons name={iconName} size={28} color={iconColor} />}
      </LinearGradient>

      {/* Title */}
      <Text className="text-gray-600 text-sm font-semibold uppercase tracking-wider mb-2">
        {title}
      </Text>

      {/* Value */}
      <Text className="text-[#2c3e50] text-4xl font-extrabold mb-3">
        {value}
      </Text>

      {/* Link */}
      {linkText && (
        <Text className="text-[#3498db] text-sm font-medium">
          {linkText} →
        </Text>
      )}
    </Pressable>
  );
}

export default StatCard;
