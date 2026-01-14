/**
 * Disk II controller card implementation.
 *
 * Implements the Disk II controller card interface at $C0E0-$C0EF (slot 6).
 * Manages two physical drives and handles soft switch I/O for:
 * - Stepper motor control (4 phases × 2 states = 8 switches)
 * - Motor on/off with timeout
 * - Drive selection (1 or 2)
 * - Data latch control
 * - Read/write mode switching
 *
 * Key design notes:
 * - Motor timeout: Real Disk II hardware doesn't stop the motor immediately
 *   on MOTOR_OFF. There's a 1-second delay to avoid constant spin-up/down.
 * - Cycle tracking: We track elapsed cycles since last I/O to accurately
 *   simulate disk rotation speed (4 cycles per bit at default timing).
 * - Write protocol: Writes are byte-oriented. $C0EF loads data register,
 *   $C0ED triggers write and loads next byte.
 *
 * Based on: Understanding the Apple II (Sather), AppleWin, apple2ts
 */

import type { MemoryDevice } from 'cpu6502/bus';
import { toByte, type Byte, type Word } from 'cpu6502/types';
import { DiskDrive } from './disk-drive.js';
import { WozImage } from './woz-image.js';
import { SWITCH, MOTOR_TIMEOUT_MS } from './constants.js';

export class DiskIIController implements MemoryDevice {
    /** Address space size (16 bytes for $C0E0-$C0EF) */
    readonly size = 0x10;

    /** Drive 1 (physical) */
    private readonly drive1: DiskDrive;

    /** Drive 2 (physical) */
    private readonly drive2: DiskDrive;

    /** Currently selected drive (receives all I/O operations) */
    private activeDrive: DiskDrive;

    /**
     * Callback to get current CPU cycle count.
     * Provided by Apple2Machine to maintain timing accuracy.
     */
    private readonly getCycles: () => number;

    /**
     * Cycle count at last disk I/O operation.
     * Used to calculate elapsed cycles for disk rotation simulation.
     *
     * Why track this? The disk rotates continuously. By measuring elapsed
     * cycles, we can accurately advance the head position and read the
     * correct bits from the rotating track.
     */
    private lastIOCycle = 0;

    /**
     * Data latch state (Q6 line).
     * Controls whether operations load/shift data and affects behavior
     * of $C0EE (returns write-protect status when latch is on).
     */
    private dataLatchEnabled = false;

    /**
     * Motor running flag (controller-level state).
     * The actual motor state is per-drive, but controller tracks this
     * for timeout management.
     */
    private motorRunning = false;

    /**
     * Motor timeout handle.
     * Real hardware has ~1 second delay after MOTOR_OFF before motor stops.
     * This prevents constant spin-up/down when software repeatedly accesses
     * the drive. If MOTOR_ON is accessed during timeout, we cancel it.
     */
    private motorStopTimeout: NodeJS.Timeout | null = null;

    /**
     * Write data register.
     * Loaded by $C0EF (WRITE_ON) or $C0ED (LATCH_ON) in write mode.
     * Contains the byte to be written to disk when doWriteByte() is called.
     */
    private writeDataRegister = 0;

    /**
     * Create Disk II controller with two drives.
     *
     * @param getCycles - Callback to get current CPU cycle count (for timing)
     */
    constructor(getCycles: () => number) {
        this.getCycles = getCycles;
        this.drive1 = new DiskDrive(1);
        this.drive2 = new DiskDrive(2);
        this.activeDrive = this.drive1; // Drive 1 active by default
    }

    /**
     * Cancel any pending motor timeout.
     *
     * MUST be called before loading a save state to prevent stale timeouts
     * from corrupting the restored disk controller state. The timeout callback
     * would otherwise fire after the restore and set motorRunning=false on
     * the newly restored state.
     */
    cancelMotorTimeout(): void {
        if (this.motorStopTimeout) {
            clearTimeout(this.motorStopTimeout);
            this.motorStopTimeout = null;
        }
    }

    /**
     * Load a disk image into specified drive.
     *
     * Called by Apple2Machine when user loads a disk via CLI or UI.
     *
     * @param driveNumber - Drive number (1 or 2)
     * @param image - WOZ disk image to load
     * @param filepath - Original file path (for F5 save operation)
     */
    loadDisk(driveNumber: 1 | 2, image: WozImage, filepath = ''): void {
        const drive = driveNumber === 1 ? this.drive1 : this.drive2;
        drive.loadImage(image, filepath);
    }

    /**
     * Eject disk from specified drive.
     *
     * @param driveNumber - Drive number (1 or 2)
     */
    ejectDisk(driveNumber: 1 | 2): void {
        const drive = driveNumber === 1 ? this.drive1 : this.drive2;
        drive.ejectImage();
    }

    /**
     * Get drive instance by number.
     *
     * Used by disk save handler and UI to access drive state (write buffer,
     * file path, protection flags).
     *
     * @param driveNumber - Drive number (1 or 2)
     * @returns DiskDrive instance
     */
    getDrive(driveNumber: 1 | 2): DiskDrive {
        return driveNumber === 1 ? this.drive1 : this.drive2;
    }

    /**
     * Read from soft switch address (MemoryDevice interface).
     *
     * Handles all 16 soft switches at $C0E0-$C0EF:
     * - $C0E0-$C0E7: Stepper motor phases (move head)
     * - $C0E8: MOTOR_OFF (also reads data - see note below)
     * - $C0E9: MOTOR_ON
     * - $C0EA: SELECT_DRIVE1
     * - $C0EB: SELECT_DRIVE2
     * - $C0EC: LATCH_OFF / SHIFT (reads data)
     * - $C0ED: LATCH_ON / LOAD (writes data in write mode)
     * - $C0EE: WRITE_OFF / Q7_LOW (read mode, returns write-protect status if latch on)
     * - $C0EF: WRITE_ON / Q7_HIGH (write mode)
     *
     * Critical timing note: lastIOCycle is reset AFTER disk I/O operations,
     * not at the start of read(). This allows cycles to accumulate properly
     * between I/O operations for accurate disk rotation simulation.
     *
     * Why does $C0E8 (MOTOR_OFF) read data? Some games (e.g., Mr. Do!) rely
     * on this behavior. It's likely a hardware quirk of the real Disk II.
     *
     * @param offset - Device-relative offset (0-15 for $C0E0-$C0EF)
     * @returns Byte value (disk data or status flags)
     */
    read(offset: Word): Byte {
        // Calculate elapsed cycles since last I/O for disk rotation
        const elapsedCycles = this.getCycles() - this.lastIOCycle;
        // NOTE: lastIOCycle is NOT reset here - see comments below

        const switchOffset = offset & 0x0f;
        let readData = 0;

        switch (switchOffset) {
            case SWITCH.MOTOR_OFF: // $C0E8
                // Special case: also reads data (quirk relied upon by some games)
                if (this.activeDrive.motorRunning && !this.activeDrive.writeMode) {
                    readData = this.activeDrive.readByte(elapsedCycles);
                    this.lastIOCycle = this.getCycles(); // Reset after I/O
                }
                this.stopMotorWithDelay();
                break;

            case SWITCH.MOTOR_ON: // $C0E9
                this.startMotor();
                break;

            case SWITCH.DRIVE1: // $C0EA
                this.selectDrive(1);
                break;

            case SWITCH.DRIVE2: // $C0EB
                this.selectDrive(2);
                break;

            case SWITCH.LATCH_OFF: // $C0EC (SHIFT/READ)
                // Read data if motor running and in read mode
                if (this.activeDrive.motorRunning && !this.activeDrive.writeMode) {
                    readData = this.activeDrive.readByte(elapsedCycles);
                    this.lastIOCycle = this.getCycles(); // Reset after I/O
                }
                this.dataLatchEnabled = false;
                break;

            case SWITCH.LATCH_ON: // $C0ED (LOAD)
                this.dataLatchEnabled = true;
                // If in write mode, write the previous byte and prepare for next
                if (this.activeDrive.motorRunning && this.activeDrive.writeMode) {
                    this.writeByteToTrack(elapsedCycles);
                    this.lastIOCycle = this.getCycles(); // Reset after I/O
                }
                break;

            case SWITCH.WRITE_OFF: // $C0EE (Q7 low = READ mode)
                // If exiting write mode, flush the final byte
                if (this.activeDrive.motorRunning && this.activeDrive.writeMode) {
                    this.writeByteToTrack(elapsedCycles);
                    this.lastIOCycle = this.getCycles(); // Reset after I/O
                }
                this.activeDrive.setWriteMode(false);

                // Return write-protect status if data latch is enabled
                if (this.dataLatchEnabled) {
                    // Bit 7 clear (0x00) = writable, bit 7 set (0x80) = protected
                    const writable = this.activeDrive.isWriteAllowed();
                    readData = writable ? 0x00 : 0x80;
                }
                break;

            case SWITCH.WRITE_ON: // $C0EF (Q7 high = WRITE mode)
                this.activeDrive.setWriteMode(true);
                break;

            default:
                // Stepper motor phases ($C0E0-$C0E7)
                if (switchOffset >= 0x0 && switchOffset <= 0x7) {
                    this.handleStepperPhase(switchOffset, elapsedCycles);
                }
                break;
        }

        return toByte(readData);
    }

    /**
     * Write to soft switch address (MemoryDevice interface).
     *
     * Most switches are read-only (delegated to read() method). Only three
     * switches have distinct write behavior:
     * - $C0EE (WRITE_OFF): Same as read
     * - $C0EF (WRITE_ON): Activates write mode AND loads data register
     * - $C0ED (LATCH_ON): In write mode, writes previous byte and loads new value
     *
     * Why delegate to read()? The 6502 bus performs both read and write cycles
     * for some operations. The soft switches respond to address access regardless
     * of R/W line state, so we delegate to read() for consistent behavior.
     *
     * @param offset - Device-relative offset (0-15 for $C0E0-$C0EF)
     * @param value - Byte value being written (used for write data register)
     */
    write(offset: Word, value: Byte): void {
        const elapsedCycles = this.getCycles() - this.lastIOCycle;
        const switchOffset = offset & 0x0f;

        switch (switchOffset) {
            case SWITCH.WRITE_OFF: // $C0EE
                // Same as read behavior
                this.read(offset);
                break;

            case SWITCH.WRITE_ON: // $C0EF (Q7 high)
                this.activeDrive.setWriteMode(true);
                // Store value for next write operation
                this.writeDataRegister = value;
                break;

            case SWITCH.LATCH_ON: // $C0ED (LOAD)
                if (this.activeDrive.motorRunning && this.activeDrive.writeMode) {
                    // Write previous byte, then load new value
                    this.writeByteToTrack(elapsedCycles);
                    this.lastIOCycle = this.getCycles();
                    this.writeDataRegister = value;
                } else {
                    // Not in write mode - delegate to read
                    this.read(offset);
                }
                break;

            default:
                // All other switches - delegate to read
                this.read(offset);
                break;
        }
    }

    /**
     * Write a byte to the current track position.
     *
     * Writes all 8 bits of writeDataRegister to the WriteBuffer using
     * copy-on-write semantics. Bits are written MSB-first to match hardware.
     *
     * Why guard conditions? Prevent corrupting disk state if:
     * 1. Motor isn't running (head position undefined)
     * 2. Not in write mode (software error)
     * 3. Write protection active (safety check)
     * 4. No disk loaded (nothing to write to)
     *
     * Why skip zero bytes? Optimization - writing $00 is rare in valid disk
     * data (only in gap bytes), and skipping it saves WriteBuffer operations.
     *
     * @param elapsedCycles - Cycles since last I/O (for head advancement)
     */
    private writeByteToTrack(elapsedCycles: number): void {
        // Guard conditions
        if (!this.activeDrive.motorRunning) return;
        if (!this.activeDrive.writeMode) return;
        if (!this.activeDrive.isWriteAllowed()) return;
        if (!this.activeDrive.image) return;

        const quarterTrack = this.activeDrive.quarterTrack;
        const writeBuffer = this.activeDrive.getWriteBuffer();

        // Lazy-load original track data if not yet loaded
        if (!writeBuffer.hasOriginalTrack(quarterTrack)) {
            const trackData = this.activeDrive.image.getTrackBits(quarterTrack);
            if (trackData && trackData.length > 0) {
                writeBuffer.setOriginalTrack(quarterTrack, trackData);
            }
        }

        // Write all 8 bits (MSB first)
        if (this.writeDataRegister > 0) {
            for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
                const bitValue = this.writeDataRegister & (1 << bitIndex) ? 1 : 0;
                writeBuffer.writeBit(
                    quarterTrack,
                    this.activeDrive.trackBitPosition,
                    bitValue as 0 | 1,
                );
                this.activeDrive.trackBitPosition++;
            }
        }
    }

    /**
     * Handle stepper motor phase change.
     *
     * The Disk II uses a 4-phase stepper motor. Each phase has two states
     * (on/off), giving 8 soft switches ($C0E0-$C0E7). Phases are numbered
     * 0-3, and each has an ON switch (odd offset) and OFF switch (even).
     *
     * Example: $C0E0 = Phase 0 OFF, $C0E1 = Phase 0 ON
     *
     * How it works:
     * 1. Decode phase number from offset (bits 1-2)
     * 2. Decode state from offset (bit 0: 0=off, 1=on)
     * 3. Update phase bits in currentPhase (4-bit value)
     * 4. Call DiskDrive.moveHead() if motor is running
     *
     * Why check motor? Head only moves when motor is spinning. Accessing
     * stepper switches with motor off just changes phase state without movement.
     *
     * @param switchOffset - Switch offset (0-7 for phases 0-3 on/off)
     * @param elapsedCycles - Cycles since last I/O (for head rotation)
     */
    private handleStepperPhase(switchOffset: number, elapsedCycles: number): void {
        const phaseNumber = switchOffset >> 1; // Extract phase 0-3 from bits 1-2
        const phaseOn = (switchOffset & 1) === 1; // Extract state from bit 0

        // Update phase bits (4-bit value where each bit = one phase)
        if (phaseOn) {
            this.activeDrive.currentPhase |= 1 << phaseNumber; // Set bit
        } else {
            this.activeDrive.currentPhase &= ~(1 << phaseNumber); // Clear bit
        }

        // Move head if motor is running
        if (this.activeDrive.motorRunning) {
            this.activeDrive.moveHead(this.activeDrive.currentPhase, elapsedCycles);
        }
    }

    /**
     * Start motor spinning immediately.
     *
     * Cancels any pending stop timeout (if motor was in delay period) and
     * sets motor to running state. If motor wasn't spinning, resets fractional
     * cycle accumulator to start fresh timing.
     *
     * Why access private field? The fractionalCycles field is private in
     * DiskDrive. We use bracket notation to bypass TypeScript's access control.
     * This is a pragmatic compromise - proper solution would be adding a
     * public resetTiming() method to DiskDrive.
     */
    private startMotor(): void {
        if (this.motorStopTimeout) {
            // Motor was in stop-delay period - cancel it
            clearTimeout(this.motorStopTimeout);
            this.motorStopTimeout = null;
        } else {
            // Motor was fully stopped - reset timing for fresh start
            this.activeDrive['fractionalCycles'] = 0;
        }

        this.motorRunning = true;
        this.activeDrive.motorRunning = true;
    }

    /**
     * Stop motor with 1-second delay (matches real hardware).
     *
     * Real Disk II hardware doesn't stop the motor immediately on MOTOR_OFF.
     * Instead, it has a ~1 second delay circuit. This prevents constant
     * spin-up/down when software repeatedly accesses the drive (common pattern).
     *
     * Why two-level state? Controller tracks motorRunning separately from
     * drive. This allows us to manage the timeout here while drive maintains
     * its actual motor state.
     *
     * If MOTOR_ON is accessed during timeout, startMotor() cancels it.
     */
    private stopMotorWithDelay(): void {
        this.motorRunning = false;

        // Start timeout only if not already pending
        if (!this.motorStopTimeout) {
            this.motorStopTimeout = setTimeout(() => {
                this.motorStopTimeout = null;
                this.activeDrive.motorRunning = false;
            }, MOTOR_TIMEOUT_MS);
        }
    }

    /**
     * Select active drive (1 or 2).
     *
     * Only one drive can be active at a time. When switching drives, we
     * transfer motor state if it's running (motor can only spin one drive).
     *
     * Why transfer motor state? The real hardware has only one motor circuit.
     * When you select a different drive while motor is running, the motor
     * continues spinning the newly selected drive.
     *
     * @param driveNumber - Drive to activate (1 or 2)
     */
    private selectDrive(driveNumber: 1 | 2): void {
        const newDrive = driveNumber === 1 ? this.drive1 : this.drive2;

        // Only act if actually changing drives
        if (newDrive !== this.activeDrive) {
            // Transfer motor state if running
            if (this.activeDrive.motorRunning) {
                this.activeDrive.motorRunning = false;
                newDrive.motorRunning = true;
            }

            this.activeDrive = newDrive;
        }
    }

    /**
     * Snapshot of disk controller and drive state for save/restore.
     */
    getState(): DiskControllerState {
        return {
            lastIOCycle: this.lastIOCycle,
            dataLatchEnabled: this.dataLatchEnabled,
            motorRunning: this.motorRunning,
            writeDataRegister: this.writeDataRegister,
            activeDriveNumber: this.activeDrive === this.drive1 ? 1 : 2,
            drive1: this.drive1.getState(),
            drive2: this.drive2.getState(),
        };
    }

    /**
     * Restore disk controller and drive state from snapshot.
     *
     * Restoration order is critical:
     * 1. Reload disk images (loadImage calls writeBuffer.reset())
     * 2. Restore WriteBuffer state (overrides the reset from step 1)
     * 3. Restore controller state
     * 4. Restore mechanical drive state (track position, motor)
     *
     * Note: Must call cancelMotorTimeout() before calling this to prevent
     * stale timeouts from corrupting the restored state.
     */
    setState(state: DiskControllerState): void {
        // Step 1: Reload disk images from saved data
        // Note: loadImage() calls writeBuffer.reset(), which we'll override in step 2
        if (state.drive1.diskData) {
            const image = new WozImage(state.drive1.diskData);
            this.drive1.loadImage(image, state.drive1.diskPath);
        } else {
            this.drive1.ejectImage();
        }

        if (state.drive2.diskData) {
            const image = new WozImage(state.drive2.diskData);
            this.drive2.loadImage(image, state.drive2.diskPath);
        } else {
            this.drive2.ejectImage();
        }

        // Step 2: Restore WriteBuffer state (preserves dirty modifications)
        // Must come AFTER loadImage() which calls reset()
        this.drive1.getWriteBuffer().setState(state.drive1.writeBuffer);
        this.drive2.getWriteBuffer().setState(state.drive2.writeBuffer);

        // Step 3: Restore controller state
        this.lastIOCycle = state.lastIOCycle;
        this.dataLatchEnabled = state.dataLatchEnabled;
        this.motorRunning = state.motorRunning;
        this.writeDataRegister = state.writeDataRegister;
        this.activeDrive = state.activeDriveNumber === 1 ? this.drive1 : this.drive2;

        // Step 4: Restore mechanical drive state (track position, motor, etc.)
        this.drive1.setState(state.drive1);
        this.drive2.setState(state.drive2);
    }
}

/**
 * Serializable snapshot of disk controller state.
 */
export interface DiskControllerState {
    lastIOCycle: number;
    dataLatchEnabled: boolean;
    motorRunning: boolean;
    writeDataRegister: number;
    activeDriveNumber: 1 | 2;
    drive1: import('./disk-drive.js').DiskDriveState;
    drive2: import('./disk-drive.js').DiskDriveState;
}
