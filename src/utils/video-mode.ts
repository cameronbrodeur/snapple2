/**
 * Video mode utilities.
 *
 * Functions for deriving video mode from hardware state.
 */

import { VideoMode, VideoState, TextPage } from '../emulator/types.js';
import { TERMINAL } from '../emulator/constants.js';
import { TerminalSize } from '../hooks/use-terminal-size.js';

/**
 * Derives the VideoMode enum value from video state flags.
 *
 * Priority order matches Apple II hardware behavior:
 * 1. Text mode takes precedence
 * 2. Mixed mode (graphics + 4 text rows)
 * 3. Hi-res mode
 * 4. Lo-res mode (default graphics)
 *
 * @param state - Current video state flags
 * @returns The derived VideoMode
 */
export function deriveVideoMode(state: VideoState): VideoMode {
    if (state.textMode) {
        return VideoMode.TEXT;
    }
    if (state.mixedMode) {
        return VideoMode.MIXED;
    }
    if (state.hiresMode) {
        return VideoMode.HIRES;
    }
    return VideoMode.LORES;
}

/**
 * Derives the active text page from video state.
 *
 * @param state - Current video state flags
 * @returns 1 or 2 for the active page
 */
export function deriveTextPage(state: VideoState): TextPage {
    return state.page2 ? 2 : 1;
}

/**
 * Checks if the terminal is too small for the current video mode.
 *
 * @param terminalSize - Current terminal dimensions
 * @param videoState - Current video state flags
 * @returns true if terminal is too small
 */
export function isTerminalTooSmall(terminalSize: TerminalSize, videoState: VideoState): boolean {
    const isHiresMode = videoState.hiresMode && !videoState.textMode;
    const minColumns = isHiresMode ? TERMINAL.HIRES_MIN_COLUMNS : TERMINAL.TEXT_MIN_COLUMNS;
    const minRows = isHiresMode ? TERMINAL.HIRES_MIN_ROWS : TERMINAL.TEXT_MIN_ROWS;

    return terminalSize.columns < minColumns || terminalSize.rows < minRows;
}

/**
 * Gets the minimum terminal size required for the current video mode.
 *
 * @param videoState - Current video state flags
 * @returns Required columns and rows
 */
export function getMinTerminalSize(videoState: VideoState): TerminalSize {
    const isHiresMode = videoState.hiresMode && !videoState.textMode;
    return {
        columns: isHiresMode ? TERMINAL.HIRES_MIN_COLUMNS : TERMINAL.TEXT_MIN_COLUMNS,
        rows: isHiresMode ? TERMINAL.HIRES_MIN_ROWS : TERMINAL.TEXT_MIN_ROWS,
    };
}
