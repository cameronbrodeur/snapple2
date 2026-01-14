/**
 * Create blank DOS 3.3 disk utility.
 *
 * Creates a new blank disk file in DSK or WOZ format.
 */

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { buildBlankDos33Dsk } from './blank-dos33-data.js';
import { convertDskToWoz } from './disk-formats.js';

export type CreateDiskResult =
    | { success: true; filePath: string }
    | { success: false; error: 'exists' | 'invalid-extension' | 'write-failed'; message?: string };

/**
 * Create a blank DOS 3.3 disk at the specified path.
 *
 * Format is determined by file extension:
 * - .dsk, .do - DSK format (143,360 bytes)
 * - .woz - WOZ1 format
 *
 * @param filePath - Full path where disk will be created
 * @returns Result indicating success or error type
 */
export async function createBlankDisk(filePath: string): Promise<CreateDiskResult> {
    // Check if file already exists
    if (existsSync(filePath)) {
        return { success: false, error: 'exists' };
    }

    // Determine format from extension
    const extension = filePath.toLowerCase().split('.').pop();
    if (!extension || !['dsk', 'do', 'woz'].includes(extension)) {
        return { success: false, error: 'invalid-extension' };
    }

    try {
        // Build blank DOS 3.3 disk
        const dskData = buildBlankDos33Dsk();

        // Convert to WOZ if needed
        let outputData: Uint8Array;
        if (extension === 'woz') {
            outputData = convertDskToWoz(dskData, false);
        } else {
            outputData = dskData;
        }

        // Write file
        await writeFile(filePath, outputData);

        return { success: true, filePath };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: 'write-failed', message };
    }
}
