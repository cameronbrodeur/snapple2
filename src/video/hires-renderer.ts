/**
 * Hi-Res Graphics Renderer
 *
 * Renders Apple II 280x192 hi-res graphics to terminal using Unicode half-blocks.
 * Each vertical pixel pair is rendered as a single Unicode half-block character.
 *
 * Output dimensions: 280 columns x 96 rows (280x1 x 192/2)
 */

import { RamDevice } from 'cpu6502/bus';
import { toWord } from 'cpu6502/types';
import { TerminalBuffer, TextPage } from '../emulator/types.js';
import { MEMORY, VIDEO } from '../emulator/constants.js';
import { VideoRenderer } from './video-renderer.js';
import { CharacterRom } from './character-rom.js';
import { computeHiResAddresses } from './hires-memory.js';
import { HiResColor, getColorDef } from './hires-colors.js';
import { renderHalfBlockCell } from './half-block.js';
import { RGB } from './types.js';
import { TEXT_ROW_OFFSETS } from './text-page-memory.js';

/**
 * Mask to extract glyph index from Apple II character code.
 * Bits 0-5 (0x3F) identify the character shape; bits 6-7 indicate mode.
 */
const CHARACTER_GLYPH_INDEX_MASK = 0x3f;

/**
 * Hi-res mode renderer.
 *
 * Renders 280x192 hi-res graphics using Unicode half-blocks.
 *
 * PERFORMANCE: Uses cached ANSI strings from half-block.ts to avoid
 * per-frame string allocations. With only 6 HIRES colors, there are
 * at most 36 unique color combinations - all cached after warmup.
 *
 * Renders in-place into a pre-allocated buffer for zero GC pressure.
 */
export class HiResRenderer implements VideoRenderer {
    readonly bufferWidth = VIDEO.HIRES_OUTPUT_WIDTH;
    readonly bufferHeight = VIDEO.HIRES_OUTPUT_HEIGHT;

    private ram: RamDevice;
    private characterRom: CharacterRom;
    private addresses: Uint16Array;
    private mixedMode: boolean;
    private page: TextPage;

    /**
     * Create hi-res renderer.
     *
     * @param ram - RAM device for reading graphics memory
     * @param characterRom - Character ROM (for mixed mode text)
     * @param page - Graphics page (1 or 2)
     * @param mixedMode - Enable mixed mode (graphics + 4 text rows)
     */
    constructor(ram: RamDevice, characterRom: CharacterRom, page: TextPage, mixedMode: boolean) {
        this.ram = ram;
        this.characterRom = characterRom;
        this.page = page;
        this.mixedMode = mixedMode;
        this.addresses = computeHiResAddresses(page);
    }

    /**
     * Render hi-res graphics buffer in-place.
     *
     * @param target - Pre-allocated buffer to fill (280x96)
     * @param _showFlash - Flash state (unused in hi-res mode)
     */
    render(target: TerminalBuffer, _showFlash: boolean): void {
        // Number of scanlines to render as graphics
        const graphicsScanlines = this.mixedMode
            ? VIDEO.MIXED_GRAPHICS_SCANLINES
            : VIDEO.HIRES_SCANLINES;

        // Render 2 scanlines per row (280 pixels -> 280 half-blocks per row)
        for (let scanPair = 0; scanPair < graphicsScanlines / 2; scanPair++) {
            const topScanline = scanPair * 2;
            const bottomScanline = topScanline + 1;
            const line = target[scanPair];

            // Process each pixel column (280 columns)
            for (let pixelX = 0; pixelX < VIDEO.HIRES_OUTPUT_WIDTH; pixelX++) {
                // Get colors for the vertical pixel pair with cross-byte adjacency
                const topColor = this.getPixelColorWithAdjacency(topScanline, pixelX);
                const bottomColor = this.getPixelColorWithAdjacency(bottomScanline, pixelX);

                // Render as half-block character (cached in half-block.ts, no string allocation)
                line[pixelX] = renderHalfBlockCell(topColor, bottomColor);
            }
        }

        // Mixed mode: render bottom 32 scanlines as text (as pixels)
        if (this.mixedMode) {
            this.renderMixedModeText(target, graphicsScanlines / 2);
        }
    }

    /**
     * Get pixel color with cross-byte adjacency for WHITE detection.
     *
     * Apple II artifact colors are created by alternating ON/OFF bit patterns.
     * On a real TV, NTSC signal bleeding makes these appear as solid colors.
     * This method fills OFF pixels ONLY when they're in the middle of an
     * alternating artifact pattern (both neighbors are isolated ON pixels).
     */
    private getPixelColorWithAdjacency(scanline: number, pixelX: number): RGB {
        const pixelsPerByte = VIDEO.HIRES_PIXELS_PER_BYTE;
        const bytesPerLine = VIDEO.HIRES_BYTES_PER_LINE;

        const byteIndex = Math.floor(pixelX / pixelsPerByte);
        const bitIndex = pixelX % pixelsPerByte;

        const address = this.addresses[scanline * bytesPerLine + byteIndex];
        const byte = this.ram.read(toWord(address));

        const highBit = (byte >> 7) & 1;
        const pattern = byte & 0x7f;
        const pixelOn = (pattern >> bitIndex) & 1;
        const pixelColumn = byteIndex * pixelsPerByte + bitIndex;
        const isEvenColumn = pixelColumn % 2 === 0;

        // Get adjacent pixel states (including cross-byte)
        const { prevOn, nextOn } = this.getAdjacentPixels(scanline, byteIndex, bitIndex, pattern);

        if (pixelOn) {
            // ON pixel: determine if WHITE or artifact color
            if (prevOn || nextOn) {
                // Adjacent to another ON pixel = WHITE
                return this.getColorRGB(HiResColor.WHITE);
            } else {
                // Isolated ON pixel = artifact color
                return this.getArtifactColorRGB(isEvenColumn, highBit);
            }
        } else {
            // OFF pixel: fill if surrounded by ON pixels and at least one is artifact-colored
            // This handles transitions between white and artifact areas correctly
            if (prevOn && nextOn) {
                const prevPrevOn = this.getPixelState(scanline, pixelX - 2);
                const nextNextOn = this.getPixelState(scanline, pixelX + 2);

                // Check if neighbors are artifact-colored (isolated) vs white (adjacent)
                const prevIsArtifact = !prevPrevOn;
                const nextIsArtifact = !nextNextOn;

                // Fill if at least one neighbor is artifact-colored
                if (prevIsArtifact || nextIsArtifact) {
                    // Use the artifact color from whichever neighbor is artifact
                    // Prefer prev if both are artifact (arbitrary but consistent)
                    const sourcePixel = prevIsArtifact ? pixelX - 1 : pixelX + 1;
                    const sourceColumn = prevIsArtifact ? pixelColumn - 1 : pixelColumn + 1;
                    const sourceIsEven = sourceColumn % 2 === 0;
                    const sourceHighBit = this.getHighBit(scanline, sourcePixel);
                    return this.getArtifactColorRGB(sourceIsEven, sourceHighBit);
                }
            }

            // Not surrounded by ON pixels, or both neighbors are white - black
            return this.getColorRGB(HiResColor.BLACK);
        }
    }

    /**
     * Get adjacent pixel ON states, handling cross-byte boundaries.
     */
    private getAdjacentPixels(
        scanline: number,
        byteIndex: number,
        bitIndex: number,
        pattern: number,
    ): { prevOn: boolean; nextOn: boolean } {
        const pixelsPerByte = VIDEO.HIRES_PIXELS_PER_BYTE;
        const bytesPerLine = VIDEO.HIRES_BYTES_PER_LINE;

        let prevOn = false;
        let nextOn = false;

        if (bitIndex > 0) {
            prevOn = ((pattern >> (bitIndex - 1)) & 1) === 1;
        } else if (byteIndex > 0) {
            const prevAddress = this.addresses[scanline * bytesPerLine + byteIndex - 1];
            const prevByte = this.ram.read(toWord(prevAddress));
            prevOn = ((prevByte >> 6) & 1) === 1;
        }

        if (bitIndex < pixelsPerByte - 1) {
            nextOn = ((pattern >> (bitIndex + 1)) & 1) === 1;
        } else if (byteIndex < bytesPerLine - 1) {
            const nextAddress = this.addresses[scanline * bytesPerLine + byteIndex + 1];
            const nextByte = this.ram.read(toWord(nextAddress));
            nextOn = (nextByte & 1) === 1;
        }

        return { prevOn, nextOn };
    }

    /**
     * Get pixel ON state at arbitrary position.
     */
    private getPixelState(scanline: number, pixelX: number): boolean {
        if (pixelX < 0 || pixelX >= VIDEO.HIRES_OUTPUT_WIDTH) return false;

        const pixelsPerByte = VIDEO.HIRES_PIXELS_PER_BYTE;
        const bytesPerLine = VIDEO.HIRES_BYTES_PER_LINE;

        const byteIndex = Math.floor(pixelX / pixelsPerByte);
        const bitIndex = pixelX % pixelsPerByte;
        const address = this.addresses[scanline * bytesPerLine + byteIndex];
        const byte = this.ram.read(toWord(address));

        return ((byte >> bitIndex) & 1) === 1;
    }

    /**
     * Get high bit for pixel at arbitrary position.
     */
    private getHighBit(scanline: number, pixelX: number): number {
        if (pixelX < 0 || pixelX >= VIDEO.HIRES_OUTPUT_WIDTH) return 0;

        const pixelsPerByte = VIDEO.HIRES_PIXELS_PER_BYTE;
        const bytesPerLine = VIDEO.HIRES_BYTES_PER_LINE;

        const byteIndex = Math.floor(pixelX / pixelsPerByte);
        const address = this.addresses[scanline * bytesPerLine + byteIndex];
        const byte = this.ram.read(toWord(address));

        return (byte >> 7) & 1;
    }

    /**
     * Get artifact color RGB based on column parity and high bit.
     */
    private getArtifactColorRGB(isEvenColumn: boolean, highBit: number): RGB {
        let color: HiResColor;
        if (highBit) {
            color = isEvenColumn ? HiResColor.BLUE : HiResColor.ORANGE;
        } else {
            color = isEvenColumn ? HiResColor.PURPLE : HiResColor.GREEN;
        }
        return this.getColorRGB(color);
    }

    /**
     * Convert HiResColor to RGB.
     */
    private getColorRGB(color: HiResColor): RGB {
        const colorDef = getColorDef(color);
        return {
            r: colorDef.rgb[0],
            g: colorDef.rgb[1],
            b: colorDef.rgb[2],
        };
    }

    /**
     * Render mixed mode text rows as pixels in-place.
     * Renders bottom 4 text rows (32 scanlines) as half-blocks.
     *
     * @param target - Pre-allocated buffer to fill
     * @param startRow - Starting row index in target buffer
     */
    private renderMixedModeText(target: TerminalBuffer, startRow: number): void {
        const textBase = this.page === 1 ? MEMORY.TEXT_PAGE_1 : MEMORY.TEXT_PAGE_2;
        const bytesPerLine = VIDEO.HIRES_BYTES_PER_LINE;
        const pixelsPerByte = VIDEO.HIRES_PIXELS_PER_BYTE;
        const outputWidth = VIDEO.HIRES_OUTPUT_WIDTH;
        const mixedTextRows = VIDEO.MIXED_TEXT_ROWS;

        const white = this.getColorRGB(HiResColor.WHITE);
        const black = this.getColorRGB(HiResColor.BLACK);

        let outputRow = startRow;

        // Render mixed mode text rows (rows 20-23) as graphics
        const startTextRow = VIDEO.TEXT_ROWS - mixedTextRows;
        for (let textRow = startTextRow; textRow < VIDEO.TEXT_ROWS; textRow++) {
            const rowOffset = TEXT_ROW_OFFSETS[textRow];

            // Each text row = 8 scanlines, rendered as 4 half-block rows
            for (let charScanPair = 0; charScanPair < 4; charScanPair++) {
                const line = target[outputRow];
                let pixelX = 0;

                for (let charCol = 0; charCol < bytesPerLine; charCol++) {
                    const charAddr = textBase + rowOffset + charCol;
                    const charCode = this.ram.read(toWord(charAddr));
                    const glyph = this.characterRom.getCharacterGlyph(
                        charCode & CHARACTER_GLYPH_INDEX_MASK,
                    );

                    const topGlyphRow = glyph[charScanPair * 2] || 0;
                    const bottomGlyphRow = glyph[charScanPair * 2 + 1] || 0;

                    // Each character is 7 pixels wide
                    for (let px = 0; px < pixelsPerByte; px++) {
                        const topOn = (topGlyphRow >> (6 - px)) & 1;
                        const bottomOn = (bottomGlyphRow >> (6 - px)) & 1;

                        const topColor = topOn ? white : black;
                        const bottomColor = bottomOn ? white : black;

                        line[pixelX++] = renderHalfBlockCell(topColor, bottomColor);
                    }
                }

                // Pad remaining columns to exactly 280 with black
                while (pixelX < outputWidth) {
                    line[pixelX++] = renderHalfBlockCell(black, black);
                }

                outputRow++;
            }
        }
    }
}
