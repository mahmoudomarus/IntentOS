// Swiss / International Typographic Style design tokens
// Clean, minimal, geometric, functional

// Swiss / International Typographic Style design tokens
// Clean, minimal, geometric, functional

// ── Shared Scales ──
export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
  s9: 48,
  s10: 64,
};

export const typography = {
  // Typography sizes
  fontXs: 10,
  fontSm: 12,
  fontBase: 14,
  fontMd: 16,
  fontLg: 20,
  fontXl: 28,
  font2xl: 36,
  font3xl: 48,
  font4xl: 64,

  // Font weights
  thin: '200' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Letter spacing
  trackingTight: -0.5,
  trackingNormal: 0,
  trackingWide: 1.5,
  trackingWidest: 3,
};

export const layout = {
  radius: 20,
  radiusSm: 12,
  radiusXs: 8,
  radiusFull: 999,
};

// ── Dark Theme ──
export const darkTheme = {
  colors: {
    bg: '#0A0A0A',
    cardBg: '#141414',
    cardBgHover: '#1A1A1A',
    border: '#292929',          // Solid dark gray border
    borderLight: '#1F1F1F',

    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.4)',
    textMuted: 'rgba(255,255,255,0.2)',

    accent: '#2563EB',         // Swiss Blue
    accentLight: 'rgba(37,99,235,0.15)',
    success: '#000000',        // Pure Black / High Contrast
    successLight: '#F0F0F0',
    danger: '#D72828',         // Swiss Red
    dangerLight: 'rgba(215,40,40,0.1)',
    warning: '#F59E0B',
    warningLight: 'rgba(245,158,11,0.10)',
  }
};

// ── Light Theme ──
export const lightTheme = {
  colors: {
    bg: '#FFFFFF',
    cardBg: '#F7F7F7',
    cardBgHover: '#F0F0F0',
    border: '#E5E5E5',          // Crisp light gray
    borderLight: '#F0F0F0',

    textPrimary: '#000000',
    textSecondary: 'rgba(0,0,0,0.6)',
    textTertiary: 'rgba(0,0,0,0.4)',
    textMuted: 'rgba(0,0,0,0.2)',

    accent: '#2563EB',         // Swiss Blue
    accentLight: 'rgba(37,99,235,0.1)',
    success: '#FFFFFF',        // Pure White
    successLight: '#000000',   // Pure Black
    danger: '#D72828',         // Swiss Red
    dangerLight: 'rgba(215,40,40,0.05)',
    warning: '#F59E0B',
    warningLight: 'rgba(245,158,11,0.05)',
  }
};

export type ThemeColors = typeof darkTheme.colors;

// ── Legacy `T` object (Temporary backwards compatibility) ──
// We proxy this to `darkTheme` values so un-refactored components don't crash immediately.
export const T = {
  ...darkTheme.colors,
  ...spacing,
  ...typography,
  ...layout,
} as const;

// Shared shadow style (minimal for Swiss)
export const cardShadow = {
  // No drop shadows in Swiss style -- flat design
};

// Shimmer placeholder colors for skeleton loading
export const shimmer = {
  base: 'rgba(255,255,255,0.03)',
  highlight: 'rgba(255,255,255,0.06)',
};
