'use client';
import React from 'react';
import { View } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const vstackStyle = tva({
  base: 'flex-col',
  variants: {
    space: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6',
      '2xl': 'gap-8',
    },
    reversed: {
      true: 'flex-col-reverse',
    },
  },
  defaultVariants: {
    space: 'md',
  },
});

export const VStack = React.forwardRef(
  ({ className, space, reversed, children, ...props }: any, ref) => {
    return (
      <View
        ref={ref}
        className={vstackStyle({ space, reversed, class: className })}
        {...props}
      >
        {children}
      </View>
    );
  }
);
