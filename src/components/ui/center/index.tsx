'use client';
import React from 'react';
import { View } from 'react-native';

export const Center = React.forwardRef(
  ({ className, children, ...props }: any, ref) => {
    return (
      <View ref={ref} className={`justify-center items-center ${className || ''}`} {...props}>
        {children}
      </View>
    );
  }
);
