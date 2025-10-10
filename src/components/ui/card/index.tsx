'use client';
import React from 'react';
import { View } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const cardStyle = tva({
  base: 'bg-white rounded-xl border border-slate-200 shadow-sm',
  variants: {
    variant: {
      elevated: 'shadow-lg',
      outline: 'border-2',
      ghost: 'bg-transparent border-0 shadow-none',
      filled: 'bg-slate-50',
    },
    size: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'elevated',
    size: 'md',
  },
});

export const Card = React.forwardRef(
  ({ className, variant, size, children, ...props }: any, ref) => {
    return (
      <View
        ref={ref}
        className={cardStyle({ variant, size, class: className })}
        {...props}
      >
        {children}
      </View>
    );
  }
);
