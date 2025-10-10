'use client';
import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const buttonStyle = tva({
  base: 'flex-row items-center justify-center rounded-lg px-4 py-3',
  variants: {
    action: {
      primary: 'bg-blue-600 active:bg-blue-700',
      secondary: 'bg-slate-600 active:bg-slate-700',
      positive: 'bg-green-600 active:bg-green-700',
      negative: 'bg-red-600 active:bg-red-700',
    },
    variant: {
      solid: '',
      outline: 'bg-transparent border-2',
      link: 'bg-transparent',
    },
    size: {
      xs: 'px-3 py-1.5',
      sm: 'px-3 py-2',
      md: 'px-4 py-3',
      lg: 'px-5 py-3.5',
      xl: 'px-6 py-4',
    },
  },
  defaultVariants: {
    action: 'primary',
    variant: 'solid',
    size: 'md',
  },
});

const buttonTextStyle = tva({
  base: 'font-semibold text-white',
  variants: {
    action: {
      primary: 'text-white',
      secondary: 'text-white',
      positive: 'text-white',
      negative: 'text-white',
    },
    variant: {
      solid: 'text-white',
      outline: 'text-blue-600',
      link: 'text-blue-600',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
});

export const Button = React.forwardRef(
  ({ className, action, variant, size, isDisabled, children, ...props }: any, ref) => {
    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        className={buttonStyle({ action, variant, size, class: className })}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
);

export const ButtonText = React.forwardRef(
  ({ className, action, variant, size, children, ...props }: any, ref) => {
    return (
      <Text
        ref={ref}
        className={buttonTextStyle({ action, variant, size, class: className })}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

export const ButtonSpinner = ({ className, ...props }: any) => (
  <ActivityIndicator color="#fff" className={className} {...props} />
);

export const ButtonIcon = ({ as: AsComp, className, ...props }: any) => {
  return AsComp ? <AsComp className={className} {...props} /> : null;
};

export const ButtonGroup = ({ className, children, ...props }: any) => (
  <View className={`flex-row gap-2 ${className || ''}`} {...props}>
    {children}
  </View>
);
