/**
 * Disk II Constants
 *
 * Based on apple2ts implementation and Apple II hardware documentation.
 */

/**
 * Stepper motor magnet pattern to physical position lookup.
 *
 * The Disk II uses a 4-phase stepper motor where energizing specific magnet
 * coils moves the head to one of 8 physical positions (representing quarter-
 * track alignment). This table maps the 4-bit magnet state to physical position.
 *
 * Why this mapping? The hardware uses two pairs of electromagnets positioned
 * at 90-degree intervals. Energizing adjacent magnets creates a magnetic field
 * that pulls the head to intermediate positions, enabling quarter-track precision.
 *
 * Valid patterns energize 1 or 2 adjacent magnets. Patterns energizing opposite
 * magnets or no magnets are invalid (-1).
 *
 * Index: 4-bit magnet state (bit 0=phase 0, bit 1=phase 1, bit 2=phase 2, bit 3=phase 3)
 * Value: Physical position (0-7 for valid patterns, -1 for invalid)
 *
 * Example: 0b0011 (phases 0+1 on) → position 1 (between phases 0 and 1)
 */
export const MAGNET_TO_POSITION = [
    // 0000 0001 0010 0011 0100 0101 0110 0111 1000 1001 1010 1011 1100 1101 1110 1111
    -1, 0, 2, 1, 4, -1, 3, -1, 6, 7, -1, -1, 5, -1, -1, -1,
] as const;

/**
 * Direction lookup table for stepper motor.
 *
 * Converts physical position changes to quarter-track movements. The stepper
 * motor can move in 8 physical positions around a circular pattern (like compass
 * points: N, NE, E, SE, S, SW, W, NW). Each position corresponds to 1 quarter-
 * track, so moving from one position to an adjacent one moves the head by
 * ±1, ±2, or ±3 quarter-tracks depending on direction.
 *
 * Why quarter-tracks? Apple II disks are recorded on 35 tracks (0-34), but the
 * stepper motor provides 4× precision, allowing positioning between tracks. This
 * enables copy-protected software to use half-tracks and quarter-tracks.
 *
 * The circular nature means moving "too far" in one direction wraps around:
 * e.g., from position 0 (N) to position 5 (SW) is -3 quarter-tracks (shorter
 * to go backwards than forwards +5).
 *
 * Index: [currentPosition (0-7)][newPosition (0-7)]
 * Value: Quarter-track movement (-3 to +3, 0 = no movement)
 *
 * Positions: N=0, NE=1, E=2, SE=3, S=4, SW=5, W=6, NW=7
 */
export const POSITION_TO_DIRECTION = [
    //   N  NE   E  SE   S  SW   W  NW
    //   0   1   2   3   4   5   6   7
    [0, 1, 2, 3, 0, -3, -2, -1], // 0 N
    [-1, 0, 1, 2, 3, 0, -3, -2], // 1 NE
    [-2, -1, 0, 1, 2, 3, 0, -3], // 2 E
    [-3, -2, -1, 0, 1, 2, 3, 0], // 3 SE
    [0, -3, -2, -1, 0, 1, 2, 3], // 4 S
    [3, 0, -3, -2, -1, 0, 1, 2], // 5 SW
    [2, 3, 0, -3, -2, -1, 0, 1], // 6 W
    [1, 2, 3, 0, -3, -2, -1, 0], // 7 NW
] as const;

/**
 * Soft switch address offsets (relative to $C0E0).
 *
 * The Disk II controller occupies 16 bytes at $C0E0-$C0EF. Each address
 * controls a different aspect of the drive hardware via memory-mapped I/O.
 *
 * Access pattern:
 * - Read from address: Returns data (MOTOR_OFF, LATCH_OFF) or drive status
 * - Write to address: Triggers hardware action (set write mode, etc.)
 *
 * Stepper motor (PHASE0-PHASE3): Energizing phases in sequence moves the head.
 * Motor control (MOTOR_ON/OFF): Spins the disk (1-second timeout after OFF).
 * Drive select (DRIVE1/DRIVE2): Chooses which physical drive is active.
 * Data latch (LATCH_ON/OFF): Reads disk bits when motor is running.
 * Write mode (WRITE_ON/OFF): Switches between read and write operations.
 *
 * Hardware quirk: MOTOR_OFF ($C0E8) also returns the data latch value,
 * required by some copy-protected software like Mr. Do!
 */
export const SWITCH = {
    PHASE0_OFF: 0x0, // Deactivate stepper phase 0
    PHASE0_ON: 0x1, // Activate stepper phase 0
    PHASE1_OFF: 0x2, // Deactivate stepper phase 1
    PHASE1_ON: 0x3, // Activate stepper phase 1
    PHASE2_OFF: 0x4, // Deactivate stepper phase 2
    PHASE2_ON: 0x5, // Activate stepper phase 2
    PHASE3_OFF: 0x6, // Deactivate stepper phase 3
    PHASE3_ON: 0x7, // Activate stepper phase 3
    MOTOR_OFF: 0x8, // Stop motor (with 1-second timeout)
    MOTOR_ON: 0x9, // Start motor
    DRIVE1: 0xa, // Select drive 1
    DRIVE2: 0xb, // Select drive 2
    LATCH_OFF: 0xc, // Read mode (returns data latch)
    LATCH_ON: 0xd, // Write mode (write data latch)
    WRITE_OFF: 0xe, // Disable write mode (Q7 low)
    WRITE_ON: 0xf, // Enable write mode (Q7 high)
} as const;

/**
 * Default optimal timing (bits per 125ns).
 *
 * The WOZ format stores disk data as a bit stream that must be read at the
 * correct speed to properly decode sectors. The optimal timing value tells
 * the emulator how many CPU cycles to advance per bit read.
 *
 * Why 32? At the Apple II's 1.023 MHz clock rate, 32 cycles = ~4µs per bit,
 * which matches the real Disk II hardware's bit rate of ~250 kbit/s.
 *
 * WOZ1 uses a fixed value of 32. WOZ2 stores this in byte 59 of the INFO chunk,
 * allowing per-disk timing calibration for improved accuracy.
 */
export const DEFAULT_OPTIMAL_TIMING = 32;

/**
 * Motor timeout in milliseconds.
 *
 * The Disk II motor doesn't stop immediately when MOTOR_OFF ($C0E8) is accessed.
 * Instead, it spins down after a 1-second delay. This matches the real hardware
 * behavior and allows software to briefly turn off the motor between operations
 * without waiting for spin-up again.
 *
 * Why 1 second? This is the delay used by the real Disk II controller ROM.
 * If MOTOR_ON is accessed within this window, the timeout is canceled and the
 * motor continues running.
 */
export const MOTOR_TIMEOUT_MS = 1000;

/**
 * Default track size in bits (for DSK→WOZ conversion).
 *
 * When converting DSK/DO/PO sector images to WOZ bit-level format, we need to
 * know how many bits to allocate per track. This value produces a track that
 * matches the reference dsk2woz implementation.
 *
 * Why 50304 bits?
 * - 16 sectors per track
 * - ~3134 bits per sector (address field + data field + gaps)
 * - 16 sync bytes in gap 1
 * = 50304 bits total
 *
 * Real disks vary (48000-52000 bits per track) due to variable rotation speed
 * (CAV - Constant Angular Velocity), but 50304 is a good middle ground.
 */
export const DEFAULT_TRACK_BITS = 50304;

/**
 * Maximum quarter-tracks (40 tracks × 4 = 160).
 *
 * Apple II floppy disks have 35 physical tracks (numbered 0-34), but the
 * stepper motor provides 4× precision, allowing the head to position at
 * quarter-track intervals. This gives 35 × 4 = 140 positions for standard
 * disks, but we allocate space for 40 tracks × 4 = 160 positions to handle
 * extended formats.
 *
 * Why 160? Some copy-protected software uses tracks 35-39 for additional
 * storage or protection schemes. The WOZ format TMAP (track map) chunk
 * always allocates 160 bytes, one per quarter-track.
 */
export const MAX_QUARTER_TRACKS = 160;
