/**
 * Shared test helpers for disk subsystem tests.
 *
 * These helpers create minimal WOZ1/WOZ2 images for testing without
 * requiring real disk image files.
 *
 * WOZ1 Format:
 * - 256-byte header (signature + INFO + TMAP chunks)
 * - 35 × 6656-byte track blocks (6646 data + 10 metadata)
 *
 * WOZ2 Format:
 * - 256-byte header (signature + INFO + TMAP)
 * - Variable-length TRKS chunk with 8-byte entries per track
 * - Track data in 512-byte blocks starting at block 1 (byte 512)
 */

// ==================== WOZ1 Helpers ====================

export interface Woz1Options {
    /** Byte pattern to fill track data with (default: 0xFF) */
    pattern?: number;
    /** Whether disk is write-protected (default: false) */
    writeProtected?: boolean;
    /** Raw track data bytes (overrides pattern if provided) */
    trackData?: number[];
}

/**
 * Create minimal WOZ1 file with track 0 initialized.
 *
 * WOZ1 structure:
 * - Bytes 0-7: Signature (WOZ1 + FF 0A 0D 0A)
 * - Byte 22: Write protect flag (0 or 1)
 * - Bytes 88-247: TMAP (160 bytes, one per quarter-track)
 * - Bytes 256+: Track blocks (6656 bytes each)
 *
 * Each track block:
 * - Bytes 0-6645: Track bit data
 * - Bytes 6646-6647: Bytes used
 * - Bytes 6648-6649: Bit count
 * - Bytes 6650-6651: Splice point (0xFFFF = none)
 * - Bytes 6652-6655: Reserved
 */
export function createWoz1(options: Woz1Options = {}): Uint8Array {
    const { pattern = 0xff, writeProtected = false, trackData } = options;

    // WOZ1: 256-byte header + 35 tracks × 6656 bytes = 233216 bytes
    const wozData = new Uint8Array(256 + 35 * 6656);

    // WOZ1 signature (bytes 0-7)
    wozData.set([0x57, 0x4f, 0x5a, 0x31, 0xff, 0x0a, 0x0d, 0x0a], 0);

    // INFO chunk byte 22: Write protect flag
    wozData[22] = writeProtected ? 1 : 0;

    // TMAP: Initialize all 160 quarter-tracks to 0xFF (no track)
    // This is critical - uninitialized tracks must be 0xFF
    for (let i = 0; i < 160; i++) {
        wozData[88 + i] = 0xff;
    }
    // Map quarter-track 0 to track block 0
    wozData[88] = 0;

    // Track 0 data starts at byte 256
    const trackDataStart = 256;

    // Fill track with pattern or raw data
    if (trackData) {
        for (let i = 0; i < Math.min(trackData.length, 6646); i++) {
            wozData[trackDataStart + i] = trackData[i];
        }
    } else {
        for (let i = 0; i < 6646; i++) {
            wozData[trackDataStart + i] = pattern;
        }
    }

    // Track metadata (last 10 bytes of 6656-byte block)
    const metadataStart = trackDataStart + 6646;

    // Bytes 0-1: Bytes used (6646)
    wozData[metadataStart + 0] = 6646 & 0xff;
    wozData[metadataStart + 1] = (6646 >> 8) & 0xff;

    // Bytes 2-3: Bit count (50000 = standard track)
    const bitCount = 50000;
    wozData[metadataStart + 2] = bitCount & 0xff;
    wozData[metadataStart + 3] = (bitCount >> 8) & 0xff;

    // Bytes 4-5: Splice point (0xFFFF = no splice)
    wozData[metadataStart + 4] = 0xff;
    wozData[metadataStart + 5] = 0xff;

    return wozData;
}

// ==================== WOZ2 Helpers ====================

export interface Woz2Options {
    /** Byte pattern to fill track data with (default: 0xAA) */
    pattern?: number;
    /** Whether disk is write-protected (default: false) */
    writeProtected?: boolean;
}

/**
 * Create minimal WOZ2 file with track 0 initialized.
 *
 * WOZ2 structure:
 * - Bytes 0-7: Signature (WOZ2 + FF 0A 0D 0A)
 * - Byte 22: Write protect flag
 * - Byte 59: Optimal timing (32 = default)
 * - Bytes 88-247: TMAP (160 bytes)
 * - Bytes 256-511: TRKS chunk (8 bytes per track × 160 tracks)
 * - Bytes 512+: Track data in 512-byte blocks
 *
 * TRKS entry (8 bytes):
 * - Bytes 0-1: Start block number
 * - Bytes 2-3: Block count (0 = empty track)
 * - Bytes 4-7: Bit count
 */
export function createWoz2(options: Woz2Options = {}): Uint8Array {
    const { pattern = 0xaa, writeProtected = false } = options;

    // WOZ2: 512-byte header + 6656 bytes track data = 7168 bytes minimum
    const wozData = new Uint8Array(512 + 6656);

    // WOZ2 signature (bytes 0-7)
    wozData.set([0x57, 0x4f, 0x5a, 0x32, 0xff, 0x0a, 0x0d, 0x0a], 0);

    // INFO chunk byte 22: Write protect flag
    wozData[22] = writeProtected ? 1 : 0;

    // Byte 59: Optimal timing (32 = default for 5.25" disks)
    wozData[59] = 32;

    // TMAP: Initialize all to 0xFF (no track), then set track 0
    for (let i = 0; i < 160; i++) {
        wozData[88 + i] = 0xff;
    }
    wozData[88] = 0; // Quarter-track 0 uses TRKS entry 0

    // TRKS chunk starts at byte 256
    // Track 0 metadata entry: 8 bytes
    // Bytes 0-1: Start block (1 = byte 512 from start of file)
    wozData[256] = 1; // Low byte of block number
    wozData[257] = 0; // High byte of block number

    // Bytes 2-3: Block count (13 blocks = 6656 bytes = ceil(6656/512))
    wozData[258] = 13;
    wozData[259] = 0;

    // Bytes 4-7: Bit count (50000 bits = standard track)
    const bitCount = 50000;
    wozData[260] = bitCount & 0xff;
    wozData[261] = (bitCount >> 8) & 0xff;
    wozData[262] = (bitCount >> 16) & 0xff;
    wozData[263] = (bitCount >> 24) & 0xff;

    // Track data starts at byte 512 (block 1)
    const trackDataStart = 512;
    for (let i = 0; i < 6656; i++) {
        wozData[trackDataStart + i] = pattern;
    }

    return wozData;
}

// ==================== DSK Helpers ====================

/**
 * Create blank DSK file (35 tracks × 16 sectors × 256 bytes = 143360 bytes).
 *
 * DSK files contain raw sector data without encoding or checksums.
 * Sectors are laid out sequentially: track 0 sector 0, track 0 sector 1, etc.
 */
export function createBlankDsk(): Uint8Array {
    return new Uint8Array(143360);
}

// ==================== Convenience Aliases ====================

/** Create WOZ1 with pattern fill (legacy alias) */
export function createWoz1WithPattern(pattern: number): Uint8Array {
    return createWoz1({ pattern });
}

/** Create WOZ1 with write protection (legacy alias) */
export function createWoz1WithProtection(writeProtected: boolean): Uint8Array {
    return createWoz1({ writeProtected });
}

/** Create WOZ2 with pattern fill (legacy alias) */
export function createWoz2WithPattern(pattern: number): Uint8Array {
    return createWoz2({ pattern });
}

/** Create WOZ2 with write protection (legacy alias) */
export function createWoz2WithProtection(writeProtected: boolean): Uint8Array {
    return createWoz2({ writeProtected });
}

// Note: Some tests use "createMinimalWoz2WithPattern" but actually create WOZ1.
// The aliases below maintain compatibility while using correct implementations.
export const createMinimalWoz2WithPattern = createWoz1WithPattern;
export const createMinimalWoz2WithTrackData = () => createWoz2({ pattern: 0xaa });
