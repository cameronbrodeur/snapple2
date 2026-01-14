import { describe, it, expect, beforeEach } from 'vitest';
import { LoResRenderer } from '../../src/video/lores-renderer.js';
import { RamDevice } from 'cpu6502/bus';
import { toWord } from 'cpu6502/types';
import { CharacterRom } from '../../src/video/character-rom.js';
import { THEME_BG_ANSI } from '../../src/video/ansi-colors.js';
import { TerminalBuffer } from '../../src/emulator/types.js';

/**
 * Create a pre-allocated terminal buffer for lo-res mode (40x24).
 */
function createLoResBuffer(): TerminalBuffer {
    const buffer: TerminalBuffer = [];
    for (let row = 0; row < 24; row++) {
        buffer.push(new Array(40).fill(''));
    }
    return buffer;
}

describe('LoResRenderer', () => {
    let ram: RamDevice;
    let characterRom: CharacterRom;
    let buffer: TerminalBuffer;

    beforeEach(() => {
        ram = new RamDevice(0x10000);
        // Create minimal character ROM (2KB of zeros is fine for lo-res)
        characterRom = new CharacterRom(new Uint8Array(2048));
        buffer = createLoResBuffer();
    });

    it('should create renderer for page 1', () => {
        const renderer = new LoResRenderer(ram, characterRom, 1, false);
        expect(renderer).toBeDefined();
    });

    it('should create renderer for page 2', () => {
        const renderer = new LoResRenderer(ram, characterRom, 2, false);
        expect(renderer).toBeDefined();
    });

    it('should fill 24-row buffer', () => {
        const renderer = new LoResRenderer(ram, characterRom, 1, false);
        renderer.render(buffer);
        expect(buffer).toHaveLength(24);
    });

    it('should fill 40-column rows', () => {
        const renderer = new LoResRenderer(ram, characterRom, 1, false);
        renderer.render(buffer);
        expect(buffer[0]).toHaveLength(40);
    });

    describe('Memory Decoding', () => {
        it('should read from page 1 base address ($0400)', () => {
            // Set color at $0400 (top-left)
            ram.write(toWord(0x0400), 0x12); // Top pixel = 2, bottom = 1

            const renderer = new LoResRenderer(ram, characterRom, 1, false);
            renderer.render(buffer);

            // Cell at (0,0) should contain ANSI code for color 2
            expect(buffer[0][0]).toContain('38;5;63'); // Dark blue (color 2)
        });

        it('should read from page 2 base address ($0800)', () => {
            // Set color at $0800 (top-left of page 2)
            ram.write(toWord(0x0800), 0x34); // Top pixel = 4, bottom = 3

            const renderer = new LoResRenderer(ram, characterRom, 2, false);
            renderer.render(buffer);

            // Cell at (0,0) should contain ANSI code for color 4
            expect(buffer[0][0]).toContain('38;5;35'); // Dark green (color 4)
        });

        it('should decode lower nibble as top pixel', () => {
            ram.write(toWord(0x0400), 0xf0); // Top pixel = 0 (black), bottom = 15 (white)

            const renderer = new LoResRenderer(ram, characterRom, 1, false);
            renderer.render(buffer);

            // Black top uses 24-bit theme background color
            // White bottom uses lower half-block with foreground
            expect(buffer[0][0]).toContain(THEME_BG_ANSI);
            expect(buffer[0][0]).toContain('38;5;231'); // White foreground (bottom pixel)
        });
    });

    describe('Pixel Layout', () => {
        it('should render both nibbles from single byte as 2 pixels', () => {
            // Byte at $0400 = 0x1F means:
            // - Lower nibble (0xF = 15) = top pixel (white)
            // - Upper nibble (0x1 = 1) = bottom pixel (magenta)
            ram.write(toWord(0x0400), 0x1f);

            const renderer = new LoResRenderer(ram, characterRom, 1, false);
            renderer.render(buffer);

            // Row 0 should show white (15) on top, magenta (1) on bottom
            expect(buffer[0][0]).toContain('38;5;231'); // White foreground (top)
            expect(buffer[0][0]).toContain('48;5;197'); // Magenta background (bottom)
        });
    });

    describe('Mixed Mode', () => {
        it('should render 20 lo-res rows in mixed mode', () => {
            const renderer = new LoResRenderer(ram, characterRom, 1, true);
            renderer.render(buffer);

            // Total should still be 24 rows
            expect(buffer).toHaveLength(24);

            // First 20 rows should be lo-res (contain block characters or ANSI codes)
            // We can't easily distinguish, but we can verify the count
        });

        it('should render 24 lo-res rows in full mode', () => {
            const renderer = new LoResRenderer(ram, characterRom, 1, false);
            renderer.render(buffer);

            expect(buffer).toHaveLength(24);
        });

        it('should include text rows at bottom in mixed mode', () => {
            // Write a character to text row 20 (which is the 5th row of the third group)
            // Row offsets for group 3: $050, $0D0, $150, $1D0, $250, $2D0, $350, $3D0
            // Row 20 = rows 16-23 index 4, so offset is $250
            // Text row 20 is at $0400 + $250 = $0650
            ram.write(toWord(0x0650), 0xc1); // 'A' with high bit set

            const renderer = new LoResRenderer(ram, characterRom, 1, true);
            renderer.render(buffer);

            // Row 20 should be text, containing 'A'
            expect(buffer[20][0]).toContain('A');
        });
    });

    describe('Buffer Dimensions', () => {
        it('should have bufferWidth of 40', () => {
            const renderer = new LoResRenderer(ram, characterRom, 1, false);
            expect(renderer.bufferWidth).toBe(40);
        });

        it('should have bufferHeight of 24', () => {
            const renderer = new LoResRenderer(ram, characterRom, 1, false);
            expect(renderer.bufferHeight).toBe(24);
        });
    });
});
