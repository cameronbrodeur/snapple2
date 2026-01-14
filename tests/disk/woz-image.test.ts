import { describe, it, expect } from 'vitest';
import { WozImage } from '../../src/disk/woz-image.js';
import { createWoz1 } from './test-helpers.js';

describe('WozImage', () => {
    it('should parse WOZ1 format correctly', () => {
        const wozData = createWoz1({ trackData: [0xaa, 0xbb, 0xcc] });
        const image = new WozImage(wozData);

        expect(image.hasTrack(0)).toBe(true);
        const trackBits = image.getTrackBits(0);
        expect(trackBits.length).toBeGreaterThan(0);
        expect(trackBits[0]).toBe(0xaa);
    });

    it('should return empty array for missing track', () => {
        const wozData = createWoz1({ trackData: [0xaa] });
        const image = new WozImage(wozData);

        // Track 4 not in TMAP
        expect(image.hasTrack(4)).toBe(false);
        const trackBits = image.getTrackBits(4);
        expect(trackBits.length).toBe(0);
    });

    it('should return correct bit count for track', () => {
        const wozData = createWoz1({ trackData: [0xaa] });
        const image = new WozImage(wozData);

        const bitCount = image.getTrackBitCount(0);
        expect(bitCount).toBe(50000); // Standard DOS 3.3 track
    });

    it('should correctly identify track existence', () => {
        const wozData = createWoz1({ trackData: [0xaa] });
        const image = new WozImage(wozData);

        expect(image.hasTrack(0)).toBe(true); // Track 0 exists
        expect(image.hasTrack(4)).toBe(false); // Track 1 (quarter-track 4) missing
        expect(image.hasTrack(100)).toBe(false); // Invalid quarter-track
    });

    it('should read bit at specific position', () => {
        // Byte 0 = 0xAA = 1010 1010 (MSB first)
        const wozData = createWoz1({ trackData: [0xaa] });
        const image = new WozImage(wozData);

        expect(image.readBit(0, 0)).toBe(1); // Bit 0 (MSB)
        expect(image.readBit(0, 1)).toBe(0);
        expect(image.readBit(0, 2)).toBe(1);
        expect(image.readBit(0, 3)).toBe(0);
        expect(image.readBit(0, 4)).toBe(1);
        expect(image.readBit(0, 5)).toBe(0);
        expect(image.readBit(0, 6)).toBe(1);
        expect(image.readBit(0, 7)).toBe(0);
    });

    it('should wrap bit position at track boundary', () => {
        const wozData = createWoz1({ trackData: [0xaa, 0xbb] });
        const image = new WozImage(wozData);

        const bitCount = image.getTrackBitCount(0); // 50000

        // Reading past track boundary wraps around
        const bitAtStart = image.readBit(0, bitCount); // Should wrap to 0

        expect(bitAtStart).toBe(image.readBit(0, 0)); // Same as bit 0
    });

    it('should handle MSB-first bit ordering', () => {
        // Byte 0 = 0x80 = 1000 0000
        const wozData = createWoz1({ trackData: [0x80] });
        const image = new WozImage(wozData);

        expect(image.readBit(0, 0)).toBe(1); // MSB
        expect(image.readBit(0, 1)).toBe(0);
        expect(image.readBit(0, 2)).toBe(0);
        expect(image.readBit(0, 3)).toBe(0);
        expect(image.readBit(0, 4)).toBe(0);
        expect(image.readBit(0, 5)).toBe(0);
        expect(image.readBit(0, 6)).toBe(0);
        expect(image.readBit(0, 7)).toBe(0);
    });

    it('should return random bits for missing track', () => {
        const wozData = createWoz1({ trackData: [0xaa] });
        const image = new WozImage(wozData);

        // Read 100 bits from missing track
        let onesCount = 0;
        for (let i = 0; i < 100; i++) {
            const bit = image.readBit(4, i); // Track 4 doesn't exist
            expect([0, 1]).toContain(bit); // Must be 0 or 1
            if (bit === 1) onesCount++;
        }

        // Should be roughly 30% ones (10-50% acceptable for 100 samples)
        expect(onesCount).toBeGreaterThan(10);
        expect(onesCount).toBeLessThan(50);
    });

    it('should read write protection flag', () => {
        // Create protected WOZ
        const protectedWoz = createWoz1({ trackData: [0xaa], writeProtected: true });
        const protectedImage = new WozImage(protectedWoz);
        expect(protectedImage.isWriteProtected).toBe(true);

        // Create writable WOZ
        const writableWoz = createWoz1({ trackData: [0xaa], writeProtected: false });
        const writableImage = new WozImage(writableWoz);
        expect(writableImage.isWriteProtected).toBe(false);
    });
});
