// Design System — Public API

// Utility
export { cn } from './utils/cn';

// Theme
export { ThemeProvider } from './theme/ThemeProvider';
export { useTheme, type Theme, type ThemeContextValue } from './theme/useTheme';

// There is deliberately no token export here.
//
// `tokens/tokens.ts` used to mirror index.css as a TypeScript object. Nothing
// ever imported a single value from it, and it had already drifted from the CSS
// it claimed to mirror (border alpha 0.12 vs 0.20). A second source of truth
// that lies is worse than none, so it was deleted. index.css owns theming; if a
// component ever genuinely needs a token at runtime, read the custom property
// with getComputedStyle rather than duplicating the value here.