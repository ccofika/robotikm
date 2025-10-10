import * as React from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/cn';
import { Text } from './Text';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      'rounded-xl border-2 border-border bg-card p-4 shadow-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('mb-4', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    variant="title3"
    className={cn('font-semibold', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    variant="subhead"
    color="secondary"
    className={cn('mt-1', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('mt-4 flex-row items-center', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
