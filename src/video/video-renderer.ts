/**
 * Video Renderer Interface
 *
 * Interface for rendering different video modes.
 */

import { TerminalBuffer } from '../emulator/types.js';

/**
 * Video renderer interface.
 *
 * Implementations render the video buffer for different modes (text, lores, hires).
 */
export interface VideoRenderer {
    /**
     * Render into the provided buffer in-place.
     *
     * @param target - Pre-allocated buffer to fill
     * @param showFlash - Flash state for blinking characters (true = show, false = hide)
     */
    render(target: TerminalBuffer, showFlash: boolean): void;

    /** Buffer width in columns */
    readonly bufferWidth: number;

    /** Buffer height in rows */
    readonly bufferHeight: number;
}
