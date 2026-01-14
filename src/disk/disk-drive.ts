/**
 * Single Disk II drive state and operations.
 *
 * Manages motor state, stepper motor head positioning, track rotation timing,
 * and read/write modes. Coordinates between the original WOZ disk image and
 * the WriteBuffer for tracking modifications.
 *
 * Key responsibilities:
 * - Stepper motor control (40 tracks × 4 quarter-tracks = 160 positions)
 * - Logic State Sequencer (LSS) for self-clocking bit assembly
 * - Cross-track synchronization when seeking between tracks
 * - Write protection management (disk flag, override, force protect)
 */

import { DiskImage } from './types.js';
import { MAGNET_TO_POSITION, POSITION_TO_DIRECTION } from './constants.js';
import { WriteBuffer } from './write-buffer.js';

export class DiskDrive {
    /** Drive number (1 or 2) - immutable after construction */
    readonly driveNumber: 1 | 2;

    /** Motor running state (controlled by $C0E9 MOTOR_ON / $C0E8 MOTOR_OFF) */
    motorRunning = false;

    /** Write mode flag (true = writing, false = reading) */
    writeMode = false;

    /** Current quarter-track position (0-159, where 0-3=track 0, 4-7=track 1, etc.) */
    quarterTrack = 0;

    /** Previous quarter-track (used for cross-track bit position scaling) */
    previousQuarterTrack = 0;

    /** Current 4-bit stepper motor phase state (bits 0-3 correspond to phases 0-3) */
    currentPhase = 0;

    /**
     * Current bit position within the track (0 to trackBitCount-1).
     * Wraps around at track boundary to simulate continuous rotation.
     */
    trackBitPosition = 0;

    /**
     * Fractional cycle accumulator for sub-bit timing precision.
     * We accumulate CPU cycles and advance the head by whole bits when
     * enough cycles have elapsed (typically 4 cycles per bit).
     */
    private fractionalCycles = 0;

    /**
     * LSS data register for self-clocking bit assembly.
     * Bits are shifted in MSB-first until bit 7 is set (byte complete).
     * Special sync handling: don't shift when register is complete and bit is 0.
     */
    private lssDataRegister = 0;

    /** Loaded disk image (null if no disk) */
    image: DiskImage | null = null;

    /** Write protection override - allows writes to protected disks */
    writeProtectOverride = false;

    /** Force write protection - prevents writes even to writable disks */
    forceWriteProtect = false;

    /** Copy-on-write buffer for tracking modifications */
    private readonly writeBuffer: WriteBuffer = new WriteBuffer();

    /** Original file path (for F5 save operation) */
    private diskPath = '';

    constructor(driveNumber: 1 | 2) {
        this.driveNumber = driveNumber;
    }

    /**
     * Load a disk image into the drive.
     *
     * Resets all drive state to initial values. Track data is loaded lazily
     * into WriteBuffer when first accessed for writing (copy-on-write).
     *
     * @param image - Disk image to load (WOZ format)
     * @param filepath - Original file path (for save operations, empty string if none)
     */
    loadImage(image: DiskImage, filepath = ''): void {
        this.image = image;
        this.diskPath = filepath;
        this.writeBuffer.reset(); // Clear any dirty state from previous disk
        this.resetState();
    }

    /**
     * Eject the disk image from the drive.
     *
     * Clears the image reference and resets all drive state. Unsaved changes
     * in WriteBuffer are discarded.
     */
    ejectImage(): void {
        this.image = null;
        this.writeBuffer.reset();
        this.resetState();
    }

    /** Reset drive state to power-on defaults */
    private resetState(): void {
        this.quarterTrack = 0;
        this.previousQuarterTrack = 0;
        this.trackBitPosition = 0;
        this.fractionalCycles = 0;
        this.lssDataRegister = 0;
        this.currentPhase = 0;
        this.motorRunning = false;
        this.writeMode = false;
    }

    /**
     * Move stepper motor head in response to phase changes.
     *
     * The Disk II uses a 4-phase stepper motor. Energizing adjacent phases
     * moves the head by one quarter-track. This method:
     * 1. Looks up the physical position from the phase pattern
     * 2. Calculates direction and updates quarterTrack
     * 3. Advances the head rotation based on elapsed cycles
     * 4. Scales trackBitPosition when crossing tracks (Applesauce formula)
     *
     * Why cross-track sync? Tracks can have different bit counts (e.g.,
     * 50000 bits vs 51200 bits). When seeking, we scale the bit position
     * proportionally to maintain angular alignment.
     *
     * @param magnetPhase - 4-bit phase state from stepper switches ($C0E0-$C0E7)
     * @param elapsedCycles - CPU cycles since last I/O (for rotation simulation)
     */
    moveHead(magnetPhase: number, elapsedCycles: number): void {
        this.currentPhase = magnetPhase;

        // Look up physical position (0-7) from phase pattern via magnet table
        const physicalPosition = MAGNET_TO_POSITION[this.currentPhase];

        // Invalid pattern or motor stopped - no movement
        if (physicalPosition < 0 || !this.motorRunning) {
            return;
        }

        // Calculate movement direction using position lookup table
        const currentPosition = this.quarterTrack & 7; // Modulo 8
        const direction =
            POSITION_TO_DIRECTION[currentPosition][
                physicalPosition as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
            ];

        // Update head position
        this.previousQuarterTrack = this.quarterTrack;
        this.quarterTrack += direction;

        // Clamp to valid range (0-159)
        if (this.quarterTrack < 0) {
            this.quarterTrack = 0;
        } else if (this.quarterTrack >= 160) {
            this.quarterTrack = 159;
        }

        // Advance rotation based on elapsed time
        this.advanceHeadRotation(elapsedCycles);

        // Cross-track synchronization (scale bit position if track changed)
        if (this.image && this.quarterTrack !== this.previousQuarterTrack) {
            const previousBitCount = this.image.getTrackBitCount(this.previousQuarterTrack);
            const currentBitCount = this.image.getTrackBitCount(this.quarterTrack);

            // Scale position proportionally (Applesauce formula)
            if (previousBitCount > 0 && currentBitCount > 0) {
                this.trackBitPosition = Math.floor(
                    (this.trackBitPosition * currentBitCount) / previousBitCount,
                );
            }
        }
    }

    /**
     * Advance head rotation based on elapsed CPU cycles.
     *
     * The disk rotates continuously at 300 RPM (5 revolutions/second). At the
     * default timing of 4 CPU cycles per bit, this simulates realistic disk
     * rotation speed. We accumulate fractional cycles to avoid rounding errors
     * over long periods.
     *
     * Why public? Called directly by DiskController during disk I/O operations
     * when the motor is running but head isn't moving (no phase changes).
     *
     * @param elapsedCycles - CPU cycles since last I/O operation
     */
    advanceHeadRotation(elapsedCycles: number): void {
        // Accumulate cycles (includes fractional bits from previous calls)
        this.fractionalCycles += elapsedCycles;

        // Advance by whole bits (4 cycles per bit at default timing)
        const bitsToAdvance = Math.floor(this.fractionalCycles / 4);
        this.trackBitPosition += bitsToAdvance;

        // Preserve fractional cycles for next call
        this.fractionalCycles = this.fractionalCycles % 4;
    }

    /**
     * Read a single bit from the current track position.
     *
     * Reads from WriteBuffer if the track has been modified, otherwise reads
     * from the original WOZ image. Automatically advances trackBitPosition.
     *
     * Returns random bits (30% ones) when no disk is loaded, simulating
     * electrical noise per Applesauce specification.
     */
    private readBit(): 0 | 1 {
        if (!this.image) {
            // No disk - return random electrical noise (30% ones per Applesauce spec)
            return Math.random() > 0.7 ? 1 : 0;
        }

        const trackBitCount = this.image.getTrackBitCount(this.quarterTrack);

        // Wrap position at track boundary (simulates continuous rotation)
        this.trackBitPosition = this.trackBitPosition % trackBitCount;

        // Choose source: modified track (WriteBuffer) or original (WOZ image)
        let bit: 0 | 1;
        if (this.writeBuffer.hasDirtyTrack(this.quarterTrack)) {
            // Read from copy-on-write buffer
            const trackData = this.writeBuffer.getTrack(this.quarterTrack);
            const byteIndex = this.trackBitPosition >> 3; // Divide by 8
            const bitIndex = this.trackBitPosition & 7; // Modulo 8
            const bitMask = 0x80 >> bitIndex; // MSB-first

            bit = (trackData[byteIndex] & bitMask) !== 0 ? 1 : 0;
        } else {
            // Read from original WOZ image
            bit = this.image.readBit(this.quarterTrack, this.trackBitPosition);
        }

        // Advance position for next read
        this.trackBitPosition++;

        return bit;
    }

    /**
     * Read next byte using Logic State Sequencer (LSS).
     *
     * The LSS implements self-clocking bit assembly: bits are shifted into
     * an 8-bit register until bit 7 is set (byte complete). Special sync
     * handling prevents shifting when a complete byte is followed by a zero
     * bit (maintains alignment on sync bytes like $FF).
     *
     * Why self-clocking? The disk doesn't have a separate clock signal.
     * Instead, all valid bytes have bit 7 set, allowing the hardware to
     * detect byte boundaries in the bit stream.
     *
     * @param elapsedCycles - CPU cycles since last I/O operation
     * @returns Assembled byte from disk (or random noise if no disk)
     */
    readByte(elapsedCycles: number): number {
        if (!this.image) {
            // No disk - return random noise
            return Math.floor(Math.random() * 256);
        }

        const optimalTiming = this.image.optimalTiming;

        // Accumulate timing for bit-level precision
        this.fractionalCycles += elapsedCycles;

        // Read bits based on elapsed time (optimalTiming/8 cycles per bit)
        while (this.fractionalCycles >= optimalTiming / 8) {
            const bit = this.readBit();

            // LSS sync handling: skip shifting if register is complete and bit is 0
            // This maintains alignment on sync bytes (e.g., $FF $00 stays aligned)
            const skipShift = (this.lssDataRegister & 0x80) !== 0 && bit === 0;

            if (!skipShift) {
                // Check if we're about to complete a byte (bit 7 will be set)
                const willComplete = ((this.lssDataRegister << 1) | bit) & 0x80;

                // Reset register if already complete (start new byte)
                if (this.lssDataRegister & 0x80) {
                    this.lssDataRegister = 0;
                }

                // Shift in new bit (MSB-first)
                this.lssDataRegister = (this.lssDataRegister << 1) | bit;

                // Consume timing
                this.fractionalCycles -= optimalTiming / 8;

                // Return completed byte
                if (willComplete) {
                    break;
                }
            } else {
                // Consume timing even when skipping shift (maintains sync)
                this.fractionalCycles -= optimalTiming / 8;
            }
        }

        return this.lssDataRegister & 0xff;
    }

    /**
     * Set write mode.
     *
     * Called by DiskController in response to $C0EE (READ) and $C0EF (WRITE) accesses.
     *
     * @param enabled - true for write mode, false for read mode
     */
    setWriteMode(enabled: boolean): void {
        this.writeMode = enabled;
    }

    /**
     * Set write protection override.
     *
     * When enabled, allows writes to disks marked as write-protected in the
     * WOZ header. Useful for modifying copy-protected master disks.
     *
     * Activated by F8 key in UI.
     *
     * @param enabled - true to override write protection
     */
    setWriteProtectOverride(enabled: boolean): void {
        this.writeProtectOverride = enabled;
    }

    /**
     * Force write protection.
     *
     * When enabled, prevents all writes regardless of disk protection status.
     * Useful for protecting master disks from accidental modification.
     *
     * Set via --write-protect CLI flag.
     *
     * @param enabled - true to force protection
     */
    setForceWriteProtect(enabled: boolean): void {
        this.forceWriteProtect = enabled;
    }

    /**
     * Check if writes are currently allowed.
     *
     * Decision tree:
     * 1. No disk loaded → false
     * 2. Force protect enabled → false (takes precedence)
     * 3. Disk is protected BUT override enabled → true
     * 4. Disk is protected AND no override → false
     * 5. Disk is writable → true
     *
     * @returns true if write operations should succeed
     */
    isWriteAllowed(): boolean {
        if (!this.image) {
            return false; // No disk to write to
        }

        // Force protect overrides everything
        if (this.forceWriteProtect) {
            return false;
        }

        // Check image protection with override consideration
        return !this.image.isWriteProtected || this.writeProtectOverride;
    }

    /**
     * Get the write buffer for tracking modifications.
     *
     * Used by DiskController to access WriteBuffer for bit-level writes.
     *
     * @returns WriteBuffer instance (contains copy-on-write track data)
     */
    getWriteBuffer(): WriteBuffer {
        return this.writeBuffer;
    }

    /**
     * Get the original disk file path.
     *
     * Used by disk save handler to determine output file location for F5 save.
     *
     * @returns File path (empty string if disk was created in memory)
     */
    getDiskPath(): string {
        return this.diskPath;
    }

    /**
     * Snapshot of drive state for save/restore.
     *
     * Includes:
     * - Mechanical state (head position, motor, etc.)
     * - Disk identity (path and raw WOZ data)
     * - WriteBuffer state (unsaved modifications)
     */
    getState(): DiskDriveState {
        return {
            // Mechanical state
            motorRunning: this.motorRunning,
            writeMode: this.writeMode,
            quarterTrack: this.quarterTrack,
            previousQuarterTrack: this.previousQuarterTrack,
            currentPhase: this.currentPhase,
            trackBitPosition: this.trackBitPosition,
            fractionalCycles: this.fractionalCycles,
            lssDataRegister: this.lssDataRegister,

            // Disk identity
            diskPath: this.diskPath,
            diskData: this.image?.getRawData() ?? null,

            // WriteBuffer state (preserves unsaved modifications)
            writeBuffer: this.writeBuffer.getState(),
        };
    }

    /**
     * Restore drive state from snapshot.
     */
    setState(state: DiskDriveState): void {
        this.motorRunning = state.motorRunning;
        this.writeMode = state.writeMode;
        this.quarterTrack = state.quarterTrack;
        this.previousQuarterTrack = state.previousQuarterTrack;
        this.currentPhase = state.currentPhase;
        this.trackBitPosition = state.trackBitPosition;
        this.fractionalCycles = state.fractionalCycles;
        this.lssDataRegister = state.lssDataRegister;
    }
}

/**
 * Serializable snapshot of disk drive state.
 *
 * Includes:
 * - Mechanical state (head position, motor)
 * - Disk identity (path and raw data) for restoring the exact disk loaded
 * - WriteBuffer state for preserving unsaved modifications
 */
export interface DiskDriveState {
    // Mechanical state
    motorRunning: boolean;
    writeMode: boolean;
    quarterTrack: number;
    previousQuarterTrack: number;
    currentPhase: number;
    trackBitPosition: number;
    fractionalCycles: number;
    lssDataRegister: number;

    // Disk identity (for save state restoration)
    diskPath: string;
    diskData: Uint8Array | null;

    // WriteBuffer state (preserves unsaved modifications)
    writeBuffer: import('./write-buffer.js').WriteBufferState;
}
