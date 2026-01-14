/**
 * Disk format conversion utilities.
 *
 * Converts between DSK/DO/PO sector-based formats and WOZ bit-level format.
 * Implements 6-and-2 encoding/decoding for Disk II compatibility.
 *
 * Based on the dsk2woz algorithm: https://github.com/TomHarte/dsk2woz
 */

/**
 * 6-and-2 nibble lookup table for encoding sector data.
 *
 * Maps 6-bit values (0-63) to valid Disk II nibbles. These 64 nibble values
 * all have the high bit set and don't contain consecutive zeros (required for
 * self-clocking disk encoding).
 *
 * Why these specific values? The Disk II hardware can only write nibbles with
 * bit 7 set (0x80-0xFF) that don't create timing issues. These 64 values are
 * the "valid nibbles" for 6-and-2 encoding.
 */
const NIBBLE_6_AND_2: ReadonlyArray<number> = [
    0x96, 0x97, 0x9a, 0x9b, 0x9d, 0x9e, 0x9f, 0xa6, 0xa7, 0xab, 0xac, 0xad, 0xae, 0xaf, 0xb2, 0xb3,
    0xb4, 0xb5, 0xb6, 0xb7, 0xb9, 0xba, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf, 0xcb, 0xcd, 0xce, 0xcf, 0xd3,
    0xd6, 0xd7, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde, 0xdf, 0xe5, 0xe6, 0xe7, 0xe9, 0xea, 0xeb, 0xec,
    0xed, 0xee, 0xef, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff,
];

/**
 * DOS 3.3 sector interleave mapping (physical sector → logical sector).
 *
 * Maps physical sector order on disk (0-15) to logical sector numbers used by
 * DOS 3.3. This interleaving improves performance by spacing sectors so the
 * disk has time to process one sector before the next arrives under the head.
 *
 * Example: Physical sector 0 → Logical 0, Physical sector 1 → Logical 7, etc.
 */
export const DOS_33_INTERLEAVE: ReadonlyArray<number> = [
    0x0, 0x7, 0xe, 0x6, 0xd, 0x5, 0xc, 0x4, 0xb, 0x3, 0xa, 0x2, 0x9, 0x1, 0x8, 0xf,
];

/**
 * ProDOS sector interleave mapping (physical sector → logical sector).
 *
 * Maps physical sector order to ProDOS logical sector numbers. ProDOS uses
 * different interleaving than DOS 3.3 for better performance with its block-
 * based file system.
 *
 * Example: Physical sector 0 → Logical 0, Physical sector 1 → Logical 8, etc.
 */
export const PRODOS_INTERLEAVE: ReadonlyArray<number> = [
    0x0, 0x8, 0x1, 0x9, 0x2, 0xa, 0x3, 0xb, 0x4, 0xc, 0x5, 0xd, 0x6, 0xe, 0x7, 0xf,
];

/**
 * Write a byte at a bit position in buffer (handles bit-level alignment).
 *
 * WOZ stores bits, not bytes, so writing a byte may span two buffer bytes
 * if the bit position isn't byte-aligned (e.g., position 5 spans bytes 0 and 1).
 *
 * @param buffer - Destination buffer for bit-level data
 * @param bitPosition - Starting bit position (0-based)
 * @param value - Byte value to write
 * @returns New bit position (bitPosition + 8)
 */
function writeByte(buffer: Uint8Array, bitPosition: number, value: number): number {
    // Calculate bit offset within current byte (0-7)
    const shift = bitPosition & 7;
    const bytePosition = bitPosition >> 3;

    // Write high bits to current byte
    buffer[bytePosition] |= value >> shift;

    // If not byte-aligned, write low bits to next byte
    if (shift) {
        buffer[bytePosition + 1] |= value << (8 - shift);
    }

    return bitPosition + 8;
}

/**
 * Write a sync byte (0xFF followed by 2 zero bits).
 *
 * Sync bytes separate sectors on disk and help the hardware synchronize
 * with the bit stream. The 2 zero bits after 0xFF prevent false sync detection.
 *
 * @param buffer - Destination buffer
 * @param bitPosition - Starting bit position
 * @returns New bit position (bitPosition + 10)
 */
function writeSync(buffer: Uint8Array, bitPosition: number): number {
    bitPosition = writeByte(buffer, bitPosition, 0xff);
    return bitPosition + 2; // Add 2 zero bits
}

/**
 * Write a 4-and-4 encoded value (used for address field headers).
 *
 * 4-and-4 encoding splits a byte into odd bits and even bits, then sets
 * bit 7 and bit 5 of each half (OR with 0xAA). This ensures the high bit
 * is always set (required for Disk II nibbles).
 *
 * @param buffer - Destination buffer
 * @param bitPosition - Starting bit position
 * @param value - Byte value to encode
 * @returns New bit position (bitPosition + 16)
 */
function write4And4(buffer: Uint8Array, bitPosition: number, value: number): number {
    // Write odd bits (shift right 1, OR with 0xAA)
    bitPosition = writeByte(buffer, bitPosition, (value >> 1) | 0xaa);
    // Write even bits (OR with 0xAA)
    bitPosition = writeByte(buffer, bitPosition, value | 0xaa);
    return bitPosition;
}

/**
 * Encode a 256-byte sector using 6-and-2 encoding.
 *
 * Converts a 256-byte sector to 343 nibble bytes for Disk II storage.
 * Applies bit reversal, XOR checksum, and nibble table mapping.
 *
 * @param sector - 256-byte sector data to encode
 * @returns 343-byte encoded nibble data
 */
export function encode6And2(sector: Uint8Array): Uint8Array {
    const encoded = new Uint8Array(343);
    const bitReverse = [0, 2, 1, 3];

    // Step 1: Extract bottom 2 bits from source bytes
    // Each encoded byte packs bottom 2 bits from 3 source bytes (at offsets 0, 86, 172)
    for (let byteIndex = 0; byteIndex < 84; byteIndex++) {
        encoded[byteIndex] =
            bitReverse[sector[byteIndex] & 3] |
            (bitReverse[sector[byteIndex + 86] & 3] << 2) |
            (bitReverse[sector[byteIndex + 172] & 3] << 4);
    }

    // Handle special cases (bytes 84-85 pack only 2 source bytes each)
    encoded[84] = bitReverse[sector[84] & 3] | (bitReverse[sector[170] & 3] << 2);
    encoded[85] = bitReverse[sector[85] & 3] | (bitReverse[sector[171] & 3] << 2);

    // Step 2: Extract top 6 bits from all 256 source bytes
    for (let byteIndex = 0; byteIndex < 256; byteIndex++) {
        encoded[86 + byteIndex] = sector[byteIndex] >> 2;
    }

    // Step 3: Apply XOR checksum backward (byte 342 = byte 341, then XOR from 341 down to 1)
    encoded[342] = encoded[341];
    for (let i = 341; i > 0; i--) {
        encoded[i] ^= encoded[i - 1];
    }

    // Step 4: Map through nibble table (6-bit values → valid Disk II nibbles)
    for (let byteIndex = 0; byteIndex < 343; byteIndex++) {
        encoded[byteIndex] = NIBBLE_6_AND_2[encoded[byteIndex] & 0x3f];
    }

    return encoded;
}

/**
 * Serialize a track with 16 sectors in WOZ bit-level format.
 *
 * Converts a track from DSK sector format to WOZ nibble format by writing:
 * - Gap 1 (16 sync bytes)
 * - 16 sectors, each with: address field, data field, gaps
 * - Track metadata (bytes used, bit count, splice point)
 *
 * @param diskData - Full DSK file data (143360 bytes)
 * @param trackNumber - Track number (0-34)
 * @param isProDOS - true for ProDOS interleave, false for DOS 3.3
 * @returns 6656-byte WOZ1 track block
 */
function serializeTrack(diskData: Uint8Array, trackNumber: number, isProDOS: boolean): Uint8Array {
    const trackBuffer = new Uint8Array(6656);
    let bitPosition = 0;

    // Write gap 1 (16 sync bytes before first sector)
    for (let syncIndex = 0; syncIndex < 16; syncIndex++) {
        bitPosition = writeSync(trackBuffer, bitPosition);
    }

    // Write 16 sectors with interleaving
    const interleave = isProDOS ? PRODOS_INTERLEAVE : DOS_33_INTERLEAVE;

    for (let physicalSector = 0; physicalSector < 16; physicalSector++) {
        // Address field prologue (D5 AA 96)
        bitPosition = writeByte(trackBuffer, bitPosition, 0xd5);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xaa);
        bitPosition = writeByte(trackBuffer, bitPosition, 0x96);

        // Volume, track, sector, checksum (all 4-and-4 encoded)
        bitPosition = write4And4(trackBuffer, bitPosition, 254); // Volume number
        bitPosition = write4And4(trackBuffer, bitPosition, trackNumber);
        bitPosition = write4And4(trackBuffer, bitPosition, physicalSector);
        bitPosition = write4And4(trackBuffer, bitPosition, 254 ^ trackNumber ^ physicalSector);

        // Address epilogue (DE AA EB)
        bitPosition = writeByte(trackBuffer, bitPosition, 0xde);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xaa);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xeb);

        // Gap 2 (7 sync bytes between address and data fields)
        for (let syncIndex = 0; syncIndex < 7; syncIndex++) {
            bitPosition = writeSync(trackBuffer, bitPosition);
        }

        // Data field prologue (D5 AA AD)
        bitPosition = writeByte(trackBuffer, bitPosition, 0xd5);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xaa);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xad);

        // Get logical sector and extract 256-byte sector data from DSK
        const logicalSector = interleave[physicalSector];
        const sectorOffset = (trackNumber * 16 + logicalSector) * 256;
        const sectorData = diskData.slice(sectorOffset, sectorOffset + 256);

        // Encode sector data (256 bytes → 343 nibbles) and write to track
        const encoded = encode6And2(sectorData);
        for (let nibbleIndex = 0; nibbleIndex < 343; nibbleIndex++) {
            bitPosition = writeByte(trackBuffer, bitPosition, encoded[nibbleIndex]);
        }

        // Data epilogue (DE AA EB)
        bitPosition = writeByte(trackBuffer, bitPosition, 0xde);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xaa);
        bitPosition = writeByte(trackBuffer, bitPosition, 0xeb);

        // Gap 3 (16 sync bytes after each sector)
        for (let syncIndex = 0; syncIndex < 16; syncIndex++) {
            bitPosition = writeSync(trackBuffer, bitPosition);
        }
    }

    // Track suffix (metadata at bytes 6646-6653)
    trackBuffer[6646] = ((bitPosition + 7) >> 3) & 0xff; // Bytes used (low)
    trackBuffer[6647] = ((bitPosition + 7) >> 11) & 0xff; // Bytes used (high)
    trackBuffer[6648] = bitPosition & 0xff; // Bit count (low)
    trackBuffer[6649] = (bitPosition >> 8) & 0xff; // Bit count (high)
    trackBuffer[6650] = 0x00; // Splice point (low)
    trackBuffer[6651] = 0x00; // Splice point (high)
    trackBuffer[6652] = 0xff; // Splice nibble
    trackBuffer[6653] = 10; // Splice bit count

    return trackBuffer;
}

/**
 * Convert DSK/DO/PO sector format to WOZ1 bit-level format.
 *
 * Generates a complete WOZ1 image with INFO, TMAP, and TRKS chunks.
 * Encodes all 35 tracks with 16 sectors each using 6-and-2 encoding.
 *
 * @param dskData - 143,360-byte DSK/DO/PO image (35 tracks × 16 sectors × 256 bytes)
 * @param isProDOS - true for ProDOS interleaving, false for DOS 3.3
 * @returns WOZ1 format disk image
 * @throws Error if DSK size is not exactly 143,360 bytes
 */
export function convertDskToWoz(diskData: Uint8Array, isProDOS: boolean = false): Uint8Array {
    if (diskData.length !== 143360) {
        throw new Error(`Invalid DSK size: expected 143360 bytes, got ${diskData.length}`);
    }

    const woz = new Uint8Array(233216);

    // WOZ1 header (12 bytes)
    woz[0] = 0x57; // 'W'
    woz[1] = 0x4f; // 'O'
    woz[2] = 0x5a; // 'Z'
    woz[3] = 0x31; // '1'
    woz[4] = 0xff;
    woz[5] = 0x0a;
    woz[6] = 0x0d;
    woz[7] = 0x0a;
    woz[8] = 0x00; // CRC32 placeholder

    let offset = 12;

    // INFO chunk (68 bytes total: 8 header + 60 data)
    woz.set([0x49, 0x4e, 0x46, 0x4f], offset); // 'INFO'
    woz[offset + 4] = 60; // Chunk size
    offset += 8;

    woz[offset] = 1; // Version 1
    woz[offset + 1] = 1; // Disk type: 5.25"
    woz[offset + 2] = 0; // Not write protected
    woz[offset + 3] = 0; // Not synchronized
    woz[offset + 4] = 1; // Cleaned (fake bits removed)

    // Creator string (32 bytes, padded with 0x15 after string)
    const creator = 'snapple2 1.0';
    for (let i = 0; i < 32; i++) {
        woz[offset + 5 + i] = i < creator.length ? creator.charCodeAt(i) : 0x15;
    }
    offset += 60;

    // TMAP chunk (168 bytes total: 8 header + 160 data)
    woz.set([0x54, 0x4d, 0x41, 0x50], offset); // 'TMAP'
    woz[offset + 4] = 160; // Chunk size
    offset += 8;

    // Fill with 0xFF (unmapped)
    for (let i = 0; i < 160; i++) {
        woz[offset + i] = 0xff;
    }

    // Map quarter-tracks (0-159)
    let quarterTrack = 0;

    // Track 0: 2 quarter-tracks (both map to track 0)
    woz[offset + quarterTrack++] = 0;
    woz[offset + quarterTrack++] = 0;

    // Remaining tracks (1-34)
    for (let track = 0; track < 34 && quarterTrack < 160; track++) {
        woz[offset + quarterTrack++] = 0xff; // Half-track (unmapped)
        woz[offset + quarterTrack++] = track + 1;
        if (quarterTrack < 160) woz[offset + quarterTrack++] = track + 1;
        if (quarterTrack < 160) woz[offset + quarterTrack++] = track + 1;
    }

    offset += 160;

    // TRKS chunk (contains all 35 tracks)
    woz.set([0x54, 0x52, 0x4b, 0x53], offset); // 'TRKS'
    const trksSizeOffset = offset + 4;
    offset += 8;

    // Serialize all 35 tracks
    for (let track = 0; track < 35; track++) {
        const trackData = serializeTrack(diskData, track, isProDOS);
        woz.set(trackData, offset);
        offset += 6656;
    }

    // Set TRKS chunk size
    const trksSize = 35 * 6656;
    woz[trksSizeOffset] = trksSize & 0xff;
    woz[trksSizeOffset + 1] = (trksSize >> 8) & 0xff;
    woz[trksSizeOffset + 2] = (trksSize >> 16) & 0xff;
    woz[trksSizeOffset + 3] = (trksSize >> 24) & 0xff;

    return woz;
}

/**
 * Detect disk format from filename extension.
 *
 * @param filename - Disk image filename
 * @returns Format ('woz', 'dsk', 'do', 'po') or null if unrecognized
 */
export function detectDiskFormat(filename: string): 'woz' | 'dsk' | 'do' | 'po' | null {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
        case 'woz':
            return 'woz';
        case 'dsk':
            return 'dsk';
        case 'do':
            return 'do';
        case 'po':
            return 'po';
        default:
            return null;
    }
}

/**
 * Check if a disk image should be treated as ProDOS format.
 *
 * @param filename - Disk image filename
 * @returns true if .po extension (ProDOS), false otherwise
 */
export function isProDOSFormat(filename: string): boolean {
    return detectDiskFormat(filename) === 'po';
}

/**
 * Build reverse nibble lookup table for 6-and-2 decoding.
 *
 * Inverts the NIBBLE_6_AND_2 table for fast decoding.
 *
 * @returns 256-byte lookup table (nibble → value, 0xFF for invalid)
 */
export function buildReverseNibbleTable(): Uint8Array {
    const reverse = new Uint8Array(256);
    reverse.fill(0xff); // Invalid marker

    for (let i = 0; i < 64; i++) {
        reverse[NIBBLE_6_AND_2[i]] = i;
    }

    return reverse;
}

// Singleton reverse nibble table
const REVERSE_NIBBLE_6_AND_2 = buildReverseNibbleTable();

/**
 * Decode 343 6-and-2 encoded bytes to 256 sector bytes.
 *
 * Reverses the 6-and-2 encoding process: nibble table lookup, XOR checksum
 * reversal, bit reassembly.
 *
 * @param encoded - 343-byte encoded sector data
 * @returns 256-byte decoded sector data
 * @throws Error if encoded size is not 343 bytes or contains invalid nibbles
 */
export function decode6And2(encoded: Uint8Array): Uint8Array {
    if (encoded.length !== 343) {
        throw new Error(`Invalid encoded sector size: ${encoded.length}`);
    }

    const sector = new Uint8Array(256);
    const decoded = new Uint8Array(343);

    // Step 1: Reverse nibble table lookup
    for (let i = 0; i < 343; i++) {
        const value = REVERSE_NIBBLE_6_AND_2[encoded[i]];
        if (value === 0xff) {
            throw new Error(`Invalid nibble byte at position ${i}: 0x${encoded[i].toString(16)}`);
        }
        decoded[i] = value;
    }

    // Step 2: Reverse XOR checksum (forward pass)
    // The encoding did: encoded[342] = encoded[341], then XOR from 341 down to 1
    // To reverse: start from 1 and go forward, but stop at 341 (don't modify 342)
    for (let i = 1; i <= 341; i++) {
        decoded[i] ^= decoded[i - 1];
    }

    // Verify checksum: decoded[342] should equal decoded[341] after reversal
    if (decoded[342] !== decoded[341]) {
        console.warn('Checksum verification failed - data may be corrupt');
    }

    // Step 3: Extract top 6 bits (bytes 86-341 → sector bytes 0-255)
    for (let byteIndex = 0; byteIndex < 256; byteIndex++) {
        sector[byteIndex] = decoded[86 + byteIndex] << 2;
    }

    // Step 4: Extract bottom 2 bits (bytes 0-85 → sector bytes 0-255)
    const bitReverse = [0, 2, 1, 3];
    for (let byteIndex = 0; byteIndex < 84; byteIndex++) {
        sector[byteIndex] |= bitReverse[(decoded[byteIndex] >> 0) & 3];
        sector[byteIndex + 86] |= bitReverse[(decoded[byteIndex] >> 2) & 3];
        sector[byteIndex + 172] |= bitReverse[(decoded[byteIndex] >> 4) & 3];
    }

    // Handle special cases for bytes 84-85
    sector[84] |= bitReverse[(decoded[84] >> 0) & 3];
    sector[170] |= bitReverse[(decoded[84] >> 2) & 3];
    sector[85] |= bitReverse[(decoded[85] >> 0) & 3];
    sector[171] |= bitReverse[(decoded[85] >> 2) & 3];

    return sector;
}

/**
 * Read a byte from track bits at given bit position.
 *
 * Assembles 8 consecutive bits into a byte value (MSB-first).
 *
 * @param trackBits - Track data buffer
 * @param bitPosition - Starting bit position
 * @returns Assembled byte value
 */
function readByteFromBits(trackBits: Uint8Array, bitPosition: number): number {
    let byte = 0;
    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        const byteIndex = (bitPosition + bitIndex) >> 3;
        const bitOffset = (bitPosition + bitIndex) & 7;
        const bit = (trackBits[byteIndex] >> (7 - bitOffset)) & 1;
        byte = (byte << 1) | bit;
    }
    return byte;
}

/**
 * Find prologue pattern in track bits (e.g., D5 AA 96 for address field).
 *
 * Scans bit stream looking for exact byte sequence match.
 *
 * @param trackBits - Track data buffer
 * @param startBit - Starting bit position for search
 * @param pattern - Byte sequence to find (e.g., [0xD5, 0xAA, 0x96])
 * @returns Bit position of match, or -1 if not found
 */
function findPrologue(trackBits: Uint8Array, startBit: number, pattern: number[]): number {
    const maxBits = trackBits.length * 8;

    for (let bitPosition = startBit; bitPosition < maxBits - pattern.length * 8; bitPosition++) {
        let match = true;
        for (let patternIndex = 0; patternIndex < pattern.length; patternIndex++) {
            const byte = readByteFromBits(trackBits, bitPosition + patternIndex * 8);
            if (byte !== pattern[patternIndex]) {
                match = false;
                break;
            }
        }
        if (match) return bitPosition;
    }

    return -1;
}

/**
 * Decode 4-and-4 encoded byte pair (used in address field headers).
 *
 * Reverses the 4-and-4 encoding by extracting odd bits from first byte
 * and even bits from second byte.
 *
 * @param odd - First byte (contains odd bits)
 * @param even - Second byte (contains even bits)
 * @returns Decoded byte value
 */
function decode4And4(odd: number, even: number): number {
    return ((odd & 0x55) << 1) | (even & 0x55);
}

/**
 * Decode a track's bits into 16 sectors by finding and decoding sector markers.
 *
 * Scans track for address prologues (D5 AA 96), reads sector headers,
 * finds data prologues (D5 AA AD), and decodes 6-and-2 sector data.
 *
 * @param trackBits - Track data (6656 bytes = 53248 bits)
 * @returns Map of sector numbers (0-15) to 256-byte sector data
 */
export function decodeTrackBits(trackBits: Uint8Array): Map<number, Uint8Array> {
    const sectors = new Map<number, Uint8Array>();
    let bitPosition = 0;
    const maxBits = trackBits.length * 8;

    while (bitPosition < maxBits && sectors.size < 16) {
        // Find address prologue D5 AA 96
        bitPosition = findPrologue(trackBits, bitPosition, [0xd5, 0xaa, 0x96]);
        if (bitPosition === -1) break;

        bitPosition += 24; // Skip prologue (3 bytes)

        // Decode 4-and-4 header (volume, track, sector, checksum)
        const vol = decode4And4(
            readByteFromBits(trackBits, bitPosition),
            readByteFromBits(trackBits, bitPosition + 8),
        );
        const track = decode4And4(
            readByteFromBits(trackBits, bitPosition + 16),
            readByteFromBits(trackBits, bitPosition + 24),
        );
        const sector = decode4And4(
            readByteFromBits(trackBits, bitPosition + 32),
            readByteFromBits(trackBits, bitPosition + 40),
        );
        const checksum = decode4And4(
            readByteFromBits(trackBits, bitPosition + 48),
            readByteFromBits(trackBits, bitPosition + 56),
        );

        bitPosition += 64; // Skip header (8 bytes)

        // Verify checksum (should equal vol XOR track XOR sector)
        if (checksum !== (vol ^ track ^ sector)) {
            console.warn(`Address checksum mismatch at sector ${sector}`);
        }

        // Find data prologue D5 AA AD
        bitPosition = findPrologue(trackBits, bitPosition, [0xd5, 0xaa, 0xad]);
        if (bitPosition === -1) continue;

        bitPosition += 24; // Skip prologue (3 bytes)

        // Read 343 encoded bytes
        const encodedData = new Uint8Array(343);
        for (let byteIndex = 0; byteIndex < 343; byteIndex++) {
            encodedData[byteIndex] = readByteFromBits(trackBits, bitPosition);
            bitPosition += 8;
        }

        // Decode sector data (343 nibbles → 256 bytes)
        try {
            const sectorData = decode6And2(encodedData);
            sectors.set(sector, sectorData);
        } catch (err) {
            console.warn(`Failed to decode sector ${sector}: ${err}`);
        }
    }

    return sectors;
}
