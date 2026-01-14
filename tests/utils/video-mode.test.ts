import { describe, it, expect } from 'vitest';
import {
    deriveVideoMode,
    deriveTextPage,
    isTerminalTooSmall,
    getMinTerminalSize,
} from '../../src/utils/video-mode.js';
import { VideoMode, VideoState } from '../../src/emulator/types.js';
import { TERMINAL } from '../../src/emulator/constants.js';

describe('video-mode utilities', () => {
    describe('deriveVideoMode', () => {
        it('should return TEXT when textMode is true', () => {
            const state: VideoState = {
                textMode: true,
                hiresMode: false,
                mixedMode: false,
                page2: false,
            };

            expect(deriveVideoMode(state)).toBe(VideoMode.TEXT);
        });

        it('should return TEXT when textMode is true even if other modes are set', () => {
            // Text mode takes precedence over all other modes
            const state: VideoState = {
                textMode: true,
                hiresMode: true,
                mixedMode: true,
                page2: false,
            };

            expect(deriveVideoMode(state)).toBe(VideoMode.TEXT);
        });

        it('should return MIXED when mixedMode is true and textMode is false', () => {
            const state: VideoState = {
                textMode: false,
                hiresMode: false,
                mixedMode: true,
                page2: false,
            };

            expect(deriveVideoMode(state)).toBe(VideoMode.MIXED);
        });

        it('should return MIXED when mixedMode and hiresMode are both true', () => {
            // Mixed mode takes precedence over hires
            const state: VideoState = {
                textMode: false,
                hiresMode: true,
                mixedMode: true,
                page2: false,
            };

            expect(deriveVideoMode(state)).toBe(VideoMode.MIXED);
        });

        it('should return HIRES when hiresMode is true and text/mixed are false', () => {
            const state: VideoState = {
                textMode: false,
                hiresMode: true,
                mixedMode: false,
                page2: false,
            };

            expect(deriveVideoMode(state)).toBe(VideoMode.HIRES);
        });

        it('should return LORES as default when no modes are set', () => {
            const state: VideoState = {
                textMode: false,
                hiresMode: false,
                mixedMode: false,
                page2: false,
            };

            expect(deriveVideoMode(state)).toBe(VideoMode.LORES);
        });
    });

    describe('deriveTextPage', () => {
        it('should return 1 when page2 is false', () => {
            const state: VideoState = {
                textMode: true,
                hiresMode: false,
                mixedMode: false,
                page2: false,
            };

            expect(deriveTextPage(state)).toBe(1);
        });

        it('should return 2 when page2 is true', () => {
            const state: VideoState = {
                textMode: true,
                hiresMode: false,
                mixedMode: false,
                page2: true,
            };

            expect(deriveTextPage(state)).toBe(2);
        });
    });

    describe('isTerminalTooSmall', () => {
        describe('text mode', () => {
            const textModeState: VideoState = {
                textMode: true,
                hiresMode: false,
                mixedMode: false,
                page2: false,
            };

            it('should return false when terminal meets minimum requirements', () => {
                const terminalSize = {
                    columns: TERMINAL.TEXT_MIN_COLUMNS,
                    rows: TERMINAL.TEXT_MIN_ROWS,
                };

                expect(isTerminalTooSmall(terminalSize, textModeState)).toBe(false);
            });

            it('should return false when terminal exceeds minimum requirements', () => {
                const terminalSize = {
                    columns: TERMINAL.TEXT_MIN_COLUMNS + 10,
                    rows: TERMINAL.TEXT_MIN_ROWS + 10,
                };

                expect(isTerminalTooSmall(terminalSize, textModeState)).toBe(false);
            });

            it('should return true when columns are too small', () => {
                const terminalSize = {
                    columns: TERMINAL.TEXT_MIN_COLUMNS - 1,
                    rows: TERMINAL.TEXT_MIN_ROWS,
                };

                expect(isTerminalTooSmall(terminalSize, textModeState)).toBe(true);
            });

            it('should return true when rows are too small', () => {
                const terminalSize = {
                    columns: TERMINAL.TEXT_MIN_COLUMNS,
                    rows: TERMINAL.TEXT_MIN_ROWS - 1,
                };

                expect(isTerminalTooSmall(terminalSize, textModeState)).toBe(true);
            });
        });

        describe('hires mode', () => {
            const hiresModeState: VideoState = {
                textMode: false,
                hiresMode: true,
                mixedMode: false,
                page2: false,
            };

            it('should return false when terminal meets hires minimum requirements', () => {
                const terminalSize = {
                    columns: TERMINAL.HIRES_MIN_COLUMNS,
                    rows: TERMINAL.HIRES_MIN_ROWS,
                };

                expect(isTerminalTooSmall(terminalSize, hiresModeState)).toBe(false);
            });

            it('should return true when columns are too small for hires', () => {
                const terminalSize = {
                    columns: TERMINAL.HIRES_MIN_COLUMNS - 1,
                    rows: TERMINAL.HIRES_MIN_ROWS,
                };

                expect(isTerminalTooSmall(terminalSize, hiresModeState)).toBe(true);
            });

            it('should return true when rows are too small for hires', () => {
                const terminalSize = {
                    columns: TERMINAL.HIRES_MIN_COLUMNS,
                    rows: TERMINAL.HIRES_MIN_ROWS - 1,
                };

                expect(isTerminalTooSmall(terminalSize, hiresModeState)).toBe(true);
            });
        });

        describe('text mode overrides hires requirement', () => {
            it('should use text mode requirements when textMode is true even with hiresMode', () => {
                const state: VideoState = {
                    textMode: true,
                    hiresMode: true, // This should be ignored because textMode is true
                    mixedMode: false,
                    page2: false,
                };

                // Terminal that's big enough for text but not for hires
                const terminalSize = {
                    columns: TERMINAL.TEXT_MIN_COLUMNS,
                    rows: TERMINAL.TEXT_MIN_ROWS,
                };

                expect(isTerminalTooSmall(terminalSize, state)).toBe(false);
            });
        });
    });

    describe('getMinTerminalSize', () => {
        it('should return text mode dimensions for text mode', () => {
            const state: VideoState = {
                textMode: true,
                hiresMode: false,
                mixedMode: false,
                page2: false,
            };

            const result = getMinTerminalSize(state);

            expect(result.columns).toBe(TERMINAL.TEXT_MIN_COLUMNS);
            expect(result.rows).toBe(TERMINAL.TEXT_MIN_ROWS);
        });

        it('should return hires mode dimensions for hires mode', () => {
            const state: VideoState = {
                textMode: false,
                hiresMode: true,
                mixedMode: false,
                page2: false,
            };

            const result = getMinTerminalSize(state);

            expect(result.columns).toBe(TERMINAL.HIRES_MIN_COLUMNS);
            expect(result.rows).toBe(TERMINAL.HIRES_MIN_ROWS);
        });

        it('should return text mode dimensions when textMode overrides hiresMode', () => {
            const state: VideoState = {
                textMode: true,
                hiresMode: true,
                mixedMode: false,
                page2: false,
            };

            const result = getMinTerminalSize(state);

            expect(result.columns).toBe(TERMINAL.TEXT_MIN_COLUMNS);
            expect(result.rows).toBe(TERMINAL.TEXT_MIN_ROWS);
        });

        it('should return text mode dimensions for lores mode', () => {
            const state: VideoState = {
                textMode: false,
                hiresMode: false,
                mixedMode: false,
                page2: false,
            };

            const result = getMinTerminalSize(state);

            expect(result.columns).toBe(TERMINAL.TEXT_MIN_COLUMNS);
            expect(result.rows).toBe(TERMINAL.TEXT_MIN_ROWS);
        });
    });
});
