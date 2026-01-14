import { describe, it, expect, beforeEach } from 'vitest';
import { DiskDrive } from '../../src/disk/disk-drive.js';
import { WozImage } from '../../src/disk/woz-image.js';
import { createWoz1 } from './test-helpers.js';

describe('DiskDrive', () => {
    let drive: DiskDrive;
    let wozData: Uint8Array;

    beforeEach(() => {
        // Create minimal WOZ with one track
        wozData = new Uint8Array(256 + 6656);
        // WOZ header
        wozData.set([0x57, 0x4f, 0x5a, 0x31, 0xff, 0x0a, 0x0d, 0x0a], 0);

        const woz = new WozImage(wozData);
        drive = new DiskDrive(1);
        drive.loadImage(woz);
    });

    it('should start with write mode off', () => {
        expect(drive.writeMode).toBe(false);
    });

    it('should enable write mode', () => {
        drive.setWriteMode(true);
        expect(drive.writeMode).toBe(true);
    });

    it('should disable write mode', () => {
        drive.setWriteMode(true);
        drive.setWriteMode(false);
        expect(drive.writeMode).toBe(false);
    });

    // Note: setWriteProtectOverride and isWriteAllowed are tested comprehensively
    // in disk-protection.test.ts (11 integration tests covering all scenarios)

    // ==================== Read Path Tests ====================

    it('should read bytes from WOZ image when track is clean', () => {
        const wozWithData = createWoz1({ pattern: 0xff });
        const woz = new WozImage(wozWithData);
        drive.loadImage(woz);
        drive.motorRunning = true;
        drive.quarterTrack = 0;
        drive.trackBitPosition = 0;

        // Read a byte (should get data from original WOZ)
        const data = drive.readByte(100); // 100 cycles elapsed

        // Should return some data (not undefined)
        expect(data).toBeDefined();
        expect(typeof data).toBe('number');
        expect(data).toBeGreaterThanOrEqual(0);
        expect(data).toBeLessThanOrEqual(255);
    });

    it('should read from write buffer when track is dirty', () => {
        const wozWithData = createWoz1({ pattern: 0x00 });
        const woz = new WozImage(wozWithData);
        drive.loadImage(woz);
        drive.motorRunning = true;
        drive.quarterTrack = 0;
        drive.trackBitPosition = 0;

        // Write data to make track dirty
        const buffer = drive.getWriteBuffer();
        buffer.setOriginalTrack(0, new Uint8Array(6646).fill(0x00));
        buffer.writeBit(0, 0, 1); // Write a 1 bit at position 0
        buffer.writeBit(0, 1, 1); // Write a 1 bit at position 1
        buffer.writeBit(0, 2, 1); // etc...
        buffer.writeBit(0, 3, 1);
        buffer.writeBit(0, 4, 1);
        buffer.writeBit(0, 5, 1);
        buffer.writeBit(0, 6, 1);
        buffer.writeBit(0, 7, 1); // Now byte 0 = 0xFF

        // Verify track is dirty
        expect(buffer.hasDirtyTrack(0)).toBe(true);

        // Read from modified track
        const data = drive.readByte(100);

        // Should get 0xFF from write buffer (all 1s we wrote)
        expect(data).toBe(0xff);
    });

    it('should return random noise when no disk loaded', () => {
        const emptyDrive = new DiskDrive(2);
        // Don't load any disk

        // Read 100 bytes
        let nonZeroCount = 0;
        let non255Count = 0;
        for (let i = 0; i < 100; i++) {
            const data = emptyDrive.readByte(100);
            expect(data).toBeGreaterThanOrEqual(0);
            expect(data).toBeLessThanOrEqual(255);
            if (data !== 0) nonZeroCount++;
            if (data !== 255) non255Count++;
        }

        // Should get varied data (not all zeros or all 255s)
        expect(nonZeroCount).toBeGreaterThan(10);
        expect(non255Count).toBeGreaterThan(10);
    });

    it('should advance bit position after reads', () => {
        const wozWithData = createWoz1({ pattern: 0xaa });
        const woz = new WozImage(wozWithData);
        drive.loadImage(woz);
        drive.motorRunning = true;
        drive.quarterTrack = 0;
        drive.trackBitPosition = 100;

        const initialPos = drive.trackBitPosition;

        // Read a byte (consumes multiple bits via LSS)
        drive.readByte(100);

        // Position should have advanced
        expect(drive.trackBitPosition).toBeGreaterThan(initialPos);
    });

    it('should wrap bit position at track boundary', () => {
        const wozWithData = createWoz1({ pattern: 0xaa });
        const woz = new WozImage(wozWithData);
        drive.loadImage(woz);
        drive.motorRunning = true;
        drive.quarterTrack = 0;

        const bitCount = woz.getTrackBitCount(0); // 50000
        drive.trackBitPosition = bitCount - 5; // Near end of track

        // Read several bytes to force wrap
        for (let i = 0; i < 10; i++) {
            drive.readByte(100);
        }

        // Position should have wrapped (not exceed bitCount)
        expect(drive.trackBitPosition).toBeLessThan(bitCount);
    });
});
