/**
 * Apple II Emulator Constants
 *
 * Memory addresses, timing parameters, and other constants.
 */

/**
 * Memory address constants for Apple II Plus.
 */
export const MEMORY = {
    /** Text/Lo-res page 1 start address ($0400) */
    TEXT_PAGE_1: 0x0400,
    /** Text/Lo-res page 2 start address ($0800) */
    TEXT_PAGE_2: 0x0800,
    /** Hi-res page 1 start address ($2000) */
    HIRES_PAGE_1: 0x2000,
    /** Hi-res page 2 start address ($4000) */
    HIRES_PAGE_2: 0x4000,
    /**
     * Power-up byte ($03F4).
     * Monitor ROM checks if ($03F4 EOR #$A5) == $03F3 to detect warm start.
     * Clear this byte to force cold boot (auto-start ROM check).
     */
    POWER_UP_BYTE: 0x03f4,
    /** Soft switches start address ($C000) */
    SOFT_SWITCHES: 0xc000,
    /** Applesoft BASIC ROM start address ($D000) */
    APPLESOFT_ROM: 0xd000,
    /** Monitor ROM start address ($F800) */
    MONITOR_ROM: 0xf800,
    /** Reset vector address ($FFFC) */
    RESET_VECTOR: 0xfffc,
} as const;

/** Type for memory addresses */
export type MemoryAddress = (typeof MEMORY)[keyof typeof MEMORY];

/**
 * CPU timing constants for Apple II Plus.
 *
 * The Apple II+ uses a 14.31818 MHz crystal divided by 14 to produce
 * a 1.0227 MHz CPU clock (approximately 1.023 MHz).
 */
export const TIMING = {
    /** CPU frequency in Hz (1.023 MHz) */
    CPU_HZ: 1_023_000,
    /** Target frame rate (60 fps) */
    FRAME_RATE: 60,
    /** Cycles per frame at 60fps (derived from CPU_HZ / FRAME_RATE) */
    CYCLES_PER_FRAME: Math.floor(1_023_000 / 60),
    /** Frame time in milliseconds (derived from 1000 / FRAME_RATE) */
    FRAME_TIME_MS: 1000 / 60,
} as const;

/**
 * Soft switch addresses.
 */
export const SOFT_SWITCH = {
    /** Keyboard data ($C000) */
    KEYBOARD: 0xc000,
    /** Clear keyboard strobe ($C010) */
    KEYBOARD_STROBE: 0xc010,
    /** Speaker toggle ($C030) */
    SPEAKER: 0xc030,
    /** Text mode off ($C050) */
    TEXT_OFF: 0xc050,
    /** Text mode on ($C051) */
    TEXT_ON: 0xc051,
    /** Mixed mode off ($C052) */
    MIXED_OFF: 0xc052,
    /** Mixed mode on ($C053) */
    MIXED_ON: 0xc053,
    /** Page 2 off ($C054) */
    PAGE2_OFF: 0xc054,
    /** Page 2 on ($C055) */
    PAGE2_ON: 0xc055,
    /** Hi-res mode off ($C056) */
    HIRES_OFF: 0xc056,
    /** Hi-res mode on ($C057) */
    HIRES_ON: 0xc057,
} as const;

/** Type for soft switch addresses */
export type SoftSwitchAddress = (typeof SOFT_SWITCH)[keyof typeof SOFT_SWITCH];

/**
 * Paddle/Joystick soft switch addresses ($C061-$C070).
 */
export const PADDLE = {
    /** Pushbutton 0 ($C061) - also Open Apple key */
    PB0: 0xc061,
    /** Pushbutton 1 ($C062) - also Solid Apple key */
    PB1: 0xc062,
    /** Pushbutton 2 ($C063) */
    PB2: 0xc063,
    /** Paddle 0 timer ($C064) */
    PDL0: 0xc064,
    /** Paddle 1 timer ($C065) */
    PDL1: 0xc065,
    /** Paddle 2 timer ($C066) */
    PDL2: 0xc066,
    /** Paddle 3 timer ($C067) */
    PDL3: 0xc067,
    /** Paddle trigger strobe ($C070) */
    TRIGGER: 0xc070,
} as const;

/** Type for paddle addresses */
export type PaddleAddress = (typeof PADDLE)[keyof typeof PADDLE];

/**
 * Language Card soft switch addresses ($C080-$C08F).
 *
 * Bank 2 controls: $C080-$C083 (echoed at $C084-$C087)
 * Bank 1 controls: $C088-$C08B (echoed at $C08C-$C08F)
 */
export const LANGUAGE_CARD = {
    /** Read RAM bank 2, write disabled */
    BANK2_READ_RAM_NO_WRITE: 0xc080,
    /** Read ROM, write RAM bank 2 (requires 2 accesses) */
    BANK2_READ_ROM_WRITE_RAM: 0xc081,
    /** Read ROM, write disabled */
    BANK2_READ_ROM_NO_WRITE: 0xc082,
    /** Read/write RAM bank 2 (requires 2 accesses) */
    BANK2_READ_WRITE_RAM: 0xc083,

    /** Read RAM bank 1, write disabled */
    BANK1_READ_RAM_NO_WRITE: 0xc088,
    /** Read ROM, write RAM bank 1 (requires 2 accesses) */
    BANK1_READ_ROM_WRITE_RAM: 0xc089,
    /** Read ROM, write disabled */
    BANK1_READ_ROM_NO_WRITE: 0xc08a,
    /** Read/write RAM bank 1 (requires 2 accesses) */
    BANK1_READ_WRITE_RAM: 0xc08b,

    /** Start of bankable region ($D000) */
    BANK_START: 0xd000,
    /** End of $D000 bank (4KB) */
    BANK_D000_END: 0xdfff,
    /** Start of upper region (8KB) */
    UPPER_START: 0xe000,
    /** End of upper region */
    UPPER_END: 0xffff,
} as const;

/** Type for language card addresses */
export type LanguageCardAddress = (typeof LANGUAGE_CARD)[keyof typeof LANGUAGE_CARD];

/**
 * Memory sizes.
 */
export const SIZE = {
    /** Main RAM size (48KB) */
    RAM: 0xc000,
    /** ROM size (2KB per chip) */
    ROM: 0x0800,
    /** Soft switches region size (256 bytes) */
    SOFT_SWITCHES: 0x0100,
    /** Text page size (1KB) */
    TEXT_PAGE: 0x0400,
    /** Language Card bank size (4KB for $D000-$DFFF) */
    LC_BANK: 0x1000,
    /** Language Card upper region size (8KB for $E000-$FFFF) */
    LC_UPPER: 0x2000,
    /** Language Card total RAM (16KB) */
    LC_TOTAL: 0x4000,
} as const;

/**
 * Video display constants.
 *
 * Apple II video modes:
 * - Text: 40×24 characters
 * - Lo-res: 40×48 pixels (uses text page memory, 2 pixels per byte)
 * - Hi-res: 280×192 pixels (40 bytes × 7 bits per scanline)
 * - Mixed: Graphics with 4 text rows at bottom
 */
export const VIDEO = {
    // ─────────────────────────────────────────────────────────────────────
    // Text / Lo-res Mode (shared memory, different interpretation)
    // ─────────────────────────────────────────────────────────────────────

    /** Text mode columns (40 characters) */
    TEXT_COLS: 40,
    /** Text mode rows (24 characters) */
    TEXT_ROWS: 24,
    /** Total text screen cells */
    TEXT_CELLS: 40 * 24,
    /** Lo-res vertical pixels (48 = 24 rows × 2 pixels per row) */
    LORES_HEIGHT: 48,

    // ─────────────────────────────────────────────────────────────────────
    // Hi-res Mode
    // ─────────────────────────────────────────────────────────────────────

    /** Hi-res scanlines (vertical resolution) */
    HIRES_SCANLINES: 192,
    /** Hi-res bytes per scanline (40 bytes) */
    HIRES_BYTES_PER_LINE: 40,
    /** Hi-res pixels per byte (7 data bits, bit 7 is palette select) */
    HIRES_PIXELS_PER_BYTE: 7,
    /** Hi-res pixels per scanline (280 = 40 bytes × 7 bits) */
    HIRES_PIXELS_PER_LINE: 280,

    // ─────────────────────────────────────────────────────────────────────
    // Mixed Mode
    // ─────────────────────────────────────────────────────────────────────

    /** Graphics scanlines in mixed mode (160 = 192 - 32) */
    MIXED_GRAPHICS_SCANLINES: 160,
    /** Text rows in mixed mode (4 rows at bottom) */
    MIXED_TEXT_ROWS: 4,

    // ─────────────────────────────────────────────────────────────────────
    // Terminal Output Dimensions (for half-block rendering)
    // ─────────────────────────────────────────────────────────────────────

    /** Hi-res terminal output width (280 columns) */
    HIRES_OUTPUT_WIDTH: 280,
    /** Hi-res terminal output height (96 rows = 192 scanlines / 2) */
    HIRES_OUTPUT_HEIGHT: 96,
} as const;

/**
 * Terminal display requirements.
 */
export const TERMINAL = {
    /** Text/Lo-res mode: minimum columns (help dialog width) */
    TEXT_MIN_COLUMNS: 102,
    /** Text/Lo-res mode: minimum rows (help dialog height) */
    TEXT_MIN_ROWS: 33,
    /** Hi-res mode: minimum columns (280 + padding/border) */
    HIRES_MIN_COLUMNS: 285,
    /** Hi-res mode: minimum rows (96 + padding/border + status bar) */
    HIRES_MIN_ROWS: 104,
} as const;
