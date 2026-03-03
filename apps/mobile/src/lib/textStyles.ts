import { useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

/** Padrões de contraste para textos (legibilidade) */
const OPACITY = {
  primary: 1,
  secondary: 0.85,
  hint: 0.7,
} as const;

export type TextStyleHelpers = {
  textPrimaryStyle: { color: string };
  textSecondaryStyle: { color: string; opacity: number };
  textHintStyle: { color: string; opacity: number };
};

/** Hook que retorna estilos padronizados de texto (primary 100%, secondary 85%, hint 70%) */
export function useTextStyles(): TextStyleHelpers {
  const theme = useTheme();
  const color = theme.colors.onSurface;
  return {
    textPrimaryStyle: { color },
    textSecondaryStyle: { color, opacity: OPACITY.secondary },
    textHintStyle: { color, opacity: OPACITY.hint },
  };
}

/** Versão para uso fora de componente (ex.: StyleSheet ou theme passado como param) */
export function getTextStyles(theme: MD3Theme): TextStyleHelpers {
  const color = theme.colors.onSurface;
  return {
    textPrimaryStyle: { color },
    textSecondaryStyle: { color, opacity: OPACITY.secondary },
    textHintStyle: { color, opacity: OPACITY.hint },
  };
}
