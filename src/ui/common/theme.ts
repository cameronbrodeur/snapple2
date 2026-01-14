/**
 * Theme Definitions
 *
 * Visual theme for the Apple II emulator UI.
 * All color values are imported from colors.ts for centralized maintenance.
 */

import { Palette, Semantic, Terminal, ThemeColors } from '../../shared/colors.js';

export interface Theme {
    name: string;
    screen: {
        background: string;
        foreground: string;
        borderColor: string;
        borderStyle: 'single' | 'double' | 'round' | 'bold' | 'classic';
    };
    status: {
        background?: string;
        foreground: string;
        inverseText: string; // text color for inverse video elements
        running: string;
        paused: string;
        dimColor: string;
    };
    accent: {
        background: string;
        borderColor: string;
        titleColor: string;
        keyColor: string;
        secondaryKeyColor: string;
        descColor: string;
        darkShade: string;
    };
    error: string;
}

/**
 * Shared status bar colors used by all themes.
 * Status indicators (running/paused, disk status) use consistent colors
 * regardless of the theme's primary color to maintain visual recognition.
 */
const BASE_STATUS_COLORS: Theme['status'] = {
    foreground: Palette.white.base,
    inverseText: Palette.black.base,
    running: Palette.green.bright,
    paused: Palette.orange.bright,
    dimColor: Palette.gray.base,
};

/**
 * Shared screen styling used by all themes.
 * Only the foreground color differs between themes.
 */
const BASE_SCREEN_STYLE = {
    background: Semantic.background,
    borderColor: Palette.gray.dim,
    borderStyle: 'round' as const,
};

/**
 * Creates accent colors for a theme.
 * Uses the theme's primary color for accents, shared background and description colors.
 */
function createAccentColors(
    themeColors: (typeof ThemeColors)[keyof typeof ThemeColors],
): Theme['accent'] {
    return {
        background: Semantic.background,
        borderColor: themeColors.primary,
        titleColor: themeColors.primaryBright,
        keyColor: themeColors.primaryBright,
        secondaryKeyColor: themeColors.secondary,
        descColor: Palette.white.dim,
        darkShade: themeColors.darkShade,
    };
}

/**
 * Green-on-black Apple II theme
 * Classic phosphor green terminal look
 */
export const GreenTheme: Theme = {
    name: 'green',
    screen: { ...BASE_SCREEN_STYLE, foreground: Terminal.green },
    status: BASE_STATUS_COLORS,
    accent: createAccentColors(ThemeColors.green),
    error: Semantic.error,
};

/**
 * Amber theme
 * Warm amber/yellow monochrome look
 */
export const AmberTheme: Theme = {
    name: 'amber',
    screen: { ...BASE_SCREEN_STYLE, foreground: Terminal.amber },
    status: BASE_STATUS_COLORS,
    accent: createAccentColors(ThemeColors.amber),
    error: Semantic.error,
};

/**
 * White theme
 * Clean monochrome look
 */
export const WhiteTheme: Theme = {
    name: 'white',
    screen: { ...BASE_SCREEN_STYLE, foreground: Terminal.white },
    status: BASE_STATUS_COLORS,
    accent: createAccentColors(ThemeColors.white),
    error: Semantic.error,
};

/**
 * Blue theme
 * Cool blue monochrome look
 */
export const BlueTheme: Theme = {
    name: 'blue',
    screen: { ...BASE_SCREEN_STYLE, foreground: Terminal.blue },
    status: BASE_STATUS_COLORS,
    accent: createAccentColors(ThemeColors.blue),
    error: Semantic.error,
};

/**
 * Default theme (green)
 */
export const DefaultTheme = GreenTheme;
