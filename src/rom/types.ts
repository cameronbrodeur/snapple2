/**
 * ROM Configuration Types
 *
 * Defines the structure for Apple II Plus ROM files.
 * The Apple II+ uses seven 2KB ROM chips (2716 EPROMs).
 */

/**
 * ROM configuration containing all required Apple II Plus ROMs.
 *
 * The Applesoft BASIC ROM is split across 5 separate 2KB ROM chips,
 * matching the physical hardware organization of the Apple II+.
 */
export interface RomConfig {
    // Applesoft BASIC ROMs (5 chips = 10KB total)
    appleSoftD000: Uint8Array; // 2KB - $D000-$D7FF (341-0011)
    appleSoftD800: Uint8Array; // 2KB - $D800-$DFFF (341-0012)
    appleSoftE000: Uint8Array; // 2KB - $E000-$E7FF (341-0013)
    appleSoftE800: Uint8Array; // 2KB - $E800-$EFFF (341-0014)
    appleSoftF000: Uint8Array; // 2KB - $F000-$F7FF (341-0015)

    // System ROMs
    monitor: Uint8Array; // 2KB - $F800-$FFFF (341-0020)
    character: Uint8Array; // 2KB - Character generator (7341-0036, not memory-mapped)

    // Disk II controller ROM (256 bytes) - Optional
    diskController?: Uint8Array;
}

/**
 * ROM loading paths configuration.
 */
export interface RomPaths {
    /** Directory containing ROM files. If not specified, default search locations will be used. */
    romsDir?: string;
}

/**
 * ROM file metadata.
 */
export interface RomFileInfo {
    /** Base filename (e.g., "applesoft-d000.bin") */
    filename: string;
    /** Memory address range start (e.g., 0xD000) */
    baseAddress?: number;
    /** Expected size in bytes */
    size: number;
    /** Part number (e.g., "341-0011") */
    partNumber?: string;
}

/**
 * ROM file definitions for all Apple II Plus ROMs.
 * Does not include optional ROMs (e.g., diskController).
 */
export const ROM_FILES: Record<Exclude<keyof RomConfig, 'diskController'>, RomFileInfo> = {
    appleSoftD000: {
        filename: 'applesoft-d000.bin',
        baseAddress: 0xd000,
        size: 2048,
        partNumber: '341-0011',
    },
    appleSoftD800: {
        filename: 'applesoft-d800.bin',
        baseAddress: 0xd800,
        size: 2048,
        partNumber: '341-0012',
    },
    appleSoftE000: {
        filename: 'applesoft-e000.bin',
        baseAddress: 0xe000,
        size: 2048,
        partNumber: '341-0013',
    },
    appleSoftE800: {
        filename: 'applesoft-e800.bin',
        baseAddress: 0xe800,
        size: 2048,
        partNumber: '341-0014',
    },
    appleSoftF000: {
        filename: 'applesoft-f000.bin',
        baseAddress: 0xf000,
        size: 2048,
        partNumber: '341-0015',
    },
    monitor: {
        filename: 'monitor-f800.bin',
        baseAddress: 0xf800,
        size: 2048,
        partNumber: '341-0020',
    },
    character: {
        filename: 'character-rom.bin',
        size: 2048,
        partNumber: '7341-0036',
    },
};

/**
 * Standard ROM size (2KB for Apple II+ 2716 EPROMs).
 */
export const ROM_SIZE = 2048;
