/**
 * BepariBD Design Tokens
 *
 * Apple-inspired design system:
 * - Soft shadows
 * - Smooth animations
 * - Rounded corners
 * - Minimal borders
 * - Glass feel
 * - Clean spacing
 * - High contrast for accessibility
 */

// ─── Color Tokens ────────────────────────────────────────

/** Brand accent colors */
export const accent = {
  primary: '#007AFF',
  primaryHover: '#0062CC',
  primaryLight: '#E8F2FF',
  primaryContent: '#FFFFFF',
} as const;

/** Semantic status colors */
export const semantic = {
  success: '#34C759',
  successLight: '#E8F8ED',
  warning: '#FF9500',
  warningLight: '#FFF4E5',
  danger: '#FF3B30',
  dangerLight: '#FFEBEA',
  info: '#007AFF',
  infoLight: '#E8F2FF',
} as const;

/** Surface colors — light mode */
export const surface = {
  light: {
    primary: '#FFFFFF',
    secondary: '#F2F2F7',
    tertiary: '#E5E5EA',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassSecondary: 'rgba(242, 242, 247, 0.72)',
  },
  dark: {
    primary: '#1C1C1E',
    secondary: '#2C2C2E',
    tertiary: '#3A3A3C',
    glass: 'rgba(28, 28, 30, 0.72)',
    glassSecondary: 'rgba(44, 44, 46, 0.72)',
  },
} as const;

/** Text colors */
export const text = {
  light: {
    primary: '#1C1C1E',
    secondary: '#6D6D72',
    tertiary: '#AEAEB2',
    placeholder: '#C7C7CC',
    inverse: '#FFFFFF',
  },
  dark: {
    primary: '#FFFFFF',
    secondary: '#AEAEB2',
    tertiary: '#6D6D72',
    placeholder: '#48484A',
    inverse: '#1C1C1E',
  },
} as const;

/** Border colors */
export const border = {
  light: {
    default: 'rgba(60, 60, 67, 0.12)',
    prominent: 'rgba(60, 60, 67, 0.24)',
    focus: '#007AFF',
  },
  dark: {
    default: 'rgba(255, 255, 255, 0.08)',
    prominent: 'rgba(255, 255, 255, 0.16)',
    focus: '#0A84FF',
  },
} as const;

// ─── Spacing Tokens ──────────────────────────────────────

/** Consistent spacing scale (4px base) */
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ─── Radius Tokens ───────────────────────────────────────

/** Corner radius scale */
export const radius = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

// ─── Shadow Tokens ───────────────────────────────────────

/** Soft, layered shadows (Apple-style) */
export const shadow = {
  none: 'none',
  /** Subtle elevation — cards, inputs */
  sm: '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.06)',
  /** Standard elevation — dropdowns, tooltips */
  md: '0px 4px 6px -1px rgba(0, 0, 0, 0.04), 0px 2px 4px -2px rgba(0, 0, 0, 0.06), 0px 0px 0px 1px rgba(0, 0, 0, 0.02)',
  /** Elevated — modals, popovers */
  lg: '0px 10px 15px -3px rgba(0, 0, 0, 0.06), 0px 4px 6px -4px rgba(0, 0, 0, 0.06), 0px 0px 0px 1px rgba(0, 0, 0, 0.02)',
  /** Prominent — floating elements */
  xl: '0px 20px 25px -5px rgba(0, 0, 0, 0.08), 0px 8px 10px -6px rgba(0, 0, 0, 0.06), 0px 0px 0px 1px rgba(0, 0, 0, 0.03)',
} as const;

// ─── Animation Tokens ────────────────────────────────────

/** Duration tokens */
export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

/** Easing tokens (Apple-style spring-like curves) */
export const easing = {
  /** Default — smooth deceleration */
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Entrance — smooth acceleration */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  /** In-out — for modals, transforms */
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Spring — for interactive elements */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Typography Tokens ───────────────────────────────────

/** Font family */
export const fontFamily = {
  sans: `'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`,
  mono: `'SF Mono', 'JetBrains Mono', 'Fira Code', monospace`,
} as const;

/** Font size scale */
export const fontSize = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
} as const;

/** Line height */
export const lineHeight = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.75',
} as const;

/** Font weight */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ─── Glass Effect Tokens ─────────────────────────────────

/** Glass backdrop blur amounts */
export const glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.72)',
    blur: 'blur(20px)',
    border: 'rgba(255, 255, 255, 0.3)',
  },
  dark: {
    background: 'rgba(28, 28, 30, 0.72)',
    blur: 'blur(20px)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

// ─── Component Size Tokens ───────────────────────────────

/** Button/Input height per size */
export const componentHeight = {
  sm: '36px',
  md: '44px',
  lg: '52px',
} as const;

/** Icon size per component size */
export const iconSize = {
  sm: '16px',
  md: '20px',
  lg: '24px',
} as const;

// ─── Accessibility ───────────────────────────────────────

/** Minimum touch target (WCAG 2.5.5) */
export const touchTarget = '44px';

/** Focus ring */
export const focusRing = {
  width: '3px',
  color: 'rgba(0, 122, 255, 0.5)',
  offset: '2px',
} as const;

/** Contrast-safe color overrides for dark mode */
export const contrast = {
  /** WCAG AA requires 4.5:1 for normal text */
  textOnSurface: {
    light: '#1C1C1E',
    dark: '#FFFFFF',
  },
} as const;