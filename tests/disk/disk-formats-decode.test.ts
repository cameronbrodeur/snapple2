import { describe, it, expect } from 'vitest';
import { buildReverseNibbleTable, decode6And2, encode6And2 } from '../../src/disk/disk-formats.js';

describe('6-and-2 Decoding', () => {
    it('should build reverse nibble table', () => {
        const reverse = buildReverseNibbleTable();

        // Test a few known mappings
        expect(reverse[0x96]).toBe(0); // First entry
        expect(reverse[0xff]).toBe(63); // Last entry
        expect(reverse[0x00]).toBe(0xff); // Invalid marker
    });

    it('should decode 343 bytes to 256 bytes', () => {
        // Create a known encoded sector (all zeros)
        const encoded = new Uint8Array(343);
        encoded.fill(0x96); // All zeros in decoded form

        const decoded = decode6And2(encoded);

        expect(decoded.length).toBe(256);
        // After decoding all 0x96, we should get zeros (with XOR reversal)
    });

    it('should round-trip encode/decode', () => {
        const original = new Uint8Array(256);
        // Fill with test pattern
        for (let i = 0; i < 256; i++) {
            original[i] = i;
        }

        const encoded = encode6And2(original);
        const decoded = decode6And2(encoded);

        expect(decoded).toEqual(original);
    });

    it('should round-trip with all zeros', () => {
        const original = new Uint8Array(256);
        original.fill(0);

        const encoded = encode6And2(original);
        const decoded = decode6And2(encoded);

        expect(decoded).toEqual(original);
    });

    it('should round-trip with all 0xFF', () => {
        const original = new Uint8Array(256);
        original.fill(0xff);

        const encoded = encode6And2(original);
        const decoded = decode6And2(encoded);

        expect(decoded).toEqual(original);
    });
});
