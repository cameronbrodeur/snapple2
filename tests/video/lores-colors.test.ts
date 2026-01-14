import { describe, it, expect } from 'vitest';
import { LORES_COLORS, getAnsi256Color, renderLoResCell } from '../../src/video/lores-colors.js';
import { THEME_BG_ANSI } from '../../src/video/ansi-colors.js';

describe('Lo-Res Colors', () => {
    it('should define all 16 Apple II colors', () => {
        expect(LORES_COLORS).toHaveLength(16);
    });

    it('should map black (0) to ANSI 16', () => {
        expect(getAnsi256Color(0)).toBe(16);
    });

    it('should map white (15) to ANSI 231', () => {
        expect(getAnsi256Color(15)).toBe(231);
    });

    it('should handle all color indices 0-15', () => {
        for (let i = 0; i < 16; i++) {
            const color = getAnsi256Color(i);
            expect(color).toBeGreaterThanOrEqual(0);
            expect(color).toBeLessThanOrEqual(255);
        }
    });
});

describe('renderLoResCell', () => {
    it('should use space with theme background when both pixels black', () => {
        const cell = renderLoResCell(0, 0); // Both black
        // Black uses 24-bit theme background color (space, not full block)
        expect(cell).toContain(THEME_BG_ANSI);
        expect(cell).toContain(' '); // Space character
        expect(cell).not.toContain('\u2588'); // Not full block
    });

    it('should use full block when both pixels same non-black color', () => {
        const cell = renderLoResCell(15, 15); // Both white
        expect(cell).toContain('\u2588');
    });

    it('should use lower half-block when top black, bottom colored', () => {
        const cell = renderLoResCell(0, 15); // Black top, white bottom
        // Uses lower half-block (▄) with theme background
        expect(cell).toContain('\u2584');
        expect(cell).toContain(THEME_BG_ANSI);
    });

    it('should set foreground to top pixel color', () => {
        const cell = renderLoResCell(15, 0); // White top (231), black bottom
        expect(cell).toContain('38;5;231'); // Foreground white
    });

    it('should set background to bottom pixel color (non-black)', () => {
        // When neither pixel is black, background is the bottom pixel color
        const cell = renderLoResCell(1, 15); // Magenta top, white bottom (231)
        expect(cell).toContain('48;5;231'); // Background white
    });

    it('should use theme background when top pixel is black', () => {
        const cell = renderLoResCell(0, 15); // Black top, white bottom
        // Black uses 24-bit theme background, not ANSI 256 color
        expect(cell).toContain(THEME_BG_ANSI);
        expect(cell).toContain('38;5;231'); // White foreground (bottom pixel)
    });

    it('should include reset code', () => {
        const cell = renderLoResCell(5, 10);
        expect(cell).toContain('\x1b[0m');
    });
});
