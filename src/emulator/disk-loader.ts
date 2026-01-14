/**
 * Disk image loading utilities.
 *
 * Handles reading disk files and converting between formats.
 * Separated from Apple2Machine to keep file I/O concerns isolated.
 */

import { detectDiskFormat, convertDskToWoz, isProDOSFormat } from '../disk/index.js';

export type DiskFormat = 'woz' | 'dsk' | 'do' | 'po';

/**
 * Load a disk image from a file path.
 * Reads the file and converts to WOZ format if needed.
 *
 * @param filePath - Absolute path to disk image file
 * @returns WOZ-format disk data ready for loading
 * @throws Error if format is unknown or file cannot be read
 */
export async function loadDiskImageFromPath(filePath: string): Promise<Uint8Array> {
    const format = detectDiskFormat(filePath);
    if (!format) {
        throw new Error('Unknown disk format. Supported: .woz, .dsk, .do, .po');
    }

    const fs = await import('fs/promises');
    const diskData = new Uint8Array(await fs.readFile(filePath));

    if (format === 'woz') {
        return diskData;
    }

    // Convert DSK/DO/PO to WOZ
    const isProDOS = isProDOSFormat(filePath);
    return convertDskToWoz(diskData, isProDOS);
}
