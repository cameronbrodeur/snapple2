/**
 * Character ROM
 *
 * Provides access to Apple II character glyphs.
 */

import { CharacterGlyph } from './types.js';

/** Size of the character ROM in bytes. */
const CHARACTER_ROM_SIZE = 2048;

/** Number of bytes per character glyph (8×8 pixels = 8 bytes). */
const BYTES_PER_CHARACTER = 8;

/**
 * Character ROM manager.
 *
 * Stores 2KB character ROM and provides glyph lookup.
 * The Apple II character ROM contains 256 characters, each 8×8 pixels (8 bytes).
 */
export class CharacterRom {
    private rom: Uint8Array;

    /**
     * Create character ROM.
     *
     * @param data - 2KB character ROM data
     */
    constructor(data: Uint8Array) {
        if (data.length !== CHARACTER_ROM_SIZE) {
            throw new Error(
                `Character ROM must be ${CHARACTER_ROM_SIZE} bytes, got ${data.length}`,
            );
        }
        this.rom = data;
    }

    /**
     * Get character glyph.
     *
     * @param charCode - Character code (0-255)
     * @returns 8 bytes representing 8×8 pixel glyph
     */
    getCharacterGlyph(charCode: number): CharacterGlyph {
        const offset = (charCode & 0xff) * BYTES_PER_CHARACTER;

        const glyph: number[] = [];
        for (let i = 0; i < BYTES_PER_CHARACTER; i++) {
            glyph.push(this.rom[offset + i]);
        }

        return glyph;
    }

    /**
     * Convert character code to displayable ASCII character.
     *
     * The Apple II uses a modified character set:
     * - $00-$1F: Inverse uppercase and symbols
     * - $20-$3F: Inverse symbols and numbers
     * - $40-$5F: Flashing uppercase and symbols
     * - $60-$7F: Flashing symbols and lowercase
     * - $80-$9F: Normal uppercase and symbols
     * - $A0-$BF: Normal symbols and numbers
     * - $C0-$DF: Normal uppercase and symbols
     * - $E0-$FF: Normal lowercase
     *
     * For terminal display, we convert to standard ASCII:
     * - Strip high bit (convert $80-$FF to $00-$7F)
     * - Map control characters ($00-$1F) to '@' placeholder
     * - Map valid ASCII ($20-$7F) to themselves
     *
     * @param charCode - Apple II character code
     * @param showFlash - true to show flashing characters, false to hide them
     * @returns ASCII character for terminal display
     */
    toAscii(charCode: number, showFlash = true): string {
        // Strip high bit to get base character (0x00-0x7F)
        const base = charCode & 0x7f;

        // $00-$1F maps to $40-$5F (@ A-Z [ \ ] ^ _)
        // These are the "control character" positions that display as uppercase letters
        if (base < 0x20) {
            return String.fromCharCode(base + 0x40);
        }

        // Special case: $60 is space in flash/inverse mode, not backtick
        if (base === 0x60) {
            return ' ';
        }

        // Everything in $20-$7E maps directly to displayable ASCII
        if (base <= 0x7e) {
            return String.fromCharCode(base);
        }

        // Fallback for $7F (DEL)
        return ' ';
    }

    /**
     * Determine character display mode.
     *
     * Based on the high bits of the character code:
     * - $00-$3F: Inverse
     * - $40-$7F: Flash
     * - $80-$FF: Normal
     *
     * @param charCode - Apple II character code
     * @returns 'normal', 'inverse', or 'flash'
     */
    getCharacterMode(charCode: number): 'normal' | 'inverse' | 'flash' {
        if (charCode < 0x40) {
            return 'inverse';
        } else if (charCode < 0x80) {
            return 'flash';
        } else {
            return 'normal';
        }
    }
}
