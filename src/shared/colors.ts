/**
 * Color Palette
 *
 * Centralized color definitions for the Apple II emulator UI.
 * Organized into core palette, extended variants, and semantic colors.
 */

/**
 * Core color palette - organized by color family
 * Each color has base, bright, dim, and dark variants for flexibility
 * Progression: dark → dim → base → bright
 */
export const Palette = {
    // Neutrals - easy on the eyes grayscale
    black: {
        base: '#0D0D0D',
        bright: '#1A1A1A',
        dim: '#050505',
        dark: '#010101',
    },
    white: {
        base: '#E8E8E8',
        bright: '#FFFFFF',
        dim: '#C0C0C0',
        dark: '#252525',
    },
    gray: {
        base: '#6B7280',
        bright: '#9CA3AF',
        dim: '#4B5563',
        dark: '#0f141b',
    },

    // Warm colors
    red: {
        base: '#DC2626',
        bright: '#EF4444',
        dim: '#991B1B',
        dark: '#220505',
    },
    orange: {
        base: '#EA580C',
        bright: '#F97316',
        dim: '#C2410C',
        dark: '#210a03',
    },
    amber: {
        base: '#D97706',
        bright: '#F59E0B',
        dim: '#B45309',
        dark: '#312001',
    },
    yellow: {
        base: '#CA8A04',
        bright: '#EAB308',
        dim: '#A16207',
        dark: '#211003',
    },

    // Cool colors
    green: {
        base: '#16A34A',
        bright: '#22C55E',
        dim: '#15803D',
        dark: '#01261a',
    },
    emerald: {
        base: '#059669',
        bright: '#10B981',
        dim: '#047857',
        dark: '#011611',
    },
    teal: {
        base: '#0D9488',
        bright: '#14B8A6',
        dim: '#0F766E',
        dark: '#021817',
    },
    cyan: {
        base: '#0891B2',
        bright: '#06B6D4',
        dim: '#0E7490',
        dark: '#041a22',
    },
    blue: {
        base: '#2563EB',
        bright: '#3B82F6',
        dim: '#1D4ED8',
        dark: '#061231ff',
    },
    indigo: {
        base: '#4F46E5',
        bright: '#6366F1',
        dim: '#4338CA',
        dark: '#0f0d25',
    },
    violet: {
        base: '#7C3AED',
        bright: '#8B5CF6',
        dim: '#6D28D9',
        dark: '#170832',
    },
    purple: {
        base: '#9333EA',
        bright: '#A855F7',
        dim: '#7E22CE',
        dark: '#1d0332',
    },
    magenta: {
        base: '#DB2777',
        bright: '#EC4899',
        dim: '#BE185D',
        dark: '#280312',
    },

    // Special
    silver: {
        base: '#A8A8A8',
        bright: '#D4D4D4',
        dim: '#737373',
        dark: '#202020',
    },
} as const;

/**
 * Apple rainbow colors (1977 logo)
 * Vibrant colors for the Snapple ][ logo rendering
 */
export const Apple = {
    green: '#61BB46',
    yellow: '#FDB827',
    orange: '#F5821F',
    red: '#E03A3E',
    purple: '#963D97',
    blue: '#009DDC',
} as const;

/**
 * Terminal-friendly colors
 * Softer variants designed for extended viewing
 */
export const Terminal = {
    green: '#4ADE80', // soft phosphor green
    amber: '#FBBF24', // warm amber
    blue: '#60A5FA', // soft blue
    white: '#F5F5F5', // off-white
} as const;

/**
 * Semantic colors - consistent meaning across the UI
 */
export const Semantic = {
    // Backgrounds
    background: Palette.black.base,
    surface: Palette.black.bright,
    dialog: Palette.gray.dim,

    // Text
    foreground: Palette.white.base,
    muted: Palette.gray.base,
    subtle: Palette.gray.dim,

    // Status
    success: Palette.green.base,
    warning: Palette.orange.base,
    error: Palette.red.base,
    info: Palette.blue.base,

    // Interactive
    accent: Palette.green.bright,
    highlight: Palette.cyan.base,
    focus: Palette.blue.bright,
} as const;

/**
 * Theme-specific color sets
 * Pre-defined combinations for different visual styles
 */
export const ThemeColors = {
    green: {
        primary: Palette.green.base,
        primaryBright: Palette.green.bright,
        secondary: Palette.emerald.base,
        darkShade: Palette.green.dark,
    },
    amber: {
        primary: Palette.amber.base,
        primaryBright: Palette.amber.bright,
        secondary: Palette.yellow.base,
        darkShade: Palette.amber.dark,
    },
    white: {
        primary: Palette.white.base,
        primaryBright: Palette.white.bright,
        secondary: Palette.gray.bright,
        darkShade: Palette.white.dark,
    },
    blue: {
        primary: Palette.blue.base,
        primaryBright: Palette.blue.bright,
        secondary: Palette.blue.dim,
        darkShade: Palette.blue.dark,
    },
} as const;
