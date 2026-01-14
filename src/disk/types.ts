/**
 * Disk II type definitions.
 *
 * Defines the DiskImage interface for bit-level disk access and
 * DiskFormat enum for supported disk image formats.
 */

/**
 * Disk image interface for bit-level disk access.
 *
 * Provides an abstraction over different disk image formats (WOZ, DSK, etc.)
 * with a unified bit-level read interface. This allows the emulator to work
 * with any format that implements this interface without knowing implementation
 * details.
 *
 * Why bit-level access? The Apple II Disk II controller reads/writes individual
 * bits from the rotating disk. Higher-level formats like DSK store sectors, but
 * the hardware operates at the bit level. WOZ format preserves this bit stream,
 * enabling accurate emulation of copy-protected disks and precise timing.
 *
 * Implementations:
 * - WozImage: Native WOZ format with bit-level storage
 * - (Future) DskImage: Sector-based formats converted to bit stream on-the-fly
 */
export interface DiskImage {
    /**
     * Write protection flag from disk image metadata.
     *
     * When true, indicates the disk should be treated as write-protected
     * (like a physical disk with the write-protect tab covered). Can be
     * overridden by user via F8 key or --writable CLI flag.
     */
    readonly isWriteProtected: boolean;

    /**
     * Optimal timing in CPU cycles per bit.
     *
     * Determines how fast bits should be read from the disk. Typically 32,
     * meaning 32 CPU cycles (4µs at 1.023 MHz) per bit, matching the real
     * Disk II's ~250 kbit/s data rate.
     *
     * WOZ2 format stores this per-disk for improved accuracy. WOZ1 uses
     * the default value of 32.
     */
    readonly optimalTiming: number;

    /**
     * Highest quarter-track number with data (0-159).
     *
     * Standard disks use tracks 0-34 (quarter-tracks 0-139), but some
     * copy-protected software uses extended tracks 35-39. This value
     * indicates the highest quarter-track that contains data.
     */
    readonly maxQuarterTrack: number;

    /**
     * Read a single bit from disk at given position.
     *
     * Simulates reading one bit from the rotating disk at the current head
     * position. Bit positions wrap around track length (e.g., on a 50000-bit
     * track, position 50001 wraps to position 1).
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @param bitPosition - Bit position within track (wraps at track length)
     * @returns Bit value (0 or 1)
     */
    readBit(quarterTrack: number, bitPosition: number): 0 | 1;

    /**
     * Get number of bits in a track.
     *
     * Track lengths vary due to Constant Angular Velocity (CAV) - outer tracks
     * are physically longer and contain more bits. Typical range: 48000-52000 bits.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns Bit count for this track
     */
    getTrackBitCount(quarterTrack: number): number;

    /**
     * Check if a track exists in the image.
     *
     * Not all quarter-tracks may have data. The WOZ TMAP (track map) indicates
     * which quarter-tracks are present (value < 255 = track exists).
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns true if track has data, false otherwise
     */
    hasTrack(quarterTrack: number): boolean;

    /**
     * Get all track data as byte array.
     *
     * Returns the complete bit stream for a track as a byte array. Used by
     * WriteBuffer for copy-on-write cloning when track is first modified.
     *
     * Why return bytes instead of bits? Bits are packed into bytes (8 bits per
     * byte, MSB-first). A 50000-bit track occupies 6250 bytes.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns Track data bytes (empty if track doesn't exist)
     */
    getTrackBits(quarterTrack: number): Uint8Array;

    /**
     * Get the raw file data for serialization.
     *
     * Returns the original bytes used to construct this image (e.g., full WOZ
     * file contents). Used by save state to preserve disk images - the raw data
     * can be passed to a new image constructor to recreate the disk.
     *
     * @returns Raw file bytes (copy to prevent external modification)
     */
    getRawData(): Uint8Array;
}

/**
 * Supported disk image formats.
 *
 * The emulator supports multiple disk formats:
 * - WOZ: Native bit-level format (WOZ1/WOZ2)
 * - DSK/DO: DOS 3.3 sector format (auto-converted to WOZ on load)
 * - PO: ProDOS sector format (auto-converted to WOZ on load)
 *
 * All formats are converted to WOZ internally for emulation, then saved
 * back to original format on F5 save (format preservation).
 */
export enum DiskFormat {
    WOZ = 'woz',
    DSK = 'dsk',
    DO = 'do',
    PO = 'po',
}
