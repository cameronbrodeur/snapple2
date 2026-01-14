import { describe, it, expect } from 'vitest';
import { Palette, Apple, Terminal, Semantic, ThemeColors } from '../../src/shared/colors.js';

describe('Color System', () => {
    describe('Palette', () => {
        it('should define 17 color families', () => {
            const colorFamilies = Object.keys(Palette);
            // 17 families: black, white, gray, red, orange, amber, yellow,
            // green, emerald, teal, cyan, blue, indigo, violet, purple, magenta, silver
            expect(colorFamilies).toHaveLength(17);
        });

        it('should have base, bright, and dim variants for each color', () => {
            const colorFamilies = Object.keys(Palette) as Array<keyof typeof Palette>;

            for (const family of colorFamilies) {
                const color = Palette[family];
                expect(color).toHaveProperty('base');
                expect(color).toHaveProperty('bright');
                expect(color).toHaveProperty('dim');
            }
        });

        it('should have valid hex color format for all values', () => {
            const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
            const colorFamilies = Object.keys(Palette) as Array<keyof typeof Palette>;

            for (const family of colorFamilies) {
                const color = Palette[family];
                expect(color.base).toMatch(hexColorRegex);
                expect(color.bright).toMatch(hexColorRegex);
                expect(color.dim).toMatch(hexColorRegex);
            }
        });

        describe('black color', () => {
            it('should have black.base as #0D0D0D', () => {
                expect(Palette.black.base).toBe('#0D0D0D');
            });

            it('should have dim variant darker than base', () => {
                // dim (#050505) should be darker than base (#0D0D0D)
                const dimValue = parseInt(Palette.black.dim.slice(1, 3), 16);
                const baseValue = parseInt(Palette.black.base.slice(1, 3), 16);
                expect(dimValue).toBeLessThan(baseValue);
            });

            it('should have bright variant lighter than base', () => {
                // bright (#1A1A1A) should be lighter than base (#0D0D0D)
                const brightValue = parseInt(Palette.black.bright.slice(1, 3), 16);
                const baseValue = parseInt(Palette.black.base.slice(1, 3), 16);
                expect(brightValue).toBeGreaterThan(baseValue);
            });
        });

        describe('white color', () => {
            it('should have white.bright as pure white #FFFFFF', () => {
                expect(Palette.white.bright).toBe('#FFFFFF');
            });
        });
    });

    describe('Apple', () => {
        it('should define 6 Apple rainbow colors', () => {
            const colors = Object.keys(Apple);
            expect(colors).toHaveLength(6);
        });

        it('should include all Apple logo colors', () => {
            expect(Apple).toHaveProperty('green');
            expect(Apple).toHaveProperty('yellow');
            expect(Apple).toHaveProperty('orange');
            expect(Apple).toHaveProperty('red');
            expect(Apple).toHaveProperty('purple');
            expect(Apple).toHaveProperty('blue');
        });

        it('should have valid hex color format for all values', () => {
            const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
            const colors = Object.values(Apple);

            for (const color of colors) {
                expect(color).toMatch(hexColorRegex);
            }
        });
    });

    describe('Terminal', () => {
        it('should define 4 terminal-friendly colors', () => {
            const colors = Object.keys(Terminal);
            expect(colors).toHaveLength(4);
        });

        it('should include phosphor green', () => {
            expect(Terminal.green).toBeDefined();
        });

        it('should include amber for amber theme', () => {
            expect(Terminal.amber).toBeDefined();
        });

        it('should have valid hex color format for all values', () => {
            const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
            const colors = Object.values(Terminal);

            for (const color of colors) {
                expect(color).toMatch(hexColorRegex);
            }
        });
    });

    describe('Semantic', () => {
        it('should define background colors', () => {
            expect(Semantic.background).toBe(Palette.black.base);
            expect(Semantic.surface).toBe(Palette.black.bright);
            expect(Semantic.dialog).toBe(Palette.gray.dim);
        });

        it('should define text colors', () => {
            expect(Semantic.foreground).toBe(Palette.white.base);
            expect(Semantic.muted).toBe(Palette.gray.base);
            expect(Semantic.subtle).toBe(Palette.gray.dim);
        });

        it('should define status colors', () => {
            expect(Semantic.success).toBe(Palette.green.base);
            expect(Semantic.warning).toBe(Palette.orange.base);
            expect(Semantic.error).toBe(Palette.red.base);
            expect(Semantic.info).toBe(Palette.blue.base);
        });

        it('should define interactive colors', () => {
            expect(Semantic.accent).toBe(Palette.green.bright);
            expect(Semantic.highlight).toBe(Palette.cyan.base);
            expect(Semantic.focus).toBe(Palette.blue.bright);
        });
    });

    describe('ThemeColors', () => {
        it('should define 4 theme color sets', () => {
            const themes = Object.keys(ThemeColors);
            expect(themes).toHaveLength(4);
        });

        it('should include green, amber, white, and blue themes', () => {
            expect(ThemeColors).toHaveProperty('green');
            expect(ThemeColors).toHaveProperty('amber');
            expect(ThemeColors).toHaveProperty('white');
            expect(ThemeColors).toHaveProperty('blue');
        });

        it('should have primary, primaryBright, and secondary for each theme', () => {
            const themes = Object.keys(ThemeColors) as Array<keyof typeof ThemeColors>;

            for (const theme of themes) {
                const colors = ThemeColors[theme];
                expect(colors).toHaveProperty('primary');
                expect(colors).toHaveProperty('primaryBright');
                expect(colors).toHaveProperty('secondary');
            }
        });

        it('should reference Palette colors correctly', () => {
            expect(ThemeColors.green.primary).toBe(Palette.green.base);
            expect(ThemeColors.green.primaryBright).toBe(Palette.green.bright);

            expect(ThemeColors.amber.primary).toBe(Palette.amber.base);
            expect(ThemeColors.amber.primaryBright).toBe(Palette.amber.bright);

            expect(ThemeColors.white.primary).toBe(Palette.white.base);
            expect(ThemeColors.white.primaryBright).toBe(Palette.white.bright);

            expect(ThemeColors.blue.primary).toBe(Palette.blue.base);
            expect(ThemeColors.blue.primaryBright).toBe(Palette.blue.bright);
        });
    });
});
