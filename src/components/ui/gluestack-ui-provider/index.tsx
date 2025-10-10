'use client';
import React from 'react';

type GluestackUIProviderProps = {
  mode?: 'light' | 'dark' | 'system';
  children?: React.ReactNode;
};

export function GluestackUIProvider({
  mode = 'light',
  children,
  ...props
}: GluestackUIProviderProps) {
  return <>{children}</>;
}
