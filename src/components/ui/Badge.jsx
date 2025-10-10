import * as React from 'react';
import { View } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { Text } from './Text';

const badgeVariants = cva('flex-row items-center rounded-full px-3 py-1', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border-2 border-border',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      success: 'text-white',
      warning: 'text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Badge({ className, variant, children, ...props }) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {typeof children === 'string' ? (
        <Text className={badgeTextVariants({ variant })}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export { Badge, badgeVariants };
