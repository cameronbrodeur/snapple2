/**
 * ANSI Color Utilities
 *
 * Shared utilities for converting colors to ANSI 256-color codes.
 */

import { RGB } from './types.js';
import { Palette } from '../shared/colors.js';

/**
 * Parse a hex color string to RGB values.
 *
 * @param hex - Hex color string (e.g., '#0D0D0D' or '0D0D0D')
 * @returns RGB object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): RGB {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
    };
}

/**
 * Convert RGB color to ANSI 256-color code.
 *
 * Uses the 6×6×6 color cube (codes 16-231).
 * Each RGB component is mapped to 0-5 range.
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns ANSI 256-color code (16-231)
 */
export function rgbToAnsi256(r: number, g: number, b: number): number {
    const r6 = Math.round((r / 255) * 5);
    const g6 = Math.round((g / 255) * 5);
    const b6 = Math.round((b / 255) * 5);
    return 16 + 36 * r6 + 6 * g6 + b6;
}

/**
 * Convert RGB object to ANSI 256-color code.
 *
 * @param color - RGB color object
 * @returns ANSI 256-color code (16-231)
 */
export function rgbObjectToAnsi256(color: RGB): number {
    return rgbToAnsi256(color.r, color.g, color.b);
}

/** ANSI 256-color code for black (in 6×6×6 cube). */
export const ANSI_BLACK = 16;

/** ANSI 256-color code for white. */
export const ANSI_WHITE = 231;

/**
 * Theme background color RGB values.
 * Derived from Palette.black.base in colors.ts.
 */
const themeBgRgb = hexToRgb(Palette.black.base);
export const THEME_BG_R = themeBgRgb.r;
export const THEME_BG_G = themeBgRgb.g;
export const THEME_BG_B = themeBgRgb.b;

/**
 * ANSI 24-bit background escape sequence for theme background.
 * Uses true color to exactly match the theme's background color.
 */
export const THEME_BG_ANSI = `\x1b[48;2;${THEME_BG_R};${THEME_BG_G};${THEME_BG_B}m`;
