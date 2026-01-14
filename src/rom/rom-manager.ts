/**
 * ROM Manager
 *
 * Handles loading and validation of Apple II Plus ROM files.
 */

import { readFile, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { RomConfig, RomPaths, ROM_FILES, ROM_SIZE } from './types.js';

/**
 * Error thrown when ROM loading fails.
 */
export class RomLoadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RomLoadError';
    }
}

/**
 * Get ROM search paths in priority order.
 *
 * Search order:
 * 1. Explicit romsDir parameter
 * 2. SNAPPLE_ROMS_DIR environment variable
 * 3. ./roms/ (current working directory)
 * 4. ~/.snapple2/roms/ (user home directory)
 */
function getRomSearchPaths(paths?: RomPaths): string[] {
    const searchPaths: string[] = [];

    // 1. Explicit romsDir parameter (highest priority)
    if (paths?.romsDir) {
        searchPaths.push(paths.romsDir);
    }

    // 2. Environment variable
    const envDir = process.env.SNAPPLE_ROMS_DIR;
    if (envDir) {
        searchPaths.push(envDir);
    }

    // 3. Current working directory
    searchPaths.push(join(process.cwd(), 'roms'));

    // 4. User home directory
    searchPaths.push(join(homedir(), '.snapple2', 'roms'));

    return searchPaths;
}

/**
 * Check if a file exists and is readable.
 */
async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path, constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Find the first directory that contains all required ROM files.
 */
async function findRomDirectory(searchPaths: string[]): Promise<string | null> {
    for (const dir of searchPaths) {
        // Check if all ROM files exist in this directory
        const allFilesExist = await Promise.all(
            Object.values(ROM_FILES).map((info) => fileExists(join(dir, info.filename))),
        );

        if (allFilesExist.every((exists) => exists)) {
            return dir;
        }
    }

    return null;
}

/**
 * Load a single ROM file and validate its size.
 */
async function loadRomFile(path: string, expectedSize: number): Promise<Uint8Array> {
    try {
        const data = await readFile(path);

        if (data.length !== expectedSize) {
            throw new RomLoadError(
                `Invalid ROM size: ${path}\n` +
                    `Expected ${expectedSize} bytes, got ${data.length} bytes.\n` +
                    `ROM files must be exactly ${expectedSize} bytes (${expectedSize / 1024}KB) each.\n` +
                    `See roms/README.md for details.`,
            );
        }

        return new Uint8Array(data);
    } catch (error) {
        if (error instanceof RomLoadError) {
            throw error;
        }
        throw new RomLoadError(`Failed to read ROM file: ${path}\n${error}`);
    }
}

/**
 * Load all Apple II Plus ROM files.
 *
 * @param paths - Optional ROM paths configuration
 * @returns ROM configuration with all loaded ROM data
 * @throws {RomLoadError} If ROM files cannot be found or loaded
 *
 * @example
 * ```typescript
 * // Use default search locations
 * const roms = await loadRoms();
 *
 * // Use explicit directory
 * const roms = await loadRoms({ romsDir: '/path/to/roms' });
 *
 * // Use environment variable
 * process.env.SNAPPLE_ROMS_DIR = '/path/to/roms';
 * const roms = await loadRoms();
 * ```
 */
export async function loadRoms(paths?: RomPaths): Promise<RomConfig> {
    const searchPaths = getRomSearchPaths(paths);

    // Find directory containing all ROM files
    const romDir = await findRomDirectory(searchPaths);

    if (!romDir) {
        const searchPathsList = searchPaths.map((p) => `  - ${p}`).join('\n');
        const filesList = Object.values(ROM_FILES)
            .map((info) => `  - ${info.filename}`)
            .join('\n');

        throw new RomLoadError(
            `ROM files not found.\n\n` +
                `Searched in:\n${searchPathsList}\n\n` +
                `Required files (all ${ROM_SIZE} bytes each):\n${filesList}\n\n` +
                `Please place ROM files in one of the above directories, or specify a custom location:\n` +
                `  - Set environment variable: export SNAPPLE_ROMS_DIR=/path/to/roms\n` +
                `  - Use CLI flag: --roms-dir /path/to/roms\n\n` +
                `See roms/README.md for instructions on obtaining ROM files.`,
        );
    }

    // Load all ROM files
    try {
        const [
            appleSoftD000,
            appleSoftD800,
            appleSoftE000,
            appleSoftE800,
            appleSoftF000,
            monitor,
            character,
        ] = await Promise.all([
            loadRomFile(join(romDir, ROM_FILES.appleSoftD000.filename), ROM_SIZE),
            loadRomFile(join(romDir, ROM_FILES.appleSoftD800.filename), ROM_SIZE),
            loadRomFile(join(romDir, ROM_FILES.appleSoftE000.filename), ROM_SIZE),
            loadRomFile(join(romDir, ROM_FILES.appleSoftE800.filename), ROM_SIZE),
            loadRomFile(join(romDir, ROM_FILES.appleSoftF000.filename), ROM_SIZE),
            loadRomFile(join(romDir, ROM_FILES.monitor.filename), ROM_SIZE),
            loadRomFile(join(romDir, ROM_FILES.character.filename), ROM_SIZE),
        ]);

        // Try loading disk controller ROM (optional)
        let diskController: Uint8Array | undefined;
        try {
            diskController = await loadRomFile(join(romDir, 'disk-controller.bin'), 256);
        } catch (error) {
            // Disk controller ROM is optional - differentiate between missing and invalid
            if (error instanceof RomLoadError && error.message.includes('Invalid ROM size')) {
                console.warn(`Disk II controller ROM invalid: ${error.message}`);
            } else {
                console.log('Disk II controller ROM not found - Disk II disabled');
            }
            diskController = undefined;
        }

        return {
            appleSoftD000,
            appleSoftD800,
            appleSoftE000,
            appleSoftE800,
            appleSoftF000,
            monitor,
            character,
            diskController,
        };
    } catch (error) {
        if (error instanceof RomLoadError) {
            throw error;
        }
        throw new RomLoadError(`Failed to load ROM files from ${romDir}\n${error}`);
    }
}

/**
 * Verify ROM files exist and have correct sizes without loading them.
 *
 * @param paths - Optional ROM paths configuration
 * @returns true if all ROMs are valid
 * @throws {RomLoadError} If ROM files cannot be found or are invalid
 */
export async function verifyRoms(paths?: RomPaths): Promise<boolean> {
    await loadRoms(paths);
    return true;
}
