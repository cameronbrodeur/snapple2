/**
 * File system utilities for the file browser.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/** Supported disk image extensions */
export const DISK_EXTENSIONS = ['.dsk', '.do', '.po', '.woz'];

export interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
}

export interface ReadDirectoryOptions {
    /** If true, only return directories (no disk files) */
    directoriesOnly?: boolean;
}

/**
 * Read directory contents, filtering to directories and disk images.
 *
 * Returns entries sorted with directories first (alphabetically), then
 * disk files (alphabetically). Hidden files are excluded.
 *
 * @param dirPath - Absolute path to directory to read
 * @param options - Optional settings (e.g., directoriesOnly)
 * @returns Array of file entries with directories first
 */
export async function readDiskDirectory(
    dirPath: string,
    options: ReadDirectoryOptions = {},
): Promise<FileEntry[]> {
    const { directoriesOnly = false } = options;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results: FileEntry[] = [];

    // Add parent directory entry (unless at root)
    if (dirPath !== '/') {
        results.push({ name: '..', isDirectory: true });
    }

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // Skip hidden files

        if (entry.isDirectory()) {
            results.push({ name: entry.name, isDirectory: true });
        } else if (!directoriesOnly) {
            const ext = path.extname(entry.name).toLowerCase();
            if (DISK_EXTENSIONS.includes(ext)) {
                const stat = await fs.stat(path.join(dirPath, entry.name));
                results.push({
                    name: entry.name,
                    isDirectory: false,
                    size: stat.size,
                });
            }
        }
    }

    // Sort: directories first, then files, alphabetically
    results.sort((a, b) => {
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    return results;
}

/**
 * Format file size for display (e.g., "143360 B" or "140 KB").
 *
 * @param bytes - File size in bytes
 * @returns Human-readable size string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = Math.round(bytes / 1024);
    return `${kb} KB`;
}

/**
 * Truncate a string with ellipsis if it exceeds max length.
 *
 * @param text - String to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Original string or truncated version with trailing '…'
 */
export function truncateWithEllipsis(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
}
