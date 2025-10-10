'use client';
import React from 'react';
import { Text } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const headingStyle = tva({
  base: 'font-bold text-slate-900',
  variants: {
    size: {
      xs: 'text-lg',
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
      xl: 'text-4xl',
      '2xl': 'text-5xl',
      '3xl': 'text-6xl',
      '4xl': 'text-7xl',
      '5xl': 'text-8xl',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export const Heading = React.forwardRef(
  ({ className, size, children, ...props }: any, ref) => {
    return (
      <Text
        ref={ref}
        className={headingStyle({ size, class: className })}
        {...props}
      >
        {children}
      </Text>
    );
  }
);
