/**
 * Tests for createBlankDisk utility.
 *
 * Verifies blank disk creation for DSK and WOZ formats with proper
 * DOS 3.3 structure initialization.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createBlankDisk, CreateDiskResult } from '../../src/disk/create-blank-disk.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

describe('createBlankDisk', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snapple2-test-'));
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('DSK format', () => {
        it('creates a 143360-byte DSK file', async () => {
            const filePath = path.join(tempDir, 'test.dsk');
            const result = await createBlankDisk(filePath);

            expect(result.success).toBe(true);
            const stats = await fs.stat(filePath);
            expect(stats.size).toBe(143360);
        });

        it('creates valid DOS 3.3 structure', async () => {
            const filePath = path.join(tempDir, 'test.dsk');
            await createBlankDisk(filePath);

            const data = await fs.readFile(filePath);
            // VTOC at track 17, sector 0, byte 6 should be volume number (254)
            const vtocOffset = 17 * 16 * 256;
            expect(data[vtocOffset + 0x06]).toBe(254);
        });
    });

    describe('WOZ format', () => {
        it('creates a WOZ file larger than DSK', async () => {
            const filePath = path.join(tempDir, 'test.woz');
            const result = await createBlankDisk(filePath);

            expect(result.success).toBe(true);
            const stats = await fs.stat(filePath);
            expect(stats.size).toBeGreaterThan(143360);
        });

        it('creates valid WOZ1 header', async () => {
            const filePath = path.join(tempDir, 'test.woz');
            await createBlankDisk(filePath);

            const data = await fs.readFile(filePath);
            // WOZ1 magic: "WOZ1" followed by 0xFF 0x0A 0x0D 0x0A
            expect(data[0]).toBe(0x57); // 'W'
            expect(data[1]).toBe(0x4f); // 'O'
            expect(data[2]).toBe(0x5a); // 'Z'
            expect(data[3]).toBe(0x31); // '1'
        });
    });

    describe('.do extension', () => {
        it('creates DSK format for .do extension', async () => {
            const filePath = path.join(tempDir, 'test.do');
            const result = await createBlankDisk(filePath);

            expect(result.success).toBe(true);
            const stats = await fs.stat(filePath);
            expect(stats.size).toBe(143360);
        });
    });

    describe('error handling', () => {
        it('returns error if file already exists', async () => {
            const filePath = path.join(tempDir, 'existing.dsk');
            await fs.writeFile(filePath, 'dummy');

            const result = await createBlankDisk(filePath);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('exists');
            }
        });

        it('returns error for invalid extension', async () => {
            const filePath = path.join(tempDir, 'test.txt');

            const result = await createBlankDisk(filePath);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('invalid-extension');
            }
        });
    });
});
