/**
 * Integration tests for disk write round-trip (load → write → save → reload).
 *
 * Tests the complete write pipeline:
 * 1. Load WOZ disk into DiskController
 * 2. Write data through soft switches
 * 3. Save modifications with DiskWriter
 * 4. Reload saved file and verify data persists
 *
 * Why integration tests? Unit tests verify individual classes work correctly,
 * but we also need to verify the entire pipeline works end-to-end. This catches
 * issues like incorrect buffer handoff, serialization bugs, or format corruption.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiskIIController } from '../../src/disk/disk-controller.js';
import { WozImage } from '../../src/disk/woz-image.js';
import { DiskWriter } from '../../src/disk/disk-writer.js';
import { toWord, toByte } from 'cpu6502/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createWoz1 } from './test-helpers.js';

// Use shared helper with simplified API
function createWoz1WithPattern(pattern: number): Uint8Array {
    return createWoz1({ pattern });
}

describe('Disk Round-Trip Integration', () => {
    let controller: DiskIIController;
    let tempDir: string;
    let tempFile: string;

    beforeEach(() => {
        controller = new DiskIIController(() => 0);

        // Create temporary directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapple-test-'));
        tempFile = path.join(tempDir, 'test-disk.woz');
    });

    afterEach(() => {
        // Clean up temporary files
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }
    });

    it('should preserve written data through save and reload cycle', async () => {
        // ==================== Phase 1: Create and Load Initial Disk ====================

        const initialWozData = createWoz1WithPattern(0xff);
        const initialWoz = new WozImage(initialWozData);
        controller.loadDisk(1, initialWoz);

        // ==================== Phase 2: Write Data to Disk ====================

        // Start motor and enable write mode
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        const drive = controller.getDrive(1);
        drive.motorRunning = true; // Force motor on
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON with byte 0xAB

        // Position at start of track 0
        drive.quarterTrack = 0;
        drive.trackBitPosition = 0;

        // Write first byte (0xAB at bit position 0-7)
        controller.write(toWord(0xc0ed), toByte(0xcd)); // LATCH_ON writes 0xAB, loads 0xCD

        // Write second byte (0xCD at bit position 8-15)
        controller.write(toWord(0xc0ed), toByte(0xef)); // LATCH_ON writes 0xCD, loads 0xEF

        // Write third byte (0xEF at bit position 16-23)
        controller.write(toWord(0xc0ed), toByte(0x12)); // LATCH_ON writes 0xEF, loads 0x12

        // Verify data was written to buffer
        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true);
        expect(buffer.hasDirtyTrack(0)).toBe(true);
        expect(buffer.getDirtyTrackCount()).toBe(1);

        const modifiedTrack = buffer.getTrack(0);
        expect(modifiedTrack[0]).toBe(0xab); // First byte written
        expect(modifiedTrack[1]).toBe(0xcd); // Second byte written
        expect(modifiedTrack[2]).toBe(0xef); // Third byte written
        expect(modifiedTrack[3]).toBe(0xff); // Rest of track unchanged

        // ==================== Phase 3: Save to File ====================

        const writer = new DiskWriter();
        await writer.saveToWOZ(initialWoz, buffer, tempFile);

        // Verify file was created and has reasonable size
        const stats = fs.statSync(tempFile);
        expect(stats.size).toBeGreaterThan(512); // At least header + track data

        // ==================== Phase 4: Reload and Verify ====================

        // Load the saved file as a new WOZ image
        const reloadedWozData = fs.readFileSync(tempFile);
        const reloadedWoz = new WozImage(reloadedWozData);

        // Verify track data persisted correctly
        const reloadedTrackBits = reloadedWoz.getTrackBits(0);
        expect(reloadedTrackBits.length).toBeGreaterThan(0);
        expect(reloadedTrackBits[0]).toBe(0xab); // First byte persisted
        expect(reloadedTrackBits[1]).toBe(0xcd); // Second byte persisted
        expect(reloadedTrackBits[2]).toBe(0xef); // Third byte persisted
        expect(reloadedTrackBits[3]).toBe(0xff); // Rest of track unchanged

        // Verify bit-level access works correctly
        expect(reloadedWoz.readBit(0, 0)).toBe(1); // First bit of 0xAB (1010 1011)
        expect(reloadedWoz.readBit(0, 1)).toBe(0); // Second bit
        expect(reloadedWoz.readBit(0, 2)).toBe(1); // Third bit
        expect(reloadedWoz.readBit(0, 3)).toBe(0); // Fourth bit
    });

    it('should preserve multiple track modifications', async () => {
        // Create initial disk
        const initialWozData = createWoz1WithPattern(0x00);
        const initialWoz = new WozImage(initialWozData);
        controller.loadDisk(1, initialWoz);

        // Start motor and enable write mode
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        const drive = controller.getDrive(1);
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xaa)); // WRITE_ON

        // Write to track 0
        drive.quarterTrack = 0;
        drive.trackBitPosition = 0;
        controller.write(toWord(0xc0ed), toByte(0xbb)); // Write 0xAA, load 0xBB

        // Write to track 1 (quarter-track 4)
        drive.quarterTrack = 4;
        drive.trackBitPosition = 0;
        controller.write(toWord(0xc0ed), toByte(0xcc)); // Write 0xBB (from previous), load 0xCC

        // Write to track 2 (quarter-track 8)
        drive.quarterTrack = 8;
        drive.trackBitPosition = 0;
        controller.write(toWord(0xc0ed), toByte(0xdd)); // Write 0xCC, load 0xDD

        // Save and reload
        const buffer = drive.getWriteBuffer();
        const writer = new DiskWriter();
        await writer.saveToWOZ(initialWoz, buffer, tempFile);

        const reloadedWozData = fs.readFileSync(tempFile);
        const reloadedWoz = new WozImage(reloadedWozData);

        // Verify all three tracks were modified correctly
        const track0 = reloadedWoz.getTrackBits(0);
        const track1 = reloadedWoz.getTrackBits(4);
        const track2 = reloadedWoz.getTrackBits(8);

        expect(track0[0]).toBe(0xaa);
        expect(track1[0]).toBe(0xbb);
        expect(track2[0]).toBe(0xcc);
    });

    it('should clear dirty flags after successful save', async () => {
        // Create and modify disk
        const initialWozData = createWoz1WithPattern(0xff);
        const initialWoz = new WozImage(initialWozData);
        controller.loadDisk(1, initialWoz);

        // Write some data
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        const drive = controller.getDrive(1);
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true);

        // Save to file
        const writer = new DiskWriter();
        await writer.saveToWOZ(initialWoz, buffer, tempFile);

        // Clear dirty flags (simulates successful save)
        buffer.clearDirty();

        // Verify clean state
        expect(buffer.isDirty()).toBe(false);
        expect(buffer.hasDirtyTrack(0)).toBe(false);
        expect(buffer.getDirtyTrackCount()).toBe(0);

        // Verify subsequent modifications still work
        controller.write(toWord(0xc0ed), toByte(0xef)); // Write another byte
        expect(buffer.isDirty()).toBe(true);
    });

    it('should handle write at arbitrary bit positions', async () => {
        // Create initial disk
        const initialWozData = createWoz1WithPattern(0x00);
        const initialWoz = new WozImage(initialWozData);
        controller.loadDisk(1, initialWoz);

        // Start motor and enable write mode
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        const drive = controller.getDrive(1);
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xff)); // WRITE_ON

        drive.quarterTrack = 0;

        // Write at different bit positions to test bit-level accuracy
        drive.trackBitPosition = 100; // Middle of track
        controller.write(toWord(0xc0ed), toByte(0xaa)); // Write 0xFF, load 0xAA

        drive.trackBitPosition = 500;
        controller.write(toWord(0xc0ed), toByte(0xbb)); // Write 0xAA, load 0xBB

        // Save and reload
        const buffer = drive.getWriteBuffer();
        const writer = new DiskWriter();
        await writer.saveToWOZ(initialWoz, buffer, tempFile);

        const reloadedWozData = fs.readFileSync(tempFile);
        const reloadedWoz = new WozImage(reloadedWozData);

        // Verify bytes were written at correct positions
        const track = reloadedWoz.getTrackBits(0);

        // Writing at bit position 100 spans byte boundaries:
        // - Byte 12 (bits 96-103): bits 100-103 = lower 4 bits of 0xFF = 0x0F
        // - Byte 13 (bits 104-111): bits 104-107 = upper 4 bits of 0xFF = 0xF0
        expect(track[12]).toBe(0x0f); // Bits 96-99 (0x00) + bits 100-103 (0xFF)
        expect(track[13]).toBe(0xf0); // Bits 104-107 (0xFF) + bits 108-111 (0x00)

        // Writing at bit position 500 also spans byte boundaries:
        // - Byte 62 (bits 496-503): bits 500-503 = lower 4 bits of 0xAA = 0x0A
        // - Byte 63 (bits 504-511): bits 504-507 = upper 4 bits of 0xAA = 0xA0
        expect(track[62]).toBe(0x0a); // Bits 496-499 (0x00) + bits 500-503 (0xAA = 1010)
        expect(track[63]).toBe(0xa0); // Bits 504-507 (0xAA = 1010) + bits 508-511 (0x00)
    });
});
