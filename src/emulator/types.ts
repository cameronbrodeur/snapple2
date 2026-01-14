/**
 * Emulator Type Definitions
 *
 * Core types for the Apple II emulator.
 */

/**
 * Error handling policy for the emulator.
 *
 * Determines what happens when an error occurs during execution.
 */
export enum ErrorPolicy {
    /** Halt execution and throw error */
    HALT = 'halt',
    /** Log error and continue execution */
    LOG_CONTINUE = 'log',
    /** Ignore errors silently */
    IGNORE = 'ignore',
}

/**
 * Video display modes.
 */
export enum VideoMode {
    /** Text mode (40×24) */
    TEXT = 'text',
    /** Low-resolution graphics (40×48, 16 colors) */
    LORES = 'lores',
    /** High-resolution graphics (280×192, 6 colors) */
    HIRES = 'hires',
    /** Mixed mode (graphics + text) */
    MIXED = 'mixed',
}

/**
 * Text page selection.
 */
export type TextPage = 1 | 2;

/**
 * Terminal buffer for text display.
 *
 * Represents the 40×24 character grid displayed in the terminal.
 */
export type TerminalBuffer = string[][];

/**
 * Emulator state snapshot.
 */
export interface EmulatorState {
    /** Is emulator running? */
    running: boolean;
    /** Total cycles executed */
    cycles: number;
    /** Current video mode */
    videoMode: VideoMode;
    /** Current text page (1 or 2) */
    textPage: TextPage;
    /** Mixed mode enabled */
    mixedMode: boolean;
    /** CPU program counter */
    pc: number;
}

/**
 * Video system state.
 */
export interface VideoState {
    /** Text mode enabled */
    textMode: boolean;
    /** Hi-res mode enabled */
    hiresMode: boolean;
    /** Mixed mode enabled (graphics + text) */
    mixedMode: boolean;
    /** Page 2 active (otherwise page 1) */
    page2: boolean;
}
