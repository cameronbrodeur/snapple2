/**
 * Terminal key escape sequences.
 *
 * Centralized definitions for function key and special key sequences
 * used by keyboard input handlers.
 */

/**
 * Function key escape sequences.
 *
 * Each key can have multiple sequences depending on terminal emulator:
 * - SS3 format: \x1bO{letter} (F1-F4 on some terminals)
 * - CSI format: \x1b[{number}~ (standard xterm sequences)
 */
export const FUNCTION_KEYS = {
    F1: { SS3: '\x1bOP', CSI: '\x1b[11~' },
    F2: { SS3: '\x1bOQ', CSI: '\x1b[12~' },
    F3: { SS3: '\x1bOR', CSI: '\x1b[13~' },
    F4: { SS3: '\x1bOS', CSI: '\x1b[14~' },
    F5: { CSI: '\x1b[15~' },
    F6: { CSI: '\x1b[17~' },
    F7: { CSI: '\x1b[18~' },
    F8: { CSI: '\x1b[19~' },
    F9: { CSI: '\x1b[20~' },
    F10: { CSI: '\x1b[21~' },
} as const;

/**
 * Get all sequences for a function key as an array.
 *
 * @param key - Function key name (e.g., 'F1')
 * @returns Array of escape sequences for the key
 */
export function getFunctionKeySequences(key: keyof typeof FUNCTION_KEYS): string[] {
    const keyDef = FUNCTION_KEYS[key];
    const sequences: string[] = [];
    if ('SS3' in keyDef) sequences.push(keyDef.SS3);
    if ('CSI' in keyDef) sequences.push(keyDef.CSI);
    return sequences;
}

/** Standalone Escape key */
export const ESCAPE_KEY = '\x1b';

/** Timeout to distinguish standalone Esc from escape sequences (ms) */
export const ESCAPE_TIMEOUT_MS = 50;
