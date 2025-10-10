import React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from '../../lib/cn';

/**
 * GlassCard Component
 * Professional glassmorphism card inspired by web app design
 */
export function GlassCard({
  children,
  className,
  onPress,
  variant = 'default',
  ...props
}) {
  const Component = onPress ? Pressable : View;

  const variants = {
    default: 'bg-white/85 border border-white/30',
    solid: 'bg-white border border-gray-200',
    subtle: 'bg-gray-50 border border-gray-100',
  };

  return (
    <Component
      className={cn(
        'rounded-2xl p-6 shadow-lg',
        variants[variant],
        onPress && 'active:scale-[0.98]',
        className
      )}
      {...(onPress && {
        onPress,
        android_ripple: { color: 'rgba(52, 152, 219, 0.1)' }
      })}
      {...props}
    >
      {children}
    </Component>
  );
}

export default GlassCard;
