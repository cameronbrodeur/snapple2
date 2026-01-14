/**
 * Text Page Memory Layout
 *
 * Apple II text/lo-res memory uses a non-sequential interleaved layout.
 * This module provides utilities for computing memory addresses.
 *
 * Memory layout explanation:
 * - 24 rows of 40 bytes each (960 bytes total)
 * - Rows are NOT stored sequentially
 * - Instead, organized in 3 groups of 8 rows each
 * - Group 1 (rows 0-7):   base + $000, $080, $100, $180, $200, $280, $300, $380
 * - Group 2 (rows 8-15):  base + $028, $0A8, $128, $1A8, $228, $2A8, $328, $3A8
 * - Group 3 (rows 16-23): base + $050, $0D0, $150, $1D0, $250, $2D0, $350, $3D0
 */

import { MEMORY } from '../emulator/constants.js';

/**
 * Row offset lookup table for Apple II text/lo-res memory.
 *
 * Index by row number (0-23) to get the offset from page base address.
 * Add column (0-39) to get the final address.
 *
 * Example: Address of row 10, col 5 on page 1 = 0x0400 + ROW_OFFSETS[10] + 5
 */
export const TEXT_ROW_OFFSETS: readonly number[] = [
    // Group 1: Rows 0-7
    0x000, 0x080, 0x100, 0x180, 0x200, 0x280, 0x300, 0x380,
    // Group 2: Rows 8-15
    0x028, 0x0a8, 0x128, 0x1a8, 0x228, 0x2a8, 0x328, 0x3a8,
    // Group 3: Rows 16-23
    0x050, 0x0d0, 0x150, 0x1d0, 0x250, 0x2d0, 0x350, 0x3d0,
];

/**
 * Compute memory address for a text page cell.
 *
 * @param page - Page number (1 or 2)
 * @param row - Row number (0-23)
 * @param col - Column number (0-39)
 * @returns Memory address
 */
export function getTextPageAddress(page: 1 | 2, row: number, col: number): number {
    const base = page === 1 ? MEMORY.TEXT_PAGE_1 : MEMORY.TEXT_PAGE_2;
    return base + TEXT_ROW_OFFSETS[row] + col;
}

/**
 * Create pre-computed address table for text/lo-res page.
 *
 * @param page - Page number (1 or 2)
 * @param rows - Number of rows (default 24)
 * @param cols - Number of columns (default 40)
 * @returns Pre-computed address array indexed by [row * cols + col]
 */
export function createTextPageAddresses(page: 1 | 2, rows = 24, cols = 40): Uint16Array {
    const addresses = new Uint16Array(rows * cols);
    const base = page === 1 ? MEMORY.TEXT_PAGE_1 : MEMORY.TEXT_PAGE_2;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            addresses[row * cols + col] = base + TEXT_ROW_OFFSETS[row] + col;
        }
    }

    return addresses;
}
