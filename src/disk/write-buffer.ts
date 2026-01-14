/**
 * Copy-on-write buffer for tracking disk modifications in memory.
 *
 * Implements lazy cloning: tracks are only copied when first written to,
 * minimizing memory usage. Maintains dirty flags to identify which tracks
 * need to be saved to disk.
 *
 * Why copy-on-write? Most disk operations are reads. By deferring track
 * copies until the first write, we avoid cloning 35 tracks (231 KB) when
 * the user might only modify a few sectors.
 */

export class WriteBuffer {
    // Constants for track geometry (WOZ format: 6656 bytes per track)
    private static readonly TRACK_SIZE_BYTES = 6656;
    private static readonly MAX_BIT_POSITION = WriteBuffer.TRACK_SIZE_BYTES * 8 - 1;

    // Track storage: we maintain two maps to implement copy-on-write.
    // originalTracks holds the pristine WOZ data, modifiedTracks holds cloned copies.
    private readonly originalTracks: Map<number, Uint8Array> = new Map();
    private readonly modifiedTracks: Map<number, Uint8Array> = new Map();

    // Dirty tracking: Set of quarter-track numbers that have been modified.
    // Used by DiskWriter to know which tracks need serialization.
    private readonly dirtyTracks: Set<number> = new Set();

    /**
     * Store original track data from WozImage.
     *
     * Called lazily when a track is first accessed for writing. The original
     * data serves as the source for copy-on-write cloning.
     *
     * @param quarterTrack - Quarter-track number (0-159, where 0-3 = track 0, 4-7 = track 1, etc.)
     * @param trackData - Original track data from WOZ image (6656 bytes)
     */
    setOriginalTrack(quarterTrack: number, trackData: Uint8Array): void {
        this.originalTracks.set(quarterTrack, trackData);
    }

    /**
     * Write a single bit to the track with copy-on-write semantics.
     *
     * On first write to a track, clones the original data. Subsequent writes
     * modify the cloned copy. This is more efficient than eagerly cloning all
     * tracks at load time, since most disks are read-only in practice.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @param bitPosition - Bit position within track (0-53247 for standard 6656-byte track)
     * @param value - Bit value to write (0 or 1)
     * @throws Error if bitPosition exceeds track bounds
     */
    writeBit(quarterTrack: number, bitPosition: number, value: 0 | 1): void {
        // Validate bounds to prevent buffer overruns
        if (bitPosition < 0 || bitPosition > WriteBuffer.MAX_BIT_POSITION) {
            throw new Error(`bitPos ${bitPosition} out of bounds`);
        }

        // Lazy cloning: copy track on first write
        if (!this.modifiedTracks.has(quarterTrack)) {
            const originalData = this.originalTracks.get(quarterTrack);
            const trackData = originalData
                ? new Uint8Array(originalData) // Clone existing track
                : new Uint8Array(WriteBuffer.TRACK_SIZE_BYTES); // Create blank track
            this.modifiedTracks.set(quarterTrack, trackData);
        }

        // Modify the bit using bitwise operations
        const trackData = this.modifiedTracks.get(quarterTrack)!;
        const byteIndex = bitPosition >> 3; // Divide by 8 (faster than Math.floor)
        const bitOffset = bitPosition & 7; // Modulo 8 (faster than %)
        const bitMask = 0x80 >> bitOffset; // MSB-first bit ordering

        if (value === 1) {
            trackData[byteIndex] |= bitMask; // Set bit
        } else {
            trackData[byteIndex] &= ~bitMask; // Clear bit
        }

        // Mark track as dirty (needs save)
        this.dirtyTracks.add(quarterTrack);
    }

    /**
     * Check if original track data has been loaded for a given quarter-track.
     *
     * Used by DiskController to determine if lazy loading is needed before writing.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns true if original track data exists in buffer
     */
    hasOriginalTrack(quarterTrack: number): boolean {
        return this.originalTracks.has(quarterTrack);
    }

    /**
     * Get current state of a track (modified or original).
     *
     * Returns the modified copy if it exists (track has been written to),
     * otherwise returns the original WOZ data. If neither exists, returns
     * a blank track (all zeros).
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns Track data bytes (6656 bytes)
     */
    getTrack(quarterTrack: number): Uint8Array {
        return (
            this.modifiedTracks.get(quarterTrack) ||
            this.originalTracks.get(quarterTrack) ||
            new Uint8Array(WriteBuffer.TRACK_SIZE_BYTES)
        );
    }

    /**
     * Get all modified tracks for serialization.
     *
     * Used by DiskWriter to retrieve only the tracks that need to be
     * written to the output file (avoids rewriting unchanged tracks).
     *
     * @returns Map of quarter-track numbers to modified track data
     */
    getModifiedTracks(): Map<number, Uint8Array> {
        return this.modifiedTracks;
    }

    /**
     * Check if any tracks have unsaved modifications.
     *
     * Used to show "*" dirty indicator in UI and determine if save is needed.
     *
     * @returns true if any tracks are dirty (unsaved changes exist)
     */
    isDirty(): boolean {
        return this.dirtyTracks.size > 0;
    }

    /**
     * Check if a specific track has been modified.
     *
     * @param quarterTrack - Quarter-track number (0-159)
     * @returns true if this track has unsaved changes
     */
    hasDirtyTrack(quarterTrack: number): boolean {
        return this.dirtyTracks.has(quarterTrack);
    }

    /**
     * Get count of modified tracks.
     *
     * Useful for logging and diagnostics (e.g., "Saving 3 modified tracks...").
     *
     * @returns Number of tracks with unsaved modifications
     */
    getDirtyTrackCount(): number {
        return this.dirtyTracks.size;
    }

    /**
     * Clear dirty flags after successful save.
     *
     * Promotes modified tracks to "original" status since they're now persisted
     * to disk. The next save will only write tracks modified *after* this call.
     *
     * Why move instead of just clearing? We want to preserve the modified data
     * as the new baseline for future copy-on-write operations.
     */
    clearDirty(): void {
        // Promote all modified tracks to originals (they're now the baseline)
        for (const [quarterTrack, trackData] of this.modifiedTracks) {
            this.originalTracks.set(quarterTrack, trackData);
        }

        // Clear modification tracking
        this.modifiedTracks.clear();
        this.dirtyTracks.clear();
    }

    /**
     * Reset all modifications without saving.
     *
     * Discards all changes and returns the buffer to a clean state. Original
     * tracks remain loaded for future write operations.
     *
     * Used when ejecting a disk or canceling unsaved changes.
     */
    reset(): void {
        this.modifiedTracks.clear();
        this.dirtyTracks.clear();
        // Note: originalTracks intentionally NOT cleared - they remain for future writes
    }

    /**
     * Snapshot of WriteBuffer state for save/restore.
     *
     * Captures dirty track flags and modified track data so that save states
     * preserve unsaved disk modifications. Original tracks are NOT saved -
     * they're lazy-loaded from the WozImage when needed.
     */
    getState(): WriteBufferState {
        return {
            dirtyTracks: Array.from(this.dirtyTracks),
            modifiedTracks: Array.from(this.modifiedTracks.entries()).map(
                ([quarterTrack, trackData]) => ({
                    quarterTrack,
                    trackData: new Uint8Array(trackData), // Copy to prevent mutation
                }),
            ),
        };
    }

    /**
     * Restore WriteBuffer state from snapshot.
     *
     * Restores dirty flags and modified track data. Call AFTER loadImage()
     * to override the reset() that loadImage() performs.
     *
     * Note: originalTracks are NOT restored - they're lazy-loaded from the
     * WozImage when a track is first written to after restore.
     */
    setState(state: WriteBufferState): void {
        // Restore dirty tracks (clear and repopulate since it's readonly)
        this.dirtyTracks.clear();
        for (const qt of state.dirtyTracks) {
            this.dirtyTracks.add(qt);
        }

        // Restore modified tracks
        this.modifiedTracks.clear();
        for (const { quarterTrack, trackData } of state.modifiedTracks) {
            this.modifiedTracks.set(quarterTrack, new Uint8Array(trackData));
        }
        // originalTracks left empty - will be lazy-loaded from WozImage when needed
    }
}

/**
 * Serializable snapshot of WriteBuffer state.
 *
 * Used by save state to preserve unsaved disk modifications.
 */
export interface WriteBufferState {
    /** Quarter-track numbers that have unsaved modifications */
    dirtyTracks: number[];

    /** Modified track data (only tracks that have been written to) */
    modifiedTracks: Array<{
        quarterTrack: number;
        trackData: Uint8Array;
    }>;
}
