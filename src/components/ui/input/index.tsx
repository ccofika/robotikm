'use client';
import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const inputStyle = tva({
  base: 'flex-row items-center border border-slate-300 rounded-lg bg-white',
  variants: {
    variant: {
      outline: 'border-slate-300',
      underlined: 'border-b border-t-0 border-l-0 border-r-0 rounded-none',
      rounded: 'rounded-full',
    },
    size: {
      sm: 'h-9',
      md: 'h-11',
      lg: 'h-12',
      xl: 'h-14',
    },
  },
  defaultVariants: {
    variant: 'outline',
    size: 'md',
  },
});

const inputFieldStyle = tva({
  base: 'flex-1 px-4 text-slate-900',
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
});

export const Input = React.forwardRef(
  ({ className, variant, size, isDisabled, isInvalid, children, ...props }: any, ref) => {
    return (
      <View
        ref={ref}
        className={inputStyle({ variant, size, class: className })}
        {...props}
      >
        {children}
      </View>
    );
  }
);

export const InputField = React.forwardRef(
  ({ className, size, ...props }: any, ref) => {
    return (
      <TextInput
        ref={ref}
        className={inputFieldStyle({ size, class: className })}
        placeholderTextColor="#94a3b8"
        {...props}
      />
    );
  }
);

export const InputSlot = ({ className, children, onPress, ...props }: any) => {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} className={`px-3 justify-center ${className || ''}`} {...props}>
      {children}
    </Wrapper>
  );
};

export const InputIcon = ({ as: AsComp, className, ...props }: any) => {
  return AsComp ? <AsComp size={20} className={className} {...props} /> : null;
};
