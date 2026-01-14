/**
 * WOZ disk image format parser and reader.
 *
 * Parses WOZ1 and WOZ2 disk image formats and provides bit-level read access
 * to track data. Supports write protection and optimal timing metadata.
 *
 * Based on WOZ specification: https://applesaucefdc.com/woz/reference2/
 */

import { DiskImage } from './types.js';
import { DEFAULT_OPTIMAL_TIMING, DEFAULT_TRACK_BITS, MAX_QUARTER_TRACKS } from './constants.js';

export class WozImage implements DiskImage {
    /** Write protection flag from WOZ header (bit 22) */
    readonly isWriteProtected: boolean;

    /** Optimal bit timing in CPU cycles (WOZ2 only, defaults to 32 for WOZ1) */
    readonly optimalTiming: number;

    /** Highest quarter-track number with data (0-159) */
    readonly maxQuarterTrack: number;

    /** Raw WOZ file data */
    private readonly data: Uint8Array;

    /** Byte offset in file for each quarter-track's data (0 = no track) */
    private readonly trackByteOffsets: number[] = new Array(MAX_QUARTER_TRACKS).fill(0);

    /** Bit count for each quarter-track */
    private readonly trackBitCounts: number[] = new Array(MAX_QUARTER_TRACKS).fill(
        DEFAULT_TRACK_BITS,
    );

    /**
     * Parse WOZ disk image and extract track metadata.
     *
     * Supports both WOZ1 (fixed 6656-byte tracks) and WOZ2 (variable-length tracks)
     * formats. Parses the TMAP (track map) to locate physical track data and extracts
     * write protection and timing metadata from the INFO chunk.
     *
     * @param wozData - Raw WOZ file bytes
     * @throws Error if file is invalid (too small, bad signature)
     */
    constructor(wozData: Uint8Array) {
        // Validate minimum file size (header + INFO chunk + TMAP)
        if (wozData.length < 256) {
            throw new Error(`Invalid WOZ file: too small (${wozData.length} bytes)`);
        }

        this.data = wozData;

        // Check format version via signature
        const isWoz2 = this.checkSignature('WOZ2');
        const isWoz1 = !isWoz2 && this.checkSignature('WOZ1');

        if (!isWoz2 && !isWoz1) {
            throw new Error('Invalid WOZ file: signature mismatch');
        }

        // Parse format-specific metadata and track map
        if (isWoz2) {
            const parsed = this.parseWoz2();
            this.isWriteProtected = parsed.writeProtected;
            this.optimalTiming = parsed.optimalTiming;
            this.maxQuarterTrack = parsed.maxQuarterTrack;
        } else {
            const parsed = this.parseWoz1();
            this.isWriteProtected = parsed.writeProtected;
            this.optimalTiming = DEFAULT_OPTIMAL_TIMING;
            this.maxQuarterTrack = parsed.maxQuarterTrack;
        }
    }

    /**
     * Read a single bit from disk at given quarter-track and bit position.
     *
     * The disk rotates continuously, so bit positions wrap around the track length.
     * For example, on a 50000-bit track, position 50001 wraps to position 1.
     *
     * Why random bits for empty tracks? The Applesauce WOZ spec states that reading
     * from an empty track (no physical data) should return electrical noise, which
     * is approximately 30% ones. This simulates the behavior of a real Disk II drive
     * reading a blank area of the disk.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @param bitPosition - Bit position within track (wraps around track length)
     * @returns Bit value (0 or 1)
     * @throws Error if quarter-track is out of range
     */
    readBit(quarterTrack: number, bitPosition: number): 0 | 1 {
        // Validate quarter-track range
        if (quarterTrack < 0 || quarterTrack >= MAX_QUARTER_TRACKS) {
            throw new Error(`Invalid quarter-track: ${quarterTrack}`);
        }

        // Empty track? Return random electrical noise (30% ones per Applesauce spec)
        if (this.trackByteOffsets[quarterTrack] === 0) {
            return Math.random() > 0.7 ? 1 : 0;
        }

        // Wrap bit position around track length (simulates continuous rotation)
        const bitCount = this.trackBitCounts[quarterTrack];
        const wrappedBitPosition = bitPosition % bitCount;

        // Calculate byte offset in file and extract the bit
        const fileOffset = this.trackByteOffsets[quarterTrack] + (wrappedBitPosition >> 3);
        const byte = this.data[fileOffset];
        const bitIndex = wrappedBitPosition & 7;

        // Extract bit using MSB-first ordering (bit 7 = index 0)
        return (byte & (0x80 >> bitIndex)) !== 0 ? 1 : 0;
    }

    /**
     * Get number of bits in track.
     *
     * Track bit counts vary by track due to variable disk rotation speed (CAV).
     * Outer tracks are longer than inner tracks, so they contain more bits for
     * the same angular rotation. Typical range: 48000-52000 bits per track.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns Bit count for this track
     * @throws Error if quarter-track is out of range
     */
    getTrackBitCount(quarterTrack: number): number {
        if (quarterTrack < 0 || quarterTrack >= MAX_QUARTER_TRACKS) {
            throw new Error(`Invalid quarter-track: ${quarterTrack}`);
        }
        return this.trackBitCounts[quarterTrack];
    }

    /**
     * Check if track has data.
     *
     * Not all quarter-tracks have data in the WOZ image. The TMAP (track map)
     * indicates which quarter-tracks exist by mapping them to physical track
     * blocks. A value of 255 in TMAP means "no track data".
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns true if track exists in image
     */
    hasTrack(quarterTrack: number): boolean {
        if (quarterTrack < 0 || quarterTrack >= MAX_QUARTER_TRACKS) {
            return false;
        }
        return this.trackByteOffsets[quarterTrack] !== 0;
    }

    /**
     * Get all track bits as byte array.
     *
     * Returns a copy (not reference) to prevent external modification of the
     * pristine WOZ data. The WriteBuffer uses this for copy-on-write cloning
     * when a track is first modified.
     *
     * Why copy? If we returned a reference to this.data, external code could
     * modify the original WOZ file data, corrupting the "pristine" image that
     * copy-on-write depends on.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns Track data bytes (empty array if track doesn't exist)
     */
    getTrackBits(quarterTrack: number): Uint8Array {
        // Validate quarter-track range
        if (quarterTrack < 0 || quarterTrack >= MAX_QUARTER_TRACKS) {
            return new Uint8Array(0); // Return empty array for invalid tracks
        }

        // Check if track has data
        if (this.trackByteOffsets[quarterTrack] === 0) {
            return new Uint8Array(0); // Return empty array for missing tracks
        }

        // Calculate track size in bytes (round up bit count to nearest byte)
        const bitCount = this.trackBitCounts[quarterTrack];
        const byteCount = Math.ceil(bitCount / 8);

        // Extract track data from WOZ file (return copy to preserve original)
        const startOffset = this.trackByteOffsets[quarterTrack];
        const endOffset = startOffset + byteCount;

        return new Uint8Array(this.data.slice(startOffset, endOffset));
    }

    /**
     * Get the raw WOZ file data.
     *
     * Returns the original bytes used to construct this WozImage. Used by
     * save state to preserve disk images - the raw data can be passed to
     * a new WozImage constructor to recreate the disk.
     *
     * @returns Raw WOZ file bytes (copy to prevent external modification)
     */
    getRawData(): Uint8Array {
        return new Uint8Array(this.data);
    }

    /**
     * Check if WOZ file starts with expected signature.
     *
     * WOZ files begin with a 4-byte ASCII signature: "WOZ1" or "WOZ2".
     * This identifies the format version and is used to dispatch to the
     * appropriate parser.
     *
     * @param expected - Expected signature string ('WOZ1' or 'WOZ2')
     * @returns true if signature matches
     */
    private checkSignature(expected: 'WOZ1' | 'WOZ2'): boolean {
        const signature = String.fromCharCode(...this.data.slice(0, 4));
        return signature === expected;
    }

    /**
     * Parse WOZ2 format metadata and track map.
     *
     * WOZ2 improvements over WOZ1:
     * - Variable-length tracks (not fixed 6656 bytes)
     * - Optimal timing metadata (byte 59)
     * - Block-based storage (512-byte blocks)
     * - 8-byte track entries in TRKS chunk
     *
     * @returns Parsed metadata (write protection, timing, max track)
     */
    private parseWoz2(): {
        writeProtected: boolean;
        optimalTiming: number;
        maxQuarterTrack: number;
    } {
        // INFO chunk byte 22: Write protect flag (1 = protected)
        const writeProtected = this.data[22] === 1;

        // INFO chunk byte 59: Optimal timing (0 = use default 32 cycles/byte)
        const optimalTiming = this.data[59] > 0 ? this.data[59] : DEFAULT_OPTIMAL_TIMING;

        let maxQuarterTrack = 0;

        // TMAP: bytes 88-247 (160 bytes, one per quarter-track)
        // Each byte is an index into the TRKS chunk (255 = no track)
        for (let quarterTrack = 0; quarterTrack < MAX_QUARTER_TRACKS; quarterTrack++) {
            const trackMapIndex = this.data[88 + quarterTrack];

            if (trackMapIndex < 255) {
                // TRKS chunk starts at byte 256
                // Each track entry is 8 bytes: [startBlock(2), blockCount(2), bitCount(4)]
                const trackEntryOffset = 256 + 8 * trackMapIndex;
                const trackEntry = this.data.slice(trackEntryOffset, trackEntryOffset + 8);

                // Track start block (little-endian 16-bit, multiply by 512 for byte offset)
                const startBlock = trackEntry[0] + (trackEntry[1] << 8);
                this.trackByteOffsets[quarterTrack] = 512 * startBlock;

                // Track bit count (little-endian 32-bit)
                this.trackBitCounts[quarterTrack] =
                    trackEntry[4] +
                    (trackEntry[5] << 8) +
                    (trackEntry[6] << 16) +
                    (trackEntry[7] << 24);

                maxQuarterTrack = quarterTrack;
            }
        }

        return { writeProtected, optimalTiming, maxQuarterTrack };
    }

    /**
     * Parse WOZ1 format metadata and track map.
     *
     * WOZ1 uses fixed 6656-byte track blocks. Track metadata (bit count,
     * byte count, splice info) is stored in the last 10 bytes of each block.
     *
     * Why 6656 bytes? This accommodates the longest possible track (~52000 bits)
     * rounded up to 6500 bytes, plus 156 bytes for metadata, rounded to 6656.
     *
     * @returns Parsed metadata (write protection, max track)
     */
    private parseWoz1(): { writeProtected: boolean; maxQuarterTrack: number } {
        // INFO chunk byte 22: Write protect flag (1 = protected)
        const writeProtected = this.data[22] === 1;

        let maxQuarterTrack = 0;

        // TMAP: bytes 88-247 (160 bytes, one per quarter-track)
        // Each byte is an index into fixed 6656-byte track blocks (255 = no track)
        for (let quarterTrack = 0; quarterTrack < MAX_QUARTER_TRACKS; quarterTrack++) {
            const trackMapIndex = this.data[88 + quarterTrack];

            if (trackMapIndex < 255) {
                // WOZ1: Fixed 6656-byte track blocks starting at byte 256
                this.trackByteOffsets[quarterTrack] = 256 + trackMapIndex * 6656;

                // Track metadata is in last 10 bytes of track block
                const metadataOffset = this.trackByteOffsets[quarterTrack] + 6646;
                const trackMetadata = this.data.slice(metadataOffset, metadataOffset + 10);

                // Bit count at bytes 2-3 (little-endian 16-bit)
                this.trackBitCounts[quarterTrack] = trackMetadata[2] + (trackMetadata[3] << 8);

                maxQuarterTrack = quarterTrack;
            }
        }

        return { writeProtected, maxQuarterTrack };
    }
}
