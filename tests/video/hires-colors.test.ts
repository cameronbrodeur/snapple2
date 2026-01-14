import { describe, it, expect } from 'vitest';
import { HIRES_PALETTE, HiResColor, getColorDef } from '../../src/video/hires-colors.js';
import { THEME_BG_R, THEME_BG_G, THEME_BG_B } from '../../src/video/ansi-colors.js';

describe('Hi-Res Colors', () => {
    describe('HIRES_PALETTE', () => {
        it('should define 6 hi-res colors', () => {
            expect(Object.keys(HIRES_PALETTE)).toHaveLength(6);
        });

        it('should have black as color 0 (theme background)', () => {
            // Black uses theme background color for visual consistency
            expect(HIRES_PALETTE.BLACK.rgb).toEqual([THEME_BG_R, THEME_BG_G, THEME_BG_B]);
        });

        it('should have white as color 1', () => {
            expect(HIRES_PALETTE.WHITE.rgb).toEqual([255, 255, 255]);
        });

        it('should have purple color', () => {
            expect(HIRES_PALETTE.PURPLE.rgb).toBeDefined();
            expect(HIRES_PALETTE.PURPLE.ansi256).toBeGreaterThan(0);
        });

        it('should have green color', () => {
            expect(HIRES_PALETTE.GREEN.rgb).toBeDefined();
        });

        it('should have blue color', () => {
            expect(HIRES_PALETTE.BLUE.rgb).toBeDefined();
        });

        it('should have orange color', () => {
            expect(HIRES_PALETTE.ORANGE.rgb).toBeDefined();
        });
    });

    describe('getColorDef', () => {
        it('should return black for HiResColor.BLACK', () => {
            const def = getColorDef(HiResColor.BLACK);
            // Black uses theme background color for visual consistency
            expect(def.rgb).toEqual([THEME_BG_R, THEME_BG_G, THEME_BG_B]);
        });

        it('should return white for HiResColor.WHITE', () => {
            const def = getColorDef(HiResColor.WHITE);
            expect(def.rgb).toEqual([255, 255, 255]);
        });
    });
});
