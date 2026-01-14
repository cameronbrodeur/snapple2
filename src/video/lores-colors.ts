/**
 * Lo-Res Graphics Color Palette
 *
 * Maps Apple II's 16-color lo-res palette to ANSI 256-color codes.
 * Black uses theme background color for visual consistency.
 */

import { THEME_BG_ANSI, THEME_BG_R, THEME_BG_G, THEME_BG_B, ANSI_BLACK } from './ansi-colors.js';

export interface LoResColor {
    /** RGB values (for reference/future use) */
    rgb: [number, number, number];
    /** ANSI 256-color code */
    ansi256: number;
}

/**
 * Apple II 16-color lo-res palette mapped to ANSI 256 colors.
 */
export const LORES_COLORS: readonly LoResColor[] = [
    { rgb: [THEME_BG_R, THEME_BG_G, THEME_BG_B], ansi256: ANSI_BLACK }, // 0: Black (theme bg)
    { rgb: [227, 30, 96], ansi256: 197 }, // 1: Magenta
    { rgb: [96, 78, 189], ansi256: 63 }, // 2: Dark Blue
    { rgb: [255, 68, 253], ansi256: 207 }, // 3: Purple (Violet)
    { rgb: [0, 163, 96], ansi256: 35 }, // 4: Dark Green
    { rgb: [156, 156, 156], ansi256: 248 }, // 5: Gray 1
    { rgb: [20, 207, 253], ansi256: 45 }, // 6: Medium Blue
    { rgb: [208, 195, 255], ansi256: 189 }, // 7: Light Blue
    { rgb: [96, 114, 3], ansi256: 100 }, // 8: Brown
    { rgb: [255, 106, 60], ansi256: 209 }, // 9: Orange
    { rgb: [156, 156, 156], ansi256: 248 }, // 10: Gray 2
    { rgb: [255, 160, 208], ansi256: 218 }, // 11: Pink
    { rgb: [20, 245, 60], ansi256: 46 }, // 12: Light Green
    { rgb: [208, 221, 141], ansi256: 186 }, // 13: Yellow
    { rgb: [114, 255, 208], ansi256: 122 }, // 14: Aqua
    { rgb: [255, 255, 255], ansi256: 231 }, // 15: White
];

/**
 * Get ANSI 256-color code for a lo-res color index.
 *
 * @param colorIndex - Apple II color index (0-15)
 * @returns ANSI 256-color code
 */
export function getAnsi256Color(colorIndex: number): number {
    const index = colorIndex & 0x0f; // Mask to 4 bits
    return LORES_COLORS[index].ansi256;
}

/** Upper half-block character (top pixel foreground, bottom pixel background) */
const UPPER_HALF_BLOCK = '\u2580';

/** Lower half-block character (bottom pixel foreground, top pixel background) */
const LOWER_HALF_BLOCK = '\u2584';

/** Full block character (single color) */
const FULL_BLOCK = '\u2588';

/** Lo-res color 0 (black) */
const LORES_BLACK = 0;

/**
 * Render a lo-res cell (2 vertical pixels) as an ANSI-colored string.
 *
 * Uses Unicode half-block characters with special handling for black pixels
 * to ensure consistent background color matching the theme (#0D0D0D):
 * - Both black: space with explicit 24-bit theme background
 * - Top black, bottom colored: lower half-block with theme bg
 * - Top colored, bottom black: upper half-block with theme bg
 * - Same non-black color: full block with both fg and bg set
 * - Different non-black colors: upper half-block with fg=top, bg=bottom
 *
 * @param topColor - Top pixel color index (0-15)
 * @param bottomColor - Bottom pixel color index (0-15)
 * @returns ANSI escape sequence string
 */
export function renderLoResCell(topColor: number, bottomColor: number): string {
    const topIsBlack = topColor === LORES_BLACK;
    const bottomIsBlack = bottomColor === LORES_BLACK;

    // Both black: space with explicit theme background color
    // Uses 24-bit color to exactly match theme's #0D0D0D
    if (topIsBlack && bottomIsBlack) {
        return `${THEME_BG_ANSI} \x1b[0m`;
    }

    // Top black, bottom colored: use lower half-block (▄)
    // Bottom half is foreground color, top half is theme background
    if (topIsBlack) {
        const bottomAnsi = getAnsi256Color(bottomColor);
        return `\x1b[38;5;${bottomAnsi}m${THEME_BG_ANSI}${LOWER_HALF_BLOCK}\x1b[0m`;
    }

    // Top colored, bottom black: use upper half-block (▀)
    // Top half is foreground color, bottom half is theme background
    if (bottomIsBlack) {
        const topAnsi = getAnsi256Color(topColor);
        return `\x1b[38;5;${topAnsi}m${THEME_BG_ANSI}${UPPER_HALF_BLOCK}\x1b[0m`;
    }

    // Both non-black
    const topAnsi = getAnsi256Color(topColor);
    const bottomAnsi = getAnsi256Color(bottomColor);

    if (topColor === bottomColor) {
        // Same color: full block with both fg and bg set
        return `\x1b[38;5;${topAnsi};48;5;${topAnsi}m${FULL_BLOCK}\x1b[0m`;
    }

    // Different colors: upper half-block with fg=top, bg=bottom
    return `\x1b[38;5;${topAnsi};48;5;${bottomAnsi}m${UPPER_HALF_BLOCK}\x1b[0m`;
}
