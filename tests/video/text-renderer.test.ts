/**
 * Text Renderer Unit Tests
 *
 * Tests for TextModeRenderer address computation and character conversion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RamDevice } from 'cpu6502/bus';
import { toWord, toByte } from 'cpu6502/types';
import { TextModeRenderer } from '../../src/video/text-renderer.js';
import { CharacterRom } from '../../src/video/character-rom.js';
import { TerminalBuffer } from '../../src/emulator/types.js';

/**
 * Create a pre-allocated terminal buffer for text mode (40x24).
 */
function createTextBuffer(): TerminalBuffer {
    const buffer: TerminalBuffer = [];
    for (let row = 0; row < 24; row++) {
        buffer.push(new Array(40).fill(''));
    }
    return buffer;
}

describe('TextModeRenderer', () => {
    let ram: RamDevice;
    let characterRom: CharacterRom;
    let renderer: TextModeRenderer;
    let buffer: TerminalBuffer;

    beforeEach(() => {
        // Create RAM and character ROM
        ram = new RamDevice({ size: 0xc000 }); // 48KB
        const romData = new Uint8Array(2048).fill(0);
        characterRom = new CharacterRom(romData);
        buffer = createTextBuffer();
    });

    describe('Address Computation (Page 1)', () => {
        beforeEach(() => {
            renderer = new TextModeRenderer(ram, characterRom, 1);
        });

        it('should compute correct address for row 0, col 0', () => {
            expect(renderer.getAddress(0, 0)).toBe(0x0400);
        });

        it('should compute correct address for row 0, col 39', () => {
            expect(renderer.getAddress(0, 39)).toBe(0x0427);
        });

        it('should compute correct address for row 1, col 0', () => {
            expect(renderer.getAddress(1, 0)).toBe(0x0480);
        });

        it('should compute correct address for row 8, col 0', () => {
            expect(renderer.getAddress(8, 0)).toBe(0x0428);
        });

        it('should compute correct address for row 16, col 0', () => {
            expect(renderer.getAddress(16, 0)).toBe(0x0450);
        });

        it('should compute correct address for row 23, col 39', () => {
            expect(renderer.getAddress(23, 39)).toBe(0x07f7);
        });

        it('should compute all 960 addresses within page 1 range', () => {
            for (let row = 0; row < 24; row++) {
                for (let col = 0; col < 40; col++) {
                    const addr = renderer.getAddress(row, col);
                    expect(addr).toBeGreaterThanOrEqual(0x0400);
                    expect(addr).toBeLessThan(0x0800);
                }
            }
        });

        it('should throw error for invalid row', () => {
            expect(() => renderer.getAddress(-1, 0)).toThrow();
            expect(() => renderer.getAddress(24, 0)).toThrow();
        });

        it('should throw error for invalid column', () => {
            expect(() => renderer.getAddress(0, -1)).toThrow();
            expect(() => renderer.getAddress(0, 40)).toThrow();
        });
    });

    describe('Address Computation (Page 2)', () => {
        beforeEach(() => {
            renderer = new TextModeRenderer(ram, characterRom, 2);
        });

        it('should compute correct address for row 0, col 0', () => {
            expect(renderer.getAddress(0, 0)).toBe(0x0800);
        });

        it('should compute correct address for row 23, col 39', () => {
            expect(renderer.getAddress(23, 39)).toBe(0x0bf7);
        });

        it('should compute all 960 addresses within page 2 range', () => {
            for (let row = 0; row < 24; row++) {
                for (let col = 0; col < 40; col++) {
                    const addr = renderer.getAddress(row, col);
                    expect(addr).toBeGreaterThanOrEqual(0x0800);
                    expect(addr).toBeLessThan(0x0c00);
                }
            }
        });
    });

    describe('Rendering', () => {
        beforeEach(() => {
            renderer = new TextModeRenderer(ram, characterRom, 1);
        });

        it('should render empty buffer when memory is zeroed', () => {
            renderer.render(buffer);

            expect(buffer).toHaveLength(24);
            expect(buffer[0]).toHaveLength(40);

            // Memory contains $00 everywhere, which is inverse mode ($00-$3F)
            // All cells should be inverse '@' (ANSI inverse styling)
            for (let row = 0; row < 24; row++) {
                for (let col = 0; col < 40; col++) {
                    expect(buffer[row][col]).toBe('\x1b[7m@\x1b[27m');
                }
            }
        });

        it('should render ASCII characters correctly', () => {
            // Write "HELLO" to first row (using normal ASCII $C8-$CF)
            ram.write(toWord(0x0400), toByte(0xc8)); // H
            ram.write(toWord(0x0401), toByte(0xc5)); // E
            ram.write(toWord(0x0402), toByte(0xcc)); // L
            ram.write(toWord(0x0403), toByte(0xcc)); // L
            ram.write(toWord(0x0404), toByte(0xcf)); // O

            renderer.render(buffer);

            // Normal mode characters ($80-$FF) display without inverse video
            expect(buffer[0][0]).toBe('H');
            expect(buffer[0][1]).toBe('E');
            expect(buffer[0][2]).toBe('L');
            expect(buffer[0][3]).toBe('L');
            expect(buffer[0][4]).toBe('O');
        });

        it('should render spaces correctly', () => {
            // Write space ($A0) - normal mode
            ram.write(toWord(0x0400), toByte(0xa0));

            renderer.render(buffer);
            // Normal mode space displays without inverse video
            expect(buffer[0][0]).toBe(' ');
        });

        it('should handle all rows', () => {
            // Write 'A' ($C1) to first column of each row
            const addresses = [
                0x0400,
                0x0480,
                0x0500,
                0x0580,
                0x0600,
                0x0680,
                0x0700,
                0x0780, // 0-7
                0x0428,
                0x04a8,
                0x0528,
                0x05a8,
                0x0628,
                0x06a8,
                0x0728,
                0x07a8, // 8-15
                0x0450,
                0x04d0,
                0x0550,
                0x05d0,
                0x0650,
                0x06d0,
                0x0750,
                0x07d0, // 16-23
            ];

            for (const addr of addresses) {
                ram.write(toWord(addr), toByte(0xc1)); // 'A' - normal mode
            }

            renderer.render(buffer);

            // All normal mode characters display without inverse video
            for (let row = 0; row < 24; row++) {
                expect(buffer[row][0]).toBe('A');
            }
        });

        it('should render entire buffer correctly', () => {
            renderer.render(buffer);

            expect(buffer).toHaveLength(24);
            for (const row of buffer) {
                expect(row).toHaveLength(40);
            }
        });
    });

    describe('Performance', () => {
        beforeEach(() => {
            renderer = new TextModeRenderer(ram, characterRom, 1);
        });

        it('should render buffer quickly (< 5ms for 100 renders)', () => {
            const start = performance.now();

            for (let i = 0; i < 100; i++) {
                renderer.render(buffer);
            }

            const elapsed = performance.now() - start;
            const avgTime = elapsed / 100;

            expect(avgTime).toBeLessThan(5); // Should average < 5ms per render
        });
    });

    describe('Buffer Dimensions', () => {
        beforeEach(() => {
            renderer = new TextModeRenderer(ram, characterRom, 1);
        });

        it('should have bufferWidth of 40', () => {
            expect(renderer.bufferWidth).toBe(40);
        });

        it('should have bufferHeight of 24', () => {
            expect(renderer.bufferHeight).toBe(24);
        });
    });
});
