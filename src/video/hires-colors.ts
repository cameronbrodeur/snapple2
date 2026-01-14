/**
 * Hi-Res Graphics Color Palette
 *
 * Apple II hi-res uses NTSC artifact coloring. Colors emerge from pixel
 * patterns and timing, not explicit color data. This module provides
 * lookup tables for converting hi-res byte patterns to RGB colors.
 *
 * Color rules:
 * - Adjacent OFF bits (00) = BLACK (theme background)
 * - Adjacent ON bits (11) = WHITE
 * - Single ON bit at even column + no high bit = PURPLE
 * - Single ON bit at odd column + no high bit = GREEN
 * - Single ON bit at even column + high bit = BLUE
 * - Single ON bit at odd column + high bit = ORANGE
 */

import { THEME_BG_R, THEME_BG_G, THEME_BG_B, ANSI_BLACK } from './ansi-colors.js';

/**
 * Hi-res color indices.
 */
export enum HiResColor {
    BLACK = 0,
    WHITE = 1,
    PURPLE = 2,
    GREEN = 3,
    BLUE = 4,
    ORANGE = 5,
}

/**
 * Hi-res color definition.
 */
export interface HiResColorDef {
    rgb: [number, number, number];
    ansi256: number;
}

/**
 * Apple II hi-res color palette.
 * Colors based on NTSC artifact coloring.
 * BLACK uses theme background color for visual consistency.
 */
export const HIRES_PALETTE: Record<string, HiResColorDef> = {
    BLACK: { rgb: [THEME_BG_R, THEME_BG_G, THEME_BG_B], ansi256: ANSI_BLACK },
    WHITE: { rgb: [255, 255, 255], ansi256: 231 },
    PURPLE: { rgb: [234, 51, 247], ansi256: 207 }, // Violet
    GREEN: { rgb: [117, 251, 76], ansi256: 46 }, // Light green
    BLUE: { rgb: [61, 139, 253], ansi256: 45 }, // Medium blue
    ORANGE: { rgb: [241, 155, 56], ansi256: 209 }, // Orange
};

const COLOR_NAMES = ['BLACK', 'WHITE', 'PURPLE', 'GREEN', 'BLUE', 'ORANGE'];

/**
 * Get color definition by enum value.
 *
 * @param color - HiResColor enum value
 * @returns Color definition with RGB and ANSI code
 */
export function getColorDef(color: HiResColor): HiResColorDef {
    return HIRES_PALETTE[COLOR_NAMES[color]];
}
