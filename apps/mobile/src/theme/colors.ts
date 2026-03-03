/** Paleta centralizada de cores do app. Alterar aqui atualiza todo o app. */

export const colors = {
  primary: '#6200ee',
  primaryVariant: '#3700b3',
  secondary: '#03dac6',
  secondaryVariant: '#018786',

  background: '#ffffff',
  surface: '#ffffff',

  /** Texto principal (100% contraste) */
  text: '#000000',
  /** Texto secundário / labels (legível em fundo cinza) */
  textSecondary: '#585c61',
  /** Texto secundário antigo (85% contraste) - deprecar em favor de textSecondary */
  mutedText: 'rgba(0,0,0,0.85)',
  /** Texto hint/desabilitado (70% contraste) - deprecar em favor de textSecondary */
  hintText: 'rgba(0,0,0,0.7)',

  /** Cor de texto sobre primary (header, botões primary) */
  onPrimary: '#ffffff',

  /** Outline/bordas */
  outline: 'rgba(0,0,0,0.5)',
  /** Divisor sutil (listas, modais) */
  divider: 'rgba(0,0,0,0.08)',

  /** Semânticas */
  error: '#b00020',
  onError: '#ffffff',

  /** Status (minhas-solicitacoes) */
  statusRequested: '#ff9800',
  statusPickedUp: '#2196f3',
  statusReceived: '#4caf50',
  statusDelivered: '#4caf50',
  statusCanceled: '#f44336',
  statusDefault: '#999999',

  /** Scanner modal (fundo escuro) */
  scannerBackground: '#000000',
  scannerText: '#ffffff',
  scannerTextMuted: 'rgba(255,255,255,0.8)',

  /** Banner e header superior (marca) */
  bannerBg: '#003285',
  bannerText: '#FFDA78',
} as const;
