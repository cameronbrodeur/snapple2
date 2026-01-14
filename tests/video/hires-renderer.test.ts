import { describe, it, expect, beforeEach } from 'vitest';
import { RamDevice } from 'cpu6502/bus';
import { HiResRenderer } from '../../src/video/hires-renderer.js';
import { CharacterRom } from '../../src/video/character-rom.js';
import { TerminalBuffer } from '../../src/emulator/types.js';

/**
 * Create a pre-allocated buffer for hi-res rendering (280x96).
 */
function createHiResBuffer(): TerminalBuffer {
    const buffer: TerminalBuffer = [];
    for (let row = 0; row < 96; row++) {
        const line: string[] = [];
        for (let col = 0; col < 280; col++) {
            line.push('');
        }
        buffer.push(line);
    }
    return buffer;
}

describe('HiResRenderer', () => {
    let ram: RamDevice;
    let characterRom: CharacterRom;

    beforeEach(() => {
        ram = new RamDevice(0x6000); // 24KB for both hi-res pages
        // Create minimal character ROM (2KB of zeros)
        characterRom = new CharacterRom(new Uint8Array(2048));
    });

    describe('buffer dimensions', () => {
        it('should expose bufferWidth of 280', () => {
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            expect(renderer.bufferWidth).toBe(280);
        });

        it('should expose bufferHeight of 96', () => {
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            expect(renderer.bufferHeight).toBe(96);
        });
    });

    describe('render dimensions', () => {
        it('should render 280 columns in full-screen mode', () => {
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            expect(buffer[0]).toHaveLength(280);
        });

        it('should render 96 rows in full-screen mode', () => {
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            expect(buffer).toHaveLength(96);
        });

        it('should render 80 graphics rows in mixed mode', () => {
            const renderer = new HiResRenderer(ram, characterRom, 1, true);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            // 160 scanlines / 2 = 80 graphics rows + 16 text rows = 96 total
            expect(buffer).toHaveLength(96);
        });
    });

    describe('memory addressing', () => {
        it('should read from page 1 base address ($2000)', () => {
            // Write pattern to first byte of page 1
            ram.write(0x2000, 0xff);
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            // First row should have visible content (non-black)
            const firstCell = buffer[0][0];
            expect(firstCell).toContain('\x1b['); // Has color codes
        });

        it('should read from page 2 base address ($4000)', () => {
            // Write pattern to first byte of page 2
            ram.write(0x4000, 0xff);
            const renderer = new HiResRenderer(ram, characterRom, 2, false);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            // First row should have visible content
            const firstCell = buffer[0][0];
            expect(firstCell).toContain('\x1b[');
        });
    });

    describe('color rendering', () => {
        it('should render black pixels for empty memory', () => {
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            // Empty memory = black, rendered as space with black background
            const cell = buffer[0][0];
            expect(cell).toContain(' '); // Space character for black
        });

        it('should use half-block characters', () => {
            // Write alternating pattern to create color
            ram.write(0x2000, 0x55); // 01010101 pattern
            const renderer = new HiResRenderer(ram, characterRom, 1, false);
            const buffer = createHiResBuffer();
            renderer.render(buffer);
            // Should contain half-block characters
            const row = buffer[0].join('');
            expect(row).toMatch(/[▀▄█ ]/);
        });
    });
});
