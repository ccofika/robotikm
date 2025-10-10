import * as React from 'react';
import { TextInput } from 'react-native';
import { cn } from '../../lib/cn';

const Input = React.forwardRef(({ className, placeholderClassName, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      className={cn(
        'h-12 rounded-lg border-2 border-input bg-background px-4 text-base text-foreground',
        'placeholder:text-muted-foreground',
        'focus:border-ring focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      placeholderTextColor="rgb(142, 142, 147)"
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
