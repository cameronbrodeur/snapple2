/**
 * Character ROM Unit Tests
 *
 * Tests for CharacterRom glyph lookup and character conversion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterRom } from '../../src/video/character-rom.js';

describe('CharacterRom', () => {
    let characterRom: CharacterRom;

    beforeEach(() => {
        // Create a mock 2KB character ROM
        const romData = new Uint8Array(2048);

        // Fill with test pattern: each character's glyph is its character code repeated 8 times
        for (let i = 0; i < 256; i++) {
            for (let j = 0; j < 8; j++) {
                romData[i * 8 + j] = i;
            }
        }

        characterRom = new CharacterRom(romData);
    });

    describe('Constructor', () => {
        it('should accept 2048-byte ROM', () => {
            const romData = new Uint8Array(2048);
            expect(() => new CharacterRom(romData)).not.toThrow();
        });

        it('should reject wrong size ROM', () => {
            const romData = new Uint8Array(1024);
            expect(() => new CharacterRom(romData)).toThrow(/2048 bytes/);
        });
    });

    describe('getCharacterGlyph', () => {
        it('should return 8 bytes for character 0', () => {
            const glyph = characterRom.getCharacterGlyph(0);
            expect(glyph).toHaveLength(8);
            expect(glyph).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
        });

        it('should return 8 bytes for character 65 (A)', () => {
            const glyph = characterRom.getCharacterGlyph(65);
            expect(glyph).toHaveLength(8);
            expect(glyph).toEqual([65, 65, 65, 65, 65, 65, 65, 65]);
        });

        it('should return 8 bytes for character 255', () => {
            const glyph = characterRom.getCharacterGlyph(255);
            expect(glyph).toHaveLength(8);
            expect(glyph).toEqual([255, 255, 255, 255, 255, 255, 255, 255]);
        });

        it('should handle character codes > 255 by masking', () => {
            const glyph = characterRom.getCharacterGlyph(256);
            expect(glyph).toEqual(characterRom.getCharacterGlyph(0));
        });
    });

    describe('toAscii', () => {
        it('should convert normal uppercase letters ($C1-$DA)', () => {
            expect(characterRom.toAscii(0xc1)).toBe('A');
            expect(characterRom.toAscii(0xda)).toBe('Z');
        });

        it('should convert normal lowercase letters ($E1-$FA)', () => {
            expect(characterRom.toAscii(0xe1)).toBe('a');
            expect(characterRom.toAscii(0xfa)).toBe('z');
        });

        it('should convert normal space ($A0)', () => {
            expect(characterRom.toAscii(0xa0)).toBe(' ');
        });

        it('should convert normal numbers ($B0-$B9)', () => {
            expect(characterRom.toAscii(0xb0)).toBe('0');
            expect(characterRom.toAscii(0xb9)).toBe('9');
        });

        it('should map $00-$1F to $40-$5F (@ A-Z [ \\ ] ^ _)', () => {
            // $00-$1F are "control character" positions that display as uppercase letters
            // They map to $40-$5F by adding 0x40
            expect(characterRom.toAscii(0x00)).toBe('@'); // $00 + $40 = $40 = '@'
            expect(characterRom.toAscii(0x01)).toBe('A'); // $01 + $40 = $41 = 'A'
            expect(characterRom.toAscii(0x1a)).toBe('Z'); // $1A + $40 = $5A = 'Z'
            expect(characterRom.toAscii(0x1b)).toBe('['); // $1B + $40 = $5B = '['
            expect(characterRom.toAscii(0x1f)).toBe('_'); // $1F + $40 = $5F = '_'
            // Same mapping applies when high bit is set (normal mode)
            expect(characterRom.toAscii(0x80)).toBe('@'); // $80 & $7F = $00, then +$40 = '@'
            expect(characterRom.toAscii(0x81)).toBe('A'); // $81 & $7F = $01, then +$40 = 'A'
            expect(characterRom.toAscii(0x9f)).toBe('_'); // $9F & $7F = $1F, then +$40 = '_'
        });

        it('should strip high bit for inverse characters', () => {
            // Inverse 'A' ($41) should display as 'A'
            expect(characterRom.toAscii(0x41)).toBe('A');
        });

        it('should strip high bit for flash characters', () => {
            // Flash 'A' ($41) should display as 'A'
            expect(characterRom.toAscii(0x41)).toBe('A');
        });

        it('should handle symbols', () => {
            expect(characterRom.toAscii(0xa1)).toBe('!');
            expect(characterRom.toAscii(0xbf)).toBe('?');
            expect(characterRom.toAscii(0xac)).toBe(',');
            expect(characterRom.toAscii(0xae)).toBe('.');
        });
    });

    describe('getCharacterMode', () => {
        it('should detect inverse mode ($00-$3F)', () => {
            expect(characterRom.getCharacterMode(0x00)).toBe('inverse');
            expect(characterRom.getCharacterMode(0x20)).toBe('inverse');
            expect(characterRom.getCharacterMode(0x3f)).toBe('inverse');
        });

        it('should detect flash mode ($40-$7F)', () => {
            expect(characterRom.getCharacterMode(0x40)).toBe('flash');
            expect(characterRom.getCharacterMode(0x60)).toBe('flash');
            expect(characterRom.getCharacterMode(0x7f)).toBe('flash');
        });

        it('should detect normal mode ($80-$FF)', () => {
            expect(characterRom.getCharacterMode(0x80)).toBe('normal');
            expect(characterRom.getCharacterMode(0xa0)).toBe('normal');
            expect(characterRom.getCharacterMode(0xff)).toBe('normal');
        });
    });
});
