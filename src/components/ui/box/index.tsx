'use client';
import React from 'react';
import { View } from 'react-native';

export const Box = React.forwardRef(
  ({ className, children, ...props }: any, ref) => {
    return (
      <View ref={ref} className={className} {...props}>
        {children}
      </View>
    );
  }
);
