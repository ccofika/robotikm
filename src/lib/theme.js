/**
 * Design System Theme
 * Inspired by web app professional corporate design
 * Minimalist glassmorphism with clean aesthetics
 */

export const colors = {
  // Corporate Colors
  corp: {
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#3498db',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c',
  },

  // Professional Grays
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Icon Background Gradients (for stat cards)
  gradients: {
    equipment: {
      start: '#dbeafe',
      end: '#bfdbfe',
      border: '#93c5fd',
      icon: '#1d4ed8',
    },
    materials: {
      start: '#d1fae5',
      end: '#bbf7d0',
      border: '#86efac',
      icon: '#059669',
    },
    technicians: {
      start: '#fef3c7',
      end: '#fde68a',
      border: '#fcd34d',
      icon: '#d97706',
    },
    workorders: {
      start: '#fce7f3',
      end: '#fbcfe8',
      border: '#f9a8d4',
      icon: '#be185d',
    },
    completed: {
      start: '#d1fae5',
      end: '#bbf7d0',
      border: '#86efac',
      icon: '#059669',
    },
    pending: {
      start: '#fee2e2',
      end: '#fecaca',
      border: '#fca5a5',
      icon: '#e74c3c',
    },
    postponed: {
      start: '#dbeafe',
      end: '#bfdbfe',
      border: '#93c5fd',
      icon: '#3498db',
    },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const shadows = {
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 4,
  },
  glassHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const glassmorphism = {
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.3)',
};

export const animations = {
  transition: {
    duration: 300,
    type: 'timing',
  },
  transitionSlow: {
    duration: 400,
    type: 'timing',
  },
  spring: {
    damping: 15,
    stiffness: 150,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  glassmorphism,
  animations,
};
