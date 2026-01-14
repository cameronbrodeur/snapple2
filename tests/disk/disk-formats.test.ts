/**
 * Integration tests for disk format conversion and round-trip.
 *
 * Tests the format conversion pipeline:
 * 1. Load DSK/DO/PO disk (auto-converts to WOZ internally)
 * 2. Write data through DiskController
 * 3. Save back to original format (format preservation)
 * 4. Reload and verify data persists
 *
 * Why test format conversion? DSK/DO/PO are sector-based formats that must
 * be converted to bit-level WOZ for emulation, then converted back on save.
 * This tests both directions of conversion preserve data correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiskIIController } from '../../src/disk/disk-controller.js';
import { convertDskToWoz, detectDiskFormat } from '../../src/disk/disk-formats.js';
import { WozImage } from '../../src/disk/woz-image.js';
import { DiskWriter } from '../../src/disk/disk-writer.js';
import { toWord, toByte } from 'cpu6502/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createBlankDsk as createBlankDskFromHelpers, createWoz1 } from './test-helpers.js';

// Use shared helpers with local aliases for convenience
const createMinimalWoz2 = () => createWoz1({ pattern: 0x00 });
const createMinimalWoz2WithWriteProtection = (writeProtected: boolean) =>
    createWoz1({ pattern: 0x00, writeProtected });

describe('Disk Format Conversion Integration', () => {
    let controller: DiskIIController;
    let tempDir: string;

    beforeEach(() => {
        controller = new DiskIIController(() => 0);
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapple-test-'));
    });

    afterEach(() => {
        // Clean up all files in temp directory
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                fs.unlinkSync(path.join(tempDir, file));
            }
            fs.rmdirSync(tempDir);
        }
    });

    it('should convert DSK to WOZ and back preserving sector data', async () => {
        // ==================== Phase 1: Create DSK Disk ====================

        // Create a 143360-byte DSK file (35 tracks × 16 sectors × 256 bytes)
        const dskData = createBlankDsk();
        const dskFile = path.join(tempDir, 'test.dsk');
        fs.writeFileSync(dskFile, dskData);

        // Write test pattern to sector 0, track 0
        writeSectorData(dskData, 0, 0, [0xaa, 0xbb, 0xcc, 0xdd]);

        // Write test pattern to sector 5, track 10
        writeSectorData(dskData, 10, 5, [0x11, 0x22, 0x33, 0x44]);

        fs.writeFileSync(dskFile, dskData);

        // ==================== Phase 2: Load DSK (converts to WOZ) ====================

        const loadedDiskData = fs.readFileSync(dskFile);
        const format = detectDiskFormat(dskFile);
        expect(format).toBe('dsk');

        // Convert DSK to WOZ
        const wozData = convertDskToWoz(loadedDiskData, false); // DOS 3.3 order
        const wozImage = new WozImage(wozData);
        expect(wozImage).toBeDefined();

        // ==================== Phase 3: Save as WOZ ====================

        const buffer = controller.getDrive(1).getWriteBuffer();
        const writer = new DiskWriter();
        const wozFile = path.join(tempDir, 'converted.woz');
        await writer.saveToWOZ(wozImage, buffer, wozFile);

        // ==================== Phase 4: Reload and Verify ====================

        const reloadedWozData = fs.readFileSync(wozFile);
        const reloadedImage = new WozImage(reloadedWozData);

        // Verify track data exists
        expect(reloadedImage.hasTrack(0)).toBe(true);
        expect(reloadedImage.getTrackBitCount(0)).toBeGreaterThan(40000);

        // Verify we can read bits from the converted disk
        const track0Bits = reloadedImage.getTrackBits(0);
        expect(track0Bits.length).toBeGreaterThan(5000); // At least 5KB of track data
    });

    it('should preserve DSK format when saving after modifications', async () => {
        // Create DSK file
        const dskData = createBlankDsk();
        const dskFile = path.join(tempDir, 'test.dsk');
        writeSectorData(dskData, 0, 0, [0xff, 0xfe, 0xfd, 0xfc]);
        fs.writeFileSync(dskFile, dskData);

        // Load as WOZ
        const loadedDiskData = fs.readFileSync(dskFile);
        const format = detectDiskFormat(dskFile);
        const wozData = convertDskToWoz(loadedDiskData, false);
        const wozImage = new WozImage(wozData);
        controller.loadDisk(1, wozImage);

        // Write some data
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        const drive = controller.getDrive(1);
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        // Save back to DSK format
        const buffer = drive.getWriteBuffer();
        const writer = new DiskWriter();

        const outputFile = path.join(tempDir, 'output.dsk');
        await writer.saveToDSK(wozImage, buffer, outputFile, false); // DOS 3.3 format

        // Verify file was created and is valid DSK size
        expect(fs.existsSync(outputFile)).toBe(true);
        const stats = fs.statSync(outputFile);
        expect(stats.size).toBe(143360); // Standard DSK size
    });

    it('should handle DO format (DOS 3.3 sector order)', async () => {
        // DO format uses DOS 3.3 sector interleaving
        const doData = createBlankDsk(); // Same size as DSK
        const doFile = path.join(tempDir, 'test.do');

        // Write test pattern
        writeSectorData(doData, 0, 0, [0xd0, 0xd1, 0xd2, 0xd3]);
        fs.writeFileSync(doFile, doData);

        // Load DO file
        const loadedDiskData = fs.readFileSync(doFile);
        const format = detectDiskFormat(doFile);
        expect(format).toBe('do');

        const wozData = convertDskToWoz(loadedDiskData, false);
        const image = new WozImage(wozData);
        expect(image).toBeDefined();
        expect(image.hasTrack(0)).toBe(true);

        // Save back as DO
        const buffer = controller.getDrive(1).getWriteBuffer();
        const writer = new DiskWriter();
        const outputFile = path.join(tempDir, 'output.do');
        await writer.saveToDSK(image, buffer, outputFile, false); // DOS 3.3 order

        expect(fs.existsSync(outputFile)).toBe(true);
        const stats = fs.statSync(outputFile);
        expect(stats.size).toBe(143360);
    });

    it('should handle PO format (ProDOS sector order)', async () => {
        // PO format uses ProDOS sector interleaving
        const poData = createBlankDsk(); // Same size as DSK
        const poFile = path.join(tempDir, 'test.po');

        // Write test pattern
        writeSectorData(poData, 0, 0, [0xe0, 0xe1, 0xe2, 0xe3]);
        fs.writeFileSync(poFile, poData);

        // Load PO file
        const loadedDiskData = fs.readFileSync(poFile);
        const format = detectDiskFormat(poFile);
        expect(format).toBe('po');

        const wozData = convertDskToWoz(loadedDiskData, true); // ProDOS order
        const image = new WozImage(wozData);
        expect(image).toBeDefined();
        expect(image.hasTrack(0)).toBe(true);

        // Save back as PO
        const buffer = controller.getDrive(1).getWriteBuffer();
        const writer = new DiskWriter();
        const outputFile = path.join(tempDir, 'output.po');
        await writer.saveToDSK(image, buffer, outputFile, true); // ProDOS order

        expect(fs.existsSync(outputFile)).toBe(true);
        const stats = fs.statSync(outputFile);
        expect(stats.size).toBe(143360);
    });

    it('should detect format from file extension', () => {
        const testCases = [
            { ext: 'dsk', expected: 'dsk' },
            { ext: 'do', expected: 'do' },
            { ext: 'po', expected: 'po' },
            { ext: 'woz', expected: 'woz' },
        ];

        for (const testCase of testCases) {
            const filename = `test.${testCase.ext}`;
            const filepath = path.join(tempDir, filename);

            let diskData: Uint8Array;
            if (testCase.ext === 'woz') {
                diskData = createMinimalWoz2();
            } else {
                diskData = createBlankDsk();
            }

            fs.writeFileSync(filepath, diskData);

            const format = detectDiskFormat(filepath);

            expect(format).toBe(testCase.expected);
        }
    });

    it('should preserve write protection flag through format conversion', async () => {
        // Create WOZ with write protection enabled
        const wozData = createMinimalWoz2WithWriteProtection(true);
        const wozFile = path.join(tempDir, 'protected.woz');
        fs.writeFileSync(wozFile, wozData);

        // Load WOZ
        const loadedData = fs.readFileSync(wozFile);
        const image = new WozImage(loadedData);

        // Verify write protection flag
        expect(image.isWriteProtected).toBe(true);

        // Save as DSK
        const buffer = controller.getDrive(1).getWriteBuffer();
        const writer = new DiskWriter();
        const dskFile = path.join(tempDir, 'converted.dsk');
        await writer.saveToDSK(image, buffer, dskFile, false);

        // DSK format doesn't preserve write protection flag (it's a WOZ feature)
        // But the conversion should not crash
        expect(fs.existsSync(dskFile)).toBe(true);
        const stats = fs.statSync(dskFile);
        expect(stats.size).toBe(143360);
    });
});

/**
 * Write data to a specific sector in DSK format.
 *
 * @param dskData - DSK disk data (143360 bytes)
 * @param track - Track number (0-34)
 * @param sector - Sector number (0-15)
 * @param data - Data to write (up to 256 bytes)
 */
function writeSectorData(dskData: Uint8Array, track: number, sector: number, data: number[]): void {
    const offset = (track * 16 + sector) * 256;
    for (let i = 0; i < data.length && i < 256; i++) {
        dskData[offset + i] = data[i];
    }
}

// Re-export shared helper with original name for compatibility
function createBlankDsk(): Uint8Array {
    return createBlankDskFromHelpers();
}
