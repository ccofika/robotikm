'use client';
import React from 'react';
import { ActivityIndicator } from 'react-native';

export const Spinner = React.forwardRef(
  ({ className, size = 'small', color = '#2563eb', ...props }: any, ref) => {
    return <ActivityIndicator ref={ref} size={size} color={color} {...props} />;
  }
);
