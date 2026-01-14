/**
 * Hi-Res Memory Address Computation
 *
 * Apple II hi-res memory uses interleaved addressing across 192 scanlines.
 * Each page is 8KB ($2000-$3FFF for page 1, $4000-$5FFF for page 2).
 *
 * The 192 scanlines are organized into 3 groups of 64, with each group
 * further subdivided into 8 sections of 8 lines. Lines within a section
 * are spaced $0400 apart; sections are spaced $0080 apart.
 */

import { TextPage } from '../emulator/types.js';
import { MEMORY, VIDEO } from '../emulator/constants.js';

/**
 * Compute memory offset for a hi-res scanline.
 *
 * Layout (per group of 64 scanlines):
 * - Lines 0,8,16,24,32,40,48,56 are at offsets $0000,$0080,$0100,...,$0380
 * - Lines 1,9,17,25,33,41,49,57 are at offsets $0400,$0480,$0500,...,$0780
 * - etc.
 */
function computeScanlineOffset(scanline: number): number {
    const group = Math.floor(scanline / 64);
    const groupOffset = [0x0000, 0x0028, 0x0050][group];

    const lineInGroup = scanline % 64;
    const section = Math.floor(lineInGroup / 8); // 0-7
    const lineInSection = lineInGroup % 8; // 0-7

    return groupOffset + section * 0x0080 + lineInSection * 0x0400;
}

/**
 * Get memory address for a specific scanline and byte position.
 *
 * @param page - Hi-res page (1 or 2)
 * @param scanline - Scanline number (0-191)
 * @param byteIndex - Byte index within scanline (0-39)
 * @returns Memory address
 */
export function getHiResScanlineAddress(
    page: TextPage,
    scanline: number,
    byteIndex: number,
): number {
    const base = page === 1 ? MEMORY.HIRES_PAGE_1 : MEMORY.HIRES_PAGE_2;
    const offset = computeScanlineOffset(scanline);
    return base + offset + byteIndex;
}

/**
 * Pre-compute all hi-res memory addresses for a page.
 *
 * @param page - Hi-res page (1 or 2)
 * @returns Uint16Array of 192×40 addresses
 */
export function computeHiResAddresses(page: TextPage): Uint16Array {
    const scanlines = VIDEO.HIRES_SCANLINES;
    const bytesPerLine = VIDEO.HIRES_BYTES_PER_LINE;
    const addresses = new Uint16Array(scanlines * bytesPerLine);

    for (let scanline = 0; scanline < scanlines; scanline++) {
        for (let byteIndex = 0; byteIndex < bytesPerLine; byteIndex++) {
            addresses[scanline * bytesPerLine + byteIndex] = getHiResScanlineAddress(
                page,
                scanline,
                byteIndex,
            );
        }
    }

    return addresses;
}
