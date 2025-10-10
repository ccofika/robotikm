'use client';
import React from 'react';
import { Text as RNText } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const textStyle = tva({
  base: 'text-slate-900',
  variants: {
    size: {
      '2xs': 'text-2xs',
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
    bold: {
      true: 'font-bold',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const Text = React.forwardRef(
  ({ className, size, bold, children, ...props }: any, ref) => {
    return (
      <RNText
        ref={ref}
        className={textStyle({ size, bold, class: className })}
        {...props}
      >
        {children}
      </RNText>
    );
  }
);
