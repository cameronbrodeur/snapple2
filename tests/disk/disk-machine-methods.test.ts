import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { RomConfig } from '../../src/rom/types.js';
import { createWoz2 } from './test-helpers.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

/**
 * Create minimal test ROM configuration.
 * All ROMs are 2KB except character ROM (2KB) and optional disk controller (256 bytes).
 */
function createTestRoms(): RomConfig {
    return {
        appleSoftD000: new Uint8Array(2048),
        appleSoftD800: new Uint8Array(2048),
        appleSoftE000: new Uint8Array(2048),
        appleSoftE800: new Uint8Array(2048),
        appleSoftF000: new Uint8Array(2048),
        monitor: new Uint8Array(2048),
        character: new Uint8Array(2048),
        diskController: new Uint8Array(256), // Enable Disk II
    };
}

/**
 * Create test ROM configuration without disk controller.
 */
function createTestRomsWithoutDiskController(): RomConfig {
    return {
        appleSoftD000: new Uint8Array(2048),
        appleSoftD800: new Uint8Array(2048),
        appleSoftE000: new Uint8Array(2048),
        appleSoftE800: new Uint8Array(2048),
        appleSoftF000: new Uint8Array(2048),
        monitor: new Uint8Array(2048),
        character: new Uint8Array(2048),
        // No diskController - Disk II disabled
    };
}

describe('Apple2Machine disk methods', () => {
    let machine: Apple2Machine;

    beforeEach(() => {
        const roms = createTestRoms();
        machine = new Apple2Machine(roms);
    });

    describe('getDiskName', () => {
        it('returns null when no disk loaded', () => {
            expect(machine.getDiskName(1)).toBeNull();
            expect(machine.getDiskName(2)).toBeNull();
        });

        it('returns filename without extension for loaded disk', () => {
            const wozData = createWoz2({ pattern: 0xaa });
            machine.loadDisk(1, wozData, '/path/to/game.woz');
            expect(machine.getDiskName(1)).toBe('game');
        });

        it('handles paths with multiple extensions', () => {
            const wozData = createWoz2({ pattern: 0xaa });
            machine.loadDisk(1, wozData, '/path/to/game.backup.woz');
            expect(machine.getDiskName(1)).toBe('game.backup');
        });

        it('handles files without extension', () => {
            const wozData = createWoz2({ pattern: 0xaa });
            machine.loadDisk(1, wozData, '/path/to/DISK');
            expect(machine.getDiskName(1)).toBe('DISK');
        });

        it('returns "Unknown" when disk loaded without filepath', () => {
            const wozData = createWoz2({ pattern: 0xaa });
            machine.loadDisk(1, wozData); // No filepath
            expect(machine.getDiskName(1)).toBe('Unknown');
        });

        it('handles Windows-style paths', () => {
            const wozData = createWoz2({ pattern: 0xaa });
            machine.loadDisk(1, wozData, 'C:\\Users\\test\\game.dsk');
            expect(machine.getDiskName(1)).toBe('game');
        });
    });

    describe('ejectDisk', () => {
        it('clears disk from drive', () => {
            const wozData = createWoz2({ pattern: 0xaa });
            machine.loadDisk(1, wozData, '/path/to/game.woz');
            expect(machine.getDiskName(1)).toBe('game');

            machine.ejectDisk(1);
            expect(machine.getDiskName(1)).toBeNull();
        });

        it('does not affect other drive', () => {
            const wozData1 = createWoz2({ pattern: 0xaa });
            const wozData2 = createWoz2({ pattern: 0x55 });
            machine.loadDisk(1, wozData1, '/path/to/disk1.woz');
            machine.loadDisk(2, wozData2, '/path/to/disk2.woz');

            machine.ejectDisk(1);
            expect(machine.getDiskName(1)).toBeNull();
            expect(machine.getDiskName(2)).toBe('disk2');
        });

        it('can eject from empty drive without error', () => {
            expect(() => machine.ejectDisk(1)).not.toThrow();
            expect(() => machine.ejectDisk(2)).not.toThrow();
        });
    });

    describe('loadDiskFromPath', () => {
        let tempDir: string;
        let tempFilePath: string;

        beforeEach(async () => {
            // Create temp directory for test files
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snapple2-test-'));
            tempFilePath = path.join(tempDir, 'test.woz');
        });

        afterEach(async () => {
            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });
        });

        it('loads disk from valid file path', async () => {
            const wozData = createWoz2({ pattern: 0xaa });
            await fs.writeFile(tempFilePath, wozData);

            await machine.loadDiskFromPath(1, tempFilePath);

            expect(machine.getDiskName(1)).toBe('test');
        });

        it('loads disk into drive 2', async () => {
            const wozData = createWoz2({ pattern: 0x55 });
            await fs.writeFile(tempFilePath, wozData);

            await machine.loadDiskFromPath(2, tempFilePath);

            expect(machine.getDiskName(2)).toBe('test');
        });

        it('throws when file does not exist', async () => {
            const nonExistentPath = path.join(tempDir, 'nonexistent.woz');

            await expect(machine.loadDiskFromPath(1, nonExistentPath)).rejects.toThrow();
        });
    });

    describe('without disk controller', () => {
        beforeEach(() => {
            const roms = createTestRomsWithoutDiskController();
            machine = new Apple2Machine(roms);
        });

        it('getDiskName returns null', () => {
            expect(machine.getDiskName(1)).toBeNull();
            expect(machine.getDiskName(2)).toBeNull();
        });

        it('ejectDisk does nothing without throwing', () => {
            expect(() => machine.ejectDisk(1)).not.toThrow();
            expect(() => machine.ejectDisk(2)).not.toThrow();
        });

        it('loadDiskFromPath throws when disk controller not enabled', async () => {
            // Create a temp file just to ensure the error is about the controller, not the file
            const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snapple2-test-'));
            const tempFilePath = path.join(tempDir, 'test.woz');
            const wozData = createWoz2({ pattern: 0xaa });
            await fs.writeFile(tempFilePath, wozData);

            try {
                await expect(machine.loadDiskFromPath(1, tempFilePath)).rejects.toThrow(
                    'Disk II not enabled',
                );
            } finally {
                await fs.rm(tempDir, { recursive: true, force: true });
            }
        });
    });
});
