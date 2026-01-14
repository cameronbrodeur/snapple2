import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageCard } from '../../src/memory/language-card.js';
import { LanguageCardSwitch } from '../../src/memory/language-card-switch.js';
import { toWord, toByte } from 'cpu6502/types';

describe('LanguageCard', () => {
    let lc: LanguageCard;
    let mockRoms: Uint8Array[];

    beforeEach(() => {
        // Create mock ROMs (6 x 2KB = 12KB for $D000-$FFFF)
        mockRoms = [];
        for (let i = 0; i < 6; i++) {
            const rom = new Uint8Array(0x800);
            rom.fill(0xd0 + i); // Fill with recognizable pattern
            mockRoms.push(rom);
        }
        lc = new LanguageCard(mockRoms);
    });

    describe('initial state', () => {
        it('should read from ROM by default', () => {
            // Default state: read ROM, write disabled
            const value = lc.read(toWord(0x0000)); // Offset 0 = $D000
            expect(value).toBe(0xd0); // First ROM's fill value
        });

        it('should have bank 2 selected by default', () => {
            expect(lc.getState().selectedBank).toBe(2);
        });

        it('should have writes disabled by default', () => {
            expect(lc.getState().writeEnabled).toBe(false);
        });
    });

    describe('soft switch handling', () => {
        it('should enable RAM read with $C080 (bank 2)', () => {
            lc.handleSoftSwitch(0xc080);
            expect(lc.getState().readFromRam).toBe(true);
            expect(lc.getState().selectedBank).toBe(2);
            expect(lc.getState().writeEnabled).toBe(false);
        });

        it('should enable ROM read with $C082 (bank 2)', () => {
            // First enable RAM read
            lc.handleSoftSwitch(0xc080);
            expect(lc.getState().readFromRam).toBe(true);

            // Then switch back to ROM
            lc.handleSoftSwitch(0xc082);
            expect(lc.getState().readFromRam).toBe(false);
            expect(lc.getState().writeEnabled).toBe(false);
        });

        it('should select bank 1 with $C088', () => {
            lc.handleSoftSwitch(0xc088);
            expect(lc.getState().selectedBank).toBe(1);
        });

        it('should require two accesses to enable write with $C081', () => {
            // First access: sets pre-write flag
            lc.handleSoftSwitch(0xc081);
            expect(lc.getState().writeEnabled).toBe(false);
            expect(lc.getState().preWriteFlag).toBe(true);

            // Second access: enables write
            lc.handleSoftSwitch(0xc081);
            expect(lc.getState().writeEnabled).toBe(true);
        });

        it('should reset pre-write flag when different switch accessed', () => {
            // First access to $C081
            lc.handleSoftSwitch(0xc081);
            expect(lc.getState().preWriteFlag).toBe(true);

            // Access different switch - should reset
            lc.handleSoftSwitch(0xc080);
            expect(lc.getState().preWriteFlag).toBe(false);
            expect(lc.getState().writeEnabled).toBe(false);
        });

        it('should handle echo addresses ($C084-$C087 echo $C080-$C083)', () => {
            lc.handleSoftSwitch(0xc084); // Echo of $C080
            expect(lc.getState().readFromRam).toBe(true);
            expect(lc.getState().selectedBank).toBe(2);
        });
    });

    describe('RAM read/write', () => {
        it('should write to bank 2 RAM when enabled', () => {
            // Enable RAM read/write for bank 2
            lc.handleSoftSwitch(0xc083);
            lc.handleSoftSwitch(0xc083); // Second access enables write

            // Write to $D000
            lc.write(toWord(0x0000), toByte(0x42));

            // Read back
            const value = lc.read(toWord(0x0000));
            expect(value).toBe(0x42);
        });

        it('should write to bank 1 RAM when selected', () => {
            // Enable RAM read/write for bank 1
            lc.handleSoftSwitch(0xc08b);
            lc.handleSoftSwitch(0xc08b);

            // Write to $D000
            lc.write(toWord(0x0000), toByte(0x99));

            // Read back
            const value = lc.read(toWord(0x0000));
            expect(value).toBe(0x99);
        });

        it('should keep bank 1 and bank 2 separate', () => {
            // Write to bank 2
            lc.handleSoftSwitch(0xc083);
            lc.handleSoftSwitch(0xc083);
            lc.write(toWord(0x0000), toByte(0xaa));

            // Write different value to bank 1
            lc.handleSoftSwitch(0xc08b);
            lc.handleSoftSwitch(0xc08b);
            lc.write(toWord(0x0000), toByte(0xbb));

            // Verify bank 1 has correct value
            expect(lc.read(toWord(0x0000))).toBe(0xbb);

            // Switch back to bank 2 and verify its value
            lc.handleSoftSwitch(0xc083);
            lc.handleSoftSwitch(0xc083);
            expect(lc.read(toWord(0x0000))).toBe(0xaa);
        });

        it('should write to upper RAM ($E000-$FFFF)', () => {
            // Enable RAM read/write
            lc.handleSoftSwitch(0xc083);
            lc.handleSoftSwitch(0xc083);

            // Write to $E000 (offset 0x1000 from $D000)
            lc.write(toWord(0x1000), toByte(0x55));

            // Read back
            expect(lc.read(toWord(0x1000))).toBe(0x55);
        });

        it('should share upper RAM between banks', () => {
            // Write in bank 2 mode
            lc.handleSoftSwitch(0xc083);
            lc.handleSoftSwitch(0xc083);
            lc.write(toWord(0x1000), toByte(0x77)); // $E000

            // Switch to bank 1
            lc.handleSoftSwitch(0xc08b);
            lc.handleSoftSwitch(0xc08b);

            // Upper RAM should still have same value
            expect(lc.read(toWord(0x1000))).toBe(0x77);
        });

        it('should not write when writes are disabled', () => {
            // Enable RAM read only (no write)
            lc.handleSoftSwitch(0xc080);

            // Try to write
            lc.write(toWord(0x0000), toByte(0xff));

            // Should still read 0 (initial RAM state)
            expect(lc.read(toWord(0x0000))).toBe(0x00);
        });
    });
});

describe('LanguageCardSwitch', () => {
    let lc: LanguageCard;
    let handler: LanguageCardSwitch;
    let mockRoms: Uint8Array[];

    beforeEach(() => {
        mockRoms = [];
        for (let i = 0; i < 6; i++) {
            const rom = new Uint8Array(0x800);
            rom.fill(0xd0 + i);
            mockRoms.push(rom);
        }
        lc = new LanguageCard(mockRoms);
        handler = new LanguageCardSwitch(lc);
    });

    it('should trigger soft switch on read', () => {
        handler.read(0xc080);
        expect(lc.getState().readFromRam).toBe(true);
    });

    it('should trigger soft switch on write', () => {
        handler.write(0xc088, 0);
        expect(lc.getState().selectedBank).toBe(1);
    });

    it('should return 0 on read (floating bus)', () => {
        const value = handler.read(0xc080);
        expect(value).toBe(0x00);
    });
});
