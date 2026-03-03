import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { colors } from './colors';

/** Contraste: secondary 85%, hint 70% */
const ON_SURFACE_VARIANT_LIGHT = 'rgba(0,0,0,0.85)';
const OUTLINE_LIGHT = 'rgba(0,0,0,0.5)';
const ON_SURFACE_VARIANT_DARK = 'rgba(255,255,255,0.85)';
const OUTLINE_DARK = 'rgba(255,255,255,0.6)';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    secondary: colors.secondary,
    tertiary: colors.secondaryVariant,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.text,
    onSurfaceVariant: ON_SURFACE_VARIANT_LIGHT,
    outline: OUTLINE_LIGHT,
    error: colors.error,
    onError: colors.onError,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    secondary: colors.secondary,
    tertiary: colors.secondaryVariant,
    background: '#121212',
    surface: '#121212',
    onSurface: '#ffffff',
    onSurfaceVariant: ON_SURFACE_VARIANT_DARK,
    outline: OUTLINE_DARK,
    error: colors.error,
    onError: colors.onError,
  },
};
