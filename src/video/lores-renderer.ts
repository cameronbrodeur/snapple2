/**
 * Lo-Res Graphics Renderer
 *
 * Renders Apple II 40x48 lo-res graphics mode to terminal.
 */

import { RamDevice } from 'cpu6502/bus';
import { toWord } from 'cpu6502/types';
import { TerminalBuffer, TextPage } from '../emulator/types.js';
import { VIDEO } from '../emulator/constants.js';
import { VideoRenderer } from './video-renderer.js';
import { CharacterRom } from './character-rom.js';
import { TextModeRenderer } from './text-renderer.js';
import { renderLoResCell } from './lores-colors.js';
import { createTextPageAddresses } from './text-page-memory.js';

/**
 * Lo-res mode renderer.
 *
 * Renders 40x48 lo-res graphics using Unicode half-blocks.
 * Each terminal cell displays 2 vertical pixels.
 */
export class LoResRenderer implements VideoRenderer {
    private ram: RamDevice;
    private addresses: Uint16Array;
    private textRenderer: TextModeRenderer;
    private mixedMode: boolean;

    /** Buffer width in columns (40 for lo-res mode). */
    readonly bufferWidth = VIDEO.TEXT_COLS;

    /** Buffer height in rows (24 for lo-res mode). */
    readonly bufferHeight = VIDEO.TEXT_ROWS;

    /**
     * Create lo-res renderer.
     *
     * @param ram - RAM device for reading graphics memory
     * @param characterRom - Character ROM (for mixed mode text)
     * @param page - Graphics page (1 or 2)
     * @param mixedMode - Enable mixed mode (graphics + 4 text rows)
     */
    constructor(ram: RamDevice, characterRom: CharacterRom, page: TextPage, mixedMode: boolean) {
        this.ram = ram;
        this.mixedMode = mixedMode;
        this.textRenderer = new TextModeRenderer(ram, characterRom, page);
        this.addresses = createTextPageAddresses(page, VIDEO.TEXT_ROWS, VIDEO.TEXT_COLS);
    }

    /**
     * Render lo-res graphics buffer in-place.
     *
     * Each memory byte contains 2 vertical pixels:
     * - Lower nibble (bits 0-3) = top pixel
     * - Upper nibble (bits 4-7) = bottom pixel
     *
     * @param target - Pre-allocated buffer to fill (40x24 string array)
     * @param showFlash - Flash state for mixed mode text
     */
    render(target: TerminalBuffer, showFlash: boolean): void {
        const cols = VIDEO.TEXT_COLS;
        const mixedTextRows = VIDEO.MIXED_TEXT_ROWS;

        // In lo-res mode:
        // - 24 memory rows (same layout as text mode)
        // - Each byte = 2 vertical pixels (via nibbles)
        // - Total: 48 pixel rows displayed in 24 terminal rows
        // In mixed mode: top 20 terminal rows are lo-res, bottom 4 are text

        const memRows = this.mixedMode ? VIDEO.TEXT_ROWS - mixedTextRows : VIDEO.TEXT_ROWS;

        for (let memRow = 0; memRow < memRows; memRow++) {
            const line = target[memRow];

            for (let col = 0; col < cols; col++) {
                const address = this.addresses[memRow * cols + col];
                const byte = this.ram.read(toWord(address));

                // Lower nibble = top pixel, upper nibble = bottom pixel
                const topPixel = byte & 0x0f;
                const bottomPixel = (byte >> 4) & 0x0f;

                line[col] = renderLoResCell(topPixel, bottomPixel);
            }
        }

        // Mixed mode: render text into rows 20-23 only
        if (this.mixedMode) {
            const startRow = VIDEO.TEXT_ROWS - VIDEO.MIXED_TEXT_ROWS; // 20
            this.textRenderer.render(target, showFlash, startRow, VIDEO.TEXT_ROWS);
        }
    }
}
