/**
 * Text Mode Renderer
 *
 * Renders Apple II 40-column text mode.
 */

import { RamDevice } from 'cpu6502/bus';
import { toWord } from 'cpu6502/types';
import { TerminalBuffer, TextPage } from '../emulator/types.js';
import { VIDEO } from '../emulator/constants.js';
import { VideoRenderer } from './video-renderer.js';
import { CharacterRom } from './character-rom.js';
import { createTextPageAddresses } from './text-page-memory.js';

/** ANSI escape: enable inverse video mode. */
const ANSI_INVERSE_ON = '\x1b[7m';

/** ANSI escape: disable inverse video mode. */
const ANSI_INVERSE_OFF = '\x1b[27m';

/**
 * Text mode renderer.
 *
 * Renders 40×24 text mode by reading from Apple II text page memory.
 * Uses pre-computed address table for optimal performance.
 */
export class TextModeRenderer implements VideoRenderer {
    private ram: RamDevice;
    private characterRom: CharacterRom;
    private textAddresses: Uint16Array;

    /** Buffer width in columns (40 for text mode). */
    readonly bufferWidth = VIDEO.TEXT_COLS;

    /** Buffer height in rows (24 for text mode). */
    readonly bufferHeight = VIDEO.TEXT_ROWS;

    /**
     * Create text mode renderer.
     *
     * @param ram - RAM device for reading text page memory
     * @param characterRom - Character ROM for glyph lookup
     * @param page - Text page (1 or 2)
     */
    constructor(ram: RamDevice, characterRom: CharacterRom, page: TextPage) {
        this.ram = ram;
        this.characterRom = characterRom;
        this.textAddresses = createTextPageAddresses(page, VIDEO.TEXT_ROWS, VIDEO.TEXT_COLS);
    }

    /**
     * Render text mode buffer in-place.
     *
     * Reads from text page memory and converts to displayable characters.
     * Applies inverse video for inverse/flash mode characters.
     *
     * @param target - Pre-allocated buffer to fill (40×24 string array)
     * @param showFlash - Flash state for blinking characters
     * @param startRow - First row to render (default 0)
     * @param endRow - Last row to render exclusive (default 24)
     */
    render(
        target: TerminalBuffer,
        showFlash: boolean,
        startRow = 0,
        endRow = VIDEO.TEXT_ROWS,
    ): void {
        const cols = VIDEO.TEXT_COLS;

        for (let row = startRow; row < endRow; row++) {
            const line = target[row];

            for (let col = 0; col < cols; col++) {
                // Use pre-computed address (no calculation per-frame)
                const address = this.textAddresses[row * cols + col];

                // Read character code from memory
                const charCode = this.ram.read(toWord(address));

                // Convert to displayable ASCII character
                let char = this.characterRom.toAscii(charCode, showFlash);

                // Get character display mode (normal, inverse, or flash)
                const mode = this.characterRom.getCharacterMode(charCode);

                // Apply inverse video styling based on character mode:
                // - Inverse chars ($00-$3F): always inverse
                // - Flash chars ($40-$7F): inverse when showFlash=true (creates blink)
                // - Normal chars ($80-$FF): never inverse
                const shouldInvert = mode === 'inverse' || (mode === 'flash' && showFlash);
                if (shouldInvert) {
                    char = `${ANSI_INVERSE_ON}${char}${ANSI_INVERSE_OFF}`;
                }

                line[col] = char;
            }
        }
    }

    /**
     * Get text page address for a given row and column.
     *
     * @param row - Row (0-23)
     * @param col - Column (0-39)
     * @returns Memory address
     */
    getAddress(row: number, col: number): number {
        const rows = VIDEO.TEXT_ROWS;
        const cols = VIDEO.TEXT_COLS;

        if (row < 0 || row >= rows || col < 0 || col >= cols) {
            throw new Error(`Invalid text position: row=${row}, col=${col}`);
        }
        return this.textAddresses[row * cols + col];
    }
}
