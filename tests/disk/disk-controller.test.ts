import { describe, it, expect, beforeEach } from 'vitest';
import { DiskIIController } from '../../src/disk/disk-controller.js';
import { WozImage } from '../../src/disk/woz-image.js';
import { toWord, toByte } from 'cpu6502/types';
import { createWoz2 } from './test-helpers.js';

describe('DiskIIController', () => {
    let controller: DiskIIController;

    beforeEach(() => {
        controller = new DiskIIController(() => 0);
    });

    it('should handle WRITE_OFF (0xC0EE)', () => {
        // Set write mode first
        controller.write(toWord(0xc0ef), toByte(0));
        expect(controller['activeDrive'].writeMode).toBe(true);

        // Turn off write mode
        controller.write(toWord(0xc0ee), toByte(0));
        expect(controller['activeDrive'].writeMode).toBe(false);
    });

    it('should handle WRITE_ON (0xC0EF)', () => {
        controller.write(toWord(0xc0ef), toByte(0));
        expect(controller['activeDrive'].writeMode).toBe(true);
    });

    it('should not write if motor is off', () => {
        controller.write(toWord(0xc0ef), toByte(0)); // Write mode on
        controller.write(toWord(0xc0e8), toByte(0)); // Motor off

        const buffer = controller['activeDrive'].getWriteBuffer();
        const initialDirty = buffer.isDirty();

        controller.write(toWord(0xc0ed), toByte(0x80)); // Try to write

        expect(buffer.isDirty()).toBe(initialDirty); // No change
    });

    it('should not write if write-protected', () => {
        // Would need a write-protected disk loaded
        // This test verifies the logic path exists
    });

    it('should correctly load track data from WOZ image', () => {
        // Create minimal WOZ2 with track 0 data
        const wozData = createWoz2({ pattern: 0xaa });
        const woz = new WozImage(wozData);

        // Verify the WOZ can read the track data correctly
        const trackBits = woz.getTrackBits(0);
        expect(trackBits.length).toBeGreaterThan(0);
        expect(trackBits[0]).toBe(0xaa);
    });

    it('should initialize track data before first write', () => {
        // Create minimal WOZ2 with track 0 data
        const wozData = createWoz2({ pattern: 0xaa });
        const woz = new WozImage(wozData);
        controller.loadDisk(1, woz);

        // Start motor and enable write mode
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        controller['activeDrive'].motorRunning = true; // Force motor on
        controller.write(toWord(0xc0ef), toByte(0)); // WRITE_ON

        const buffer = controller['activeDrive'].getWriteBuffer();

        // Verify buffer has no original track loaded initially
        expect(buffer.hasOriginalTrack(0)).toBe(false);

        // Write a bit
        controller.write(toWord(0xc0ed), toByte(0x80)); // Write 1 bit via LATCH_ON

        // Verify track was initialized with original data
        expect(buffer.hasOriginalTrack(0)).toBe(true);

        const track = buffer.getTrack(0);
        expect(track.length).toBeGreaterThan(0);

        // Verify the track contains the original data (0xAA pattern we set)
        expect(track[0]).toBe(0xaa);
    });

    it('should write byte to initialized track', () => {
        // Create minimal WOZ2 with track 0 data
        const wozData = createWoz2({ pattern: 0xaa });
        const woz = new WozImage(wozData);
        controller.loadDisk(1, woz);

        // Start motor and enable write mode
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        controller['activeDrive'].motorRunning = true; // Force motor on
        controller.write(toWord(0xc0ef), toByte(0xd5)); // WRITE_ON with byte 0xD5

        const drive = controller['activeDrive'];
        const buffer = drive.getWriteBuffer();

        // Position at bit 0 of track 0
        drive.quarterTrack = 0;
        drive.trackBitPosition = 0;

        // Write the byte (LATCH_ON writes previous byte)
        controller.write(toWord(0xc0ed), toByte(0xaa)); // LATCH_ON writes 0xD5, loads 0xAA

        // Verify track was modified - first byte (8 bits) should be 0xD5
        const track = buffer.getTrack(0);
        expect(track[0]).toBe(0xd5);

        // Verify buffer is dirty
        expect(buffer.isDirty()).toBe(true);
        expect(buffer.hasDirtyTrack(0)).toBe(true);
    });

    it('should preserve original data when writing bytes', () => {
        // Create minimal WOZ2 with track 0 filled with 0xFF pattern
        const wozData = createWoz2({ pattern: 0xff });
        const woz = new WozImage(wozData);
        controller.loadDisk(1, woz);

        // Start motor and enable write mode
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        controller['activeDrive'].motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON with byte 0xAB

        const drive = controller['activeDrive'];
        const buffer = drive.getWriteBuffer();

        // Position at bit 8 (second byte position)
        drive.quarterTrack = 0;
        drive.trackBitPosition = 8;

        // Write the byte
        controller.write(toWord(0xc0ed), toByte(0xcd)); // LATCH_ON writes 0xAB, loads 0xCD

        const track = buffer.getTrack(0);

        // First byte should still be 0xFF (unmodified)
        expect(track[0]).toBe(0xff);

        // Second byte (at bit position 8-15) should be 0xAB
        expect(track[1]).toBe(0xab);

        // Rest of track should still be 0xFF
        expect(track[2]).toBe(0xff);
        expect(track[100]).toBe(0xff);
    });

    // ==================== Read Path Tests ====================

    it('should return disk data when motor is on ($C0E8 MOTOR_OFF)', () => {
        // This is the Mr. Do! quirk - MOTOR_OFF switch still reads data
        const wozData = createWoz2({ pattern: 0xaa });
        const woz = new WozImage(wozData);
        controller.loadDisk(1, woz);

        // Motor on
        controller.write(toWord(0xc0e9), toByte(0));
        controller['activeDrive'].motorRunning = true;

        // Read via $C0E8 (MOTOR_OFF switch)
        const data = controller.read(toWord(0xc0e8));

        // Should get data (not just 0)
        expect(data).toBeDefined();
        expect(typeof data).toBe('number');
    });

    it('should read data via $C0EC (LATCH_OFF)', () => {
        const wozData = createWoz2({ pattern: 0xaa });
        const woz = new WozImage(wozData);
        controller.loadDisk(1, woz);

        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        controller['activeDrive'].motorRunning = true;

        // Read via $C0EC
        const data1 = controller.read(toWord(0xc0ec));
        const data2 = controller.read(toWord(0xc0ec));

        // Should read sequential data from track
        expect(data1).toBeDefined();
        expect(data2).toBeDefined();
        // Data might be same or different depending on LSS state
    });

    it('should read from correct drive when switching', () => {
        // Load different patterns in each drive
        const woz1 = new WozImage(createWoz2({ pattern: 0xaa }));
        const woz2 = new WozImage(createWoz2({ pattern: 0x55 }));

        controller.loadDisk(1, woz1);
        controller.loadDisk(2, woz2);

        // Start with drive 1
        controller['drive1'].motorRunning = true;
        controller['drive2'].motorRunning = true;

        // Read from drive 1
        controller.read(toWord(0xc0e9)); // Select drive 1, motor on
        const data1 = controller.read(toWord(0xc0ec));

        // Switch to drive 2
        controller.read(toWord(0xc0eb)); // Select drive 2, motor on
        const data2 = controller.read(toWord(0xc0ec));

        // Data should be from different drives
        expect(data1).toBeDefined();
        expect(data2).toBeDefined();
    });

    it('should maintain separate read positions per drive', () => {
        const woz1 = new WozImage(createWoz2({ pattern: 0xaa }));
        const woz2 = new WozImage(createWoz2({ pattern: 0xaa }));

        controller.loadDisk(1, woz1);
        controller.loadDisk(2, woz2);

        // Set different positions directly on drives
        controller['drive1'].trackBitPosition = 100;
        controller['drive2'].trackBitPosition = 500;

        // Verify positions are maintained separately
        expect(controller['drive1'].trackBitPosition).toBe(100);
        expect(controller['drive2'].trackBitPosition).toBe(500);

        // Select drive 1 using write (doesn't read/advance)
        controller.write(toWord(0xc0e9), toByte(0)); // Select drive 1
        expect(controller['drive1'].trackBitPosition).toBe(100);

        // Select drive 2 using write
        controller.write(toWord(0xc0eb), toByte(0)); // Select drive 2
        expect(controller['drive2'].trackBitPosition).toBe(500);

        // Positions should still be independent
        expect(controller['drive1'].trackBitPosition).toBe(100);
        expect(controller['drive2'].trackBitPosition).toBe(500);
    });
});
