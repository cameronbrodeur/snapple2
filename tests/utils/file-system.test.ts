import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    readDiskDirectory,
    truncateWithEllipsis,
    formatFileSize,
} from '../../src/utils/file-system.js';

describe('file-system utilities', () => {
    const testDir = join(tmpdir(), `snapple-test-${Date.now()}`);
    const subDir = join(testDir, 'subdir');

    beforeAll(() => {
        // Create test directory structure
        mkdirSync(testDir, { recursive: true });
        mkdirSync(subDir);

        // Create test files
        writeFileSync(join(testDir, 'game.dsk'), Buffer.alloc(143360));
        writeFileSync(join(testDir, 'save.woz'), Buffer.alloc(1000));
        writeFileSync(join(testDir, 'readme.txt'), 'Not a disk file');
        writeFileSync(join(testDir, '.hidden'), 'Hidden file');
    });

    afterAll(() => {
        // Clean up test directory
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('readDiskDirectory', () => {
        describe('default mode (load mode)', () => {
            it('returns directories and disk files', async () => {
                const entries = await readDiskDirectory(testDir);

                const names = entries.map((e) => e.name);
                expect(names).toContain('..');
                expect(names).toContain('subdir');
                expect(names).toContain('game.dsk');
                expect(names).toContain('save.woz');
            });

            it('excludes non-disk files', async () => {
                const entries = await readDiskDirectory(testDir);

                const names = entries.map((e) => e.name);
                expect(names).not.toContain('readme.txt');
            });

            it('excludes hidden files', async () => {
                const entries = await readDiskDirectory(testDir);

                const names = entries.map((e) => e.name);
                expect(names).not.toContain('.hidden');
            });

            it('sorts directories first, then files alphabetically', async () => {
                const entries = await readDiskDirectory(testDir);

                // Find indices
                const parentIdx = entries.findIndex((e) => e.name === '..');
                const subdirIdx = entries.findIndex((e) => e.name === 'subdir');
                const gameIdx = entries.findIndex((e) => e.name === 'game.dsk');
                const saveIdx = entries.findIndex((e) => e.name === 'save.woz');

                // Parent first, then directories, then files
                expect(parentIdx).toBe(0);
                expect(subdirIdx).toBeLessThan(gameIdx);
                expect(subdirIdx).toBeLessThan(saveIdx);
                // Files sorted alphabetically
                expect(gameIdx).toBeLessThan(saveIdx);
            });
        });

        describe('directoriesOnly mode', () => {
            it('returns only directories when directoriesOnly is true', async () => {
                const entries = await readDiskDirectory(testDir, { directoriesOnly: true });

                const names = entries.map((e) => e.name);
                expect(names).toContain('..');
                expect(names).toContain('subdir');
                expect(names).not.toContain('game.dsk');
                expect(names).not.toContain('save.woz');
            });

            it('returns only directory entries', async () => {
                const entries = await readDiskDirectory(testDir, { directoriesOnly: true });

                for (const entry of entries) {
                    expect(entry.isDirectory).toBe(true);
                }
            });

            it('still excludes hidden directories', async () => {
                const entries = await readDiskDirectory(testDir, { directoriesOnly: true });

                const names = entries.map((e) => e.name);
                expect(names).not.toContain('.hidden');
            });
        });
    });

    describe('truncateWithEllipsis', () => {
        it('returns original string if shorter than max', () => {
            expect(truncateWithEllipsis('hello', 10)).toBe('hello');
        });

        it('returns original string if equal to max', () => {
            expect(truncateWithEllipsis('hello', 5)).toBe('hello');
        });

        it('truncates with ellipsis if longer than max', () => {
            expect(truncateWithEllipsis('hello world', 8)).toBe('hello w…');
        });

        it('handles edge case of max length 1', () => {
            expect(truncateWithEllipsis('hello', 1)).toBe('…');
        });
    });

    describe('formatFileSize', () => {
        it('formats bytes under 1KB', () => {
            expect(formatFileSize(500)).toBe('500 B');
            expect(formatFileSize(0)).toBe('0 B');
        });

        it('formats KB values', () => {
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(2048)).toBe('2 KB');
            expect(formatFileSize(143360)).toBe('140 KB');
        });
    });
});
