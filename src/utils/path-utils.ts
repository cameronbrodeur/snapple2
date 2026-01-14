/**
 * Cross-platform path utilities.
 *
 * Handles path parsing that works regardless of the current OS,
 * useful when paths from different platforms are stored/loaded.
 */

import path from 'node:path';

/**
 * Extract the filename without extension from a path.
 * Handles both Unix (/) and Windows (\) path separators.
 *
 * @param filepath - File path (Unix or Windows style)
 * @returns Filename without extension, or the basename if no extension
 *
 * @example
 * extractBasename('/home/user/game.dsk')      // 'game'
 * extractBasename('C:\\Users\\test\\game.dsk') // 'game'
 * extractBasename('game.woz')                  // 'game'
 * extractBasename('noextension')               // 'noextension'
 */
export function extractBasename(filepath: string): string {
    // Use path.win32 for Windows-style paths (backslashes), path.posix otherwise
    const pathModule = filepath.includes('\\') ? path.win32 : path.posix;
    const { name } = pathModule.parse(filepath);
    return name || pathModule.basename(filepath);
}
