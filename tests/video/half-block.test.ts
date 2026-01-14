import { describe, it, expect } from 'vitest';
import { renderHalfBlockCell } from '../../src/video/half-block.js';
import { RGB } from '../../src/video/types.js';

describe('Half Block Characters', () => {
    describe('renderHalfBlockCell', () => {
        const white: RGB = { r: 255, g: 255, b: 255 };
        const black: RGB = { r: 0, g: 0, b: 0 };
        const red: RGB = { r: 255, g: 0, b: 0 };
        const blue: RGB = { r: 0, g: 0, b: 255 };

        it('should include ANSI escape codes', () => {
            const cell = renderHalfBlockCell(white, black);
            expect(cell).toContain('\x1b[');
            expect(cell).toContain('m');
        });

        it('should include reset code', () => {
            const cell = renderHalfBlockCell(white, black);
            expect(cell).toContain('\x1b[0m');
        });

        it('should render full block when colors match', () => {
            const cell = renderHalfBlockCell(white, white);
            expect(cell).toContain('█');
        });

        it('should render upper half when top differs from bottom', () => {
            const cell = renderHalfBlockCell(white, black);
            expect(cell).toContain('▀');
        });

        it('should use top color as foreground for upper half', () => {
            const cell = renderHalfBlockCell(red, black);
            // Red in ANSI 256: 16 + 36*5 + 6*0 + 0 = 196
            expect(cell).toContain('38;5;196');
        });

        it('should use bottom color as background for upper half', () => {
            const cell = renderHalfBlockCell(red, blue);
            // Blue in ANSI 256: 16 + 36*0 + 6*0 + 5 = 21
            expect(cell).toContain('48;5;21');
        });

        it('should render space with background when both black', () => {
            const cell = renderHalfBlockCell(black, black);
            expect(cell).toContain(' ');
        });
    });
});
