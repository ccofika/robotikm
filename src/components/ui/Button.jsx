import * as React from 'react';
import { Pressable, View, ActivityIndicator } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { Text } from './Text';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl active:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-[#3498db]',
        primary: 'bg-[#2c3e50]',
        destructive: 'bg-[#e74c3c]',
        outline: 'border-2 border-[#3498db] bg-transparent',
        secondary: 'bg-gray-200',
        ghost: 'bg-transparent',
        success: 'bg-[#27ae60]',
        link: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-9 px-4',
        lg: 'h-14 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('font-semibold text-center', {
  variants: {
    variant: {
      default: 'text-white',
      primary: 'text-white',
      destructive: 'text-white',
      outline: 'text-corp-accent',
      secondary: 'text-corp-primary',
      ghost: 'text-corp-primary',
      success: 'text-white',
      link: 'text-corp-accent underline',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const Button = React.forwardRef(
  ({ className, variant, size, children, disabled, loading, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          disabled && 'opacity-50',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {({ pressed }) => (
          <View className={cn('flex-row items-center gap-2', pressed && 'opacity-90')}>
            {loading && <ActivityIndicator size="small" color="currentColor" />}
            {typeof children === 'string' ? (
              <Text className={buttonTextVariants({ variant, size })}>{children}</Text>
            ) : (
              children
            )}
          </View>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants };
