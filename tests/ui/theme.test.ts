import { describe, it, expect } from 'vitest';
import {
    Theme,
    GreenTheme,
    AmberTheme,
    WhiteTheme,
    BlueTheme,
    DefaultTheme,
} from '../../src/ui/common/index.js';
import { Palette, Semantic, Terminal, ThemeColors } from '../../src/shared/colors.js';

describe('Theme Definitions', () => {
    const allThemes: Theme[] = [GreenTheme, AmberTheme, WhiteTheme, BlueTheme];

    describe('Theme interface compliance', () => {
        it.each([
            ['GreenTheme', GreenTheme],
            ['AmberTheme', AmberTheme],
            ['WhiteTheme', WhiteTheme],
            ['BlueTheme', BlueTheme],
        ])('%s should have all required properties', (_, theme) => {
            // name
            expect(theme.name).toBeDefined();
            expect(typeof theme.name).toBe('string');

            // screen
            expect(theme.screen).toBeDefined();
            expect(theme.screen.background).toBeDefined();
            expect(theme.screen.foreground).toBeDefined();
            expect(theme.screen.borderColor).toBeDefined();
            expect(theme.screen.borderStyle).toBeDefined();

            // status
            expect(theme.status).toBeDefined();
            expect(theme.status.foreground).toBeDefined();
            expect(theme.status.inverseText).toBeDefined();
            expect(theme.status.running).toBeDefined();
            expect(theme.status.paused).toBeDefined();
            expect(theme.status.dimColor).toBeDefined();

            // accent
            expect(theme.accent).toBeDefined();
            expect(theme.accent.background).toBeDefined();
            expect(theme.accent.borderColor).toBeDefined();
            expect(theme.accent.titleColor).toBeDefined();
            expect(theme.accent.keyColor).toBeDefined();
            expect(theme.accent.descColor).toBeDefined();

            // error
            expect(theme.error).toBeDefined();
        });
    });

    describe('Shared base properties', () => {
        it('all themes should share the same screen background', () => {
            for (const theme of allThemes) {
                expect(theme.screen.background).toBe(Semantic.background);
            }
        });

        it('all themes should share the same border style (round)', () => {
            for (const theme of allThemes) {
                expect(theme.screen.borderStyle).toBe('round');
            }
        });

        it('all themes should share the same border color', () => {
            for (const theme of allThemes) {
                expect(theme.screen.borderColor).toBe(Palette.gray.dim);
            }
        });

        it('all themes should share the same status colors', () => {
            for (const theme of allThemes) {
                expect(theme.status.foreground).toBe(Palette.white.base);
                expect(theme.status.inverseText).toBe(Palette.black.base);
                expect(theme.status.running).toBe(Palette.green.bright);
                expect(theme.status.paused).toBe(Palette.orange.bright);
                expect(theme.status.dimColor).toBe(Palette.gray.base);
            }
        });

        it('all themes should share the same error color', () => {
            for (const theme of allThemes) {
                expect(theme.error).toBe(Semantic.error);
            }
        });

        it('all themes should share the same accent background', () => {
            for (const theme of allThemes) {
                expect(theme.accent.background).toBe(Semantic.background);
            }
        });

        it('all themes should share the same accent description color', () => {
            for (const theme of allThemes) {
                expect(theme.accent.descColor).toBe(Palette.white.dim);
            }
        });
    });

    describe('GreenTheme', () => {
        it('should have name "green"', () => {
            expect(GreenTheme.name).toBe('green');
        });

        it('should use Terminal.green for screen foreground', () => {
            expect(GreenTheme.screen.foreground).toBe(Terminal.green);
        });

        it('should use green ThemeColors for accent colors', () => {
            expect(GreenTheme.accent.borderColor).toBe(ThemeColors.green.primary);
            expect(GreenTheme.accent.titleColor).toBe(ThemeColors.green.primaryBright);
            expect(GreenTheme.accent.keyColor).toBe(ThemeColors.green.primaryBright);
        });
    });

    describe('AmberTheme', () => {
        it('should have name "amber"', () => {
            expect(AmberTheme.name).toBe('amber');
        });

        it('should use Terminal.amber for screen foreground', () => {
            expect(AmberTheme.screen.foreground).toBe(Terminal.amber);
        });

        it('should use amber ThemeColors for accent colors', () => {
            expect(AmberTheme.accent.borderColor).toBe(ThemeColors.amber.primary);
            expect(AmberTheme.accent.titleColor).toBe(ThemeColors.amber.primaryBright);
            expect(AmberTheme.accent.keyColor).toBe(ThemeColors.amber.primaryBright);
        });
    });

    describe('WhiteTheme', () => {
        it('should have name "white"', () => {
            expect(WhiteTheme.name).toBe('white');
        });

        it('should use Terminal.white for screen foreground', () => {
            expect(WhiteTheme.screen.foreground).toBe(Terminal.white);
        });

        it('should use white ThemeColors for accent colors', () => {
            expect(WhiteTheme.accent.borderColor).toBe(ThemeColors.white.primary);
            expect(WhiteTheme.accent.titleColor).toBe(ThemeColors.white.primaryBright);
            expect(WhiteTheme.accent.keyColor).toBe(ThemeColors.white.primaryBright);
        });
    });

    describe('BlueTheme', () => {
        it('should have name "blue"', () => {
            expect(BlueTheme.name).toBe('blue');
        });

        it('should use Terminal.blue for screen foreground', () => {
            expect(BlueTheme.screen.foreground).toBe(Terminal.blue);
        });

        it('should use blue ThemeColors for accent colors', () => {
            expect(BlueTheme.accent.borderColor).toBe(ThemeColors.blue.primary);
            expect(BlueTheme.accent.titleColor).toBe(ThemeColors.blue.primaryBright);
            expect(BlueTheme.accent.keyColor).toBe(ThemeColors.blue.primaryBright);
        });
    });

    describe('DefaultTheme', () => {
        it('should be GreenTheme', () => {
            expect(DefaultTheme).toBe(GreenTheme);
        });
    });

    describe('Theme uniqueness', () => {
        it('each theme should have a unique name', () => {
            const names = allThemes.map((t) => t.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(allThemes.length);
        });

        it('each theme should have a unique screen foreground color', () => {
            const foregrounds = allThemes.map((t) => t.screen.foreground);
            const uniqueForegrounds = new Set(foregrounds);
            expect(uniqueForegrounds.size).toBe(allThemes.length);
        });
    });
});
