import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      largeTitle: 'text-4xl font-bold',
      title1: 'text-3xl font-semibold',
      title2: 'text-2xl font-semibold',
      title3: 'text-xl font-semibold',
      heading: 'text-lg font-semibold',
      body: 'text-base',
      callout: 'text-base font-medium',
      subhead: 'text-sm',
      footnote: 'text-xs',
      caption1: 'text-xs',
      caption2: 'text-xs opacity-75',
    },
    color: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
      tertiary: 'text-muted-foreground opacity-75',
      accent: 'text-accent-foreground',
      destructive: 'text-destructive',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'primary',
  },
});

const TextClassContext = React.createContext(undefined);

function Text({ className, variant, color, ...props }) {
  const textClassName = React.useContext(TextClassContext);

  return (
    <RNText
      className={cn(textVariants({ variant, color }), textClassName, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext, textVariants };
