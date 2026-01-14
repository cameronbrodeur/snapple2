/**
 * Language Card Types
 *
 * State and configuration types for the Apple II Language Card.
 */

/**
 * Language Card state for save/restore.
 */
export interface LanguageCardState {
    /** Bank 1 RAM ($D000-$DFFF when bank 1 selected) - 4KB */
    bank1Ram: Uint8Array;
    /** Bank 2 RAM ($D000-$DFFF when bank 2 selected) - 4KB */
    bank2Ram: Uint8Array;
    /** Upper RAM ($E000-$FFFF) - 8KB, shared between banks */
    upperRam: Uint8Array;
    /** Currently selected bank (1 or 2) */
    selectedBank: 1 | 2;
    /** Whether reads come from RAM (true) or ROM (false) */
    readFromRam: boolean;
    /** Whether writes to RAM are enabled */
    writeEnabled: boolean;
    /** Pre-write flag for 2-access sequence */
    preWriteFlag: boolean;
}

/**
 * Create initial Language Card state with all RAM zeroed.
 *
 * @returns Fresh state with bank 2 selected, ROM reads, writes disabled
 */
export function createInitialLanguageCardState(): LanguageCardState {
    return {
        bank1Ram: new Uint8Array(0x1000), // 4KB
        bank2Ram: new Uint8Array(0x1000), // 4KB
        upperRam: new Uint8Array(0x2000), // 8KB
        selectedBank: 2,
        readFromRam: false,
        writeEnabled: false,
        preWriteFlag: false,
    };
}
