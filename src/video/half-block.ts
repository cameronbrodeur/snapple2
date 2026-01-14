/**
 * Unicode Half-Block Rendering
 *
 * Renders vertical pixel pairs using Unicode half-block characters.
 * Each terminal cell displays 2 vertical pixels (top and bottom halves).
 *
 * This provides square pixel aspect ratio in most terminal fonts.
 */

import { RGB } from './types.js';
import { rgbToAnsi256, ANSI_BLACK, THEME_BG_ANSI } from './ansi-colors.js';

/**
 * Render a vertical pixel pair as an ANSI-colored half-block character.
 *
 * Uses Unicode half-block characters with special handling for black pixels
 * to ensure consistent background color matching the theme (#0D0D0D):
 * - Both black: space with explicit 24-bit theme background
 * - Top black, bottom colored: lower half-block with theme bg
 * - Top colored, bottom black: upper half-block with theme bg
 * - Same non-black color: full block with both fg and bg set
 * - Different non-black colors: upper half-block with fg=top, bg=bottom
 *
 * @param topColor - Color for top pixel
 * @param bottomColor - Color for bottom pixel
 * @returns ANSI escape sequence string
 */
export function renderHalfBlockCell(topColor: RGB, bottomColor: RGB): string {
    const topAnsi = rgbToAnsi256(topColor.r, topColor.g, topColor.b);
    const bottomAnsi = rgbToAnsi256(bottomColor.r, bottomColor.g, bottomColor.b);

    const topIsBlack = topAnsi === ANSI_BLACK;
    const bottomIsBlack = bottomAnsi === ANSI_BLACK;

    // Both black: space with explicit theme background color
    // Uses 24-bit color to exactly match theme's #0D0D0D
    if (topIsBlack && bottomIsBlack) {
        return `${THEME_BG_ANSI} \x1b[0m`;
    }

    // Top black, bottom colored: use lower half-block (▄)
    // Bottom half is foreground color, top half is theme background
    if (topIsBlack) {
        return `\x1b[38;5;${bottomAnsi}m${THEME_BG_ANSI}▄\x1b[0m`;
    }

    // Top colored, bottom black: use upper half-block (▀)
    // Top half is foreground color, bottom half is theme background
    if (bottomIsBlack) {
        return `\x1b[38;5;${topAnsi}m${THEME_BG_ANSI}▀\x1b[0m`;
    }

    // Both non-black
    if (topAnsi === bottomAnsi) {
        // Same color: full block with both fg and bg set
        return `\x1b[38;5;${topAnsi};48;5;${topAnsi}m█\x1b[0m`;
    }

    // Different colors: upper half-block with fg=top, bg=bottom
    return `\x1b[38;5;${topAnsi};48;5;${bottomAnsi}m▀\x1b[0m`;
}
