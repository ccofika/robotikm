import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useState, useEffect } from 'react';

/**
 * Custom hook for managing color scheme (light/dark mode)
 * Returns the current color scheme and a function to toggle it
 */
export function useColorScheme() {
  const systemColorScheme = useNativeColorScheme();
  const [colorScheme, setColorScheme] = useState(systemColorScheme || 'light');
  const [isDarkColorScheme, setIsDarkColorScheme] = useState(colorScheme === 'dark');

  useEffect(() => {
    setIsDarkColorScheme(colorScheme === 'dark');
  }, [colorScheme]);

  const toggleColorScheme = () => {
    setColorScheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return {
    colorScheme,
    isDarkColorScheme,
    setColorScheme,
    toggleColorScheme,
  };
}
