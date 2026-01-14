/**
 * Save State Management
 *
 * Functions for saving and loading emulator state.
 * Allows capturing and restoring the complete state of the Apple II.
 */

import type { Apple2Machine } from './apple2-machine.js';
import type { DiskControllerState, DiskDriveState } from '../disk/index.js';
import type { WriteBufferState } from '../disk/write-buffer.js';
import type { CPU } from 'cpu6502/cpu';

/**
 * Serialized format for WriteBuffer state (arrays instead of Uint8Arrays).
 */
interface SerializedWriteBuffer {
    dirtyTracks: number[];
    modifiedTracks: Array<{
        quarterTrack: number;
        trackData: number[];
    }>;
}

/**
 * Serialized format for drive state (arrays instead of Uint8Arrays).
 */
interface SerializedDriveState extends Omit<DiskDriveState, 'diskData' | 'writeBuffer'> {
    diskData: number[] | null;
    writeBuffer: SerializedWriteBuffer;
}

/** Convert WriteBuffer state Uint8Arrays to number arrays for JSON. */
function serializeWriteBuffer(wb: WriteBufferState): SerializedWriteBuffer {
    return {
        dirtyTracks: wb.dirtyTracks,
        modifiedTracks: wb.modifiedTracks.map((mt) => ({
            quarterTrack: mt.quarterTrack,
            trackData: Array.from(mt.trackData),
        })),
    };
}

/** Convert drive state Uint8Arrays to number arrays for JSON. */
function serializeDriveState(drive: DiskDriveState): SerializedDriveState {
    return {
        ...drive,
        diskData: drive.diskData ? Array.from(drive.diskData) : null,
        writeBuffer: serializeWriteBuffer(drive.writeBuffer),
    };
}

/** Convert WriteBuffer number arrays back to Uint8Arrays. */
function deserializeWriteBuffer(wb: SerializedWriteBuffer): WriteBufferState {
    return {
        dirtyTracks: wb.dirtyTracks,
        modifiedTracks: wb.modifiedTracks.map((mt) => ({
            quarterTrack: mt.quarterTrack,
            trackData: new Uint8Array(mt.trackData),
        })),
    };
}

/** Convert drive state number arrays back to Uint8Arrays. */
function deserializeDriveState(drive: SerializedDriveState): DiskDriveState {
    return {
        ...drive,
        diskData: drive.diskData ? new Uint8Array(drive.diskData) : null,
        writeBuffer: deserializeWriteBuffer(drive.writeBuffer),
    } as DiskDriveState;
}

/**
 * Saved state structure.
 *
 * Contains complete snapshot of CPU, memory, video, and disk controller state.
 */
export interface SaveState {
    version: number;
    timestamp: number;

    // CPU state (from cpu6502 Machine)
    cpu: {
        A: number;
        X: number;
        Y: number;
        SP: number;
        PC: number;
        P: number; // Status flags
    };

    // Memory state (48KB RAM)
    ram: Uint8Array;

    // Video state
    video: {
        textMode: boolean;
        page: 1 | 2;
        mixedMode: boolean;
        hiresMode: boolean;
    };

    // Total cycles executed
    cycles: number;

    // Disk controller state (null if no disk controller)
    disk: DiskControllerState | null;
}

/**
 * Current save state format version.
 * Version history:
 * - v1: Initial version
 */
const SAVE_STATE_VERSION = 1;

/**
 * Save the current state of the Apple II machine.
 *
 * Captures CPU registers, all RAM, video mode, and cycle count.
 *
 * @param machine - Apple2Machine instance to save
 * @returns SaveState object containing complete machine state
 *
 * @example
 * const state = saveState(machine);
 * // Later...
 * loadState(machine, state);
 */
export function saveState(machine: Apple2Machine): SaveState {
    const cpu: CPU = machine.cpu;

    const ramDevice = machine.memory;
    if (!ramDevice || !ramDevice.buffer) {
        throw new Error('Cannot access RAM from machine');
    }
    const ram = new Uint8Array(ramDevice.buffer); // Clone (don't save reference)

    const video = (machine as any).videoSystem;
    const videoState = {
        textMode: video.textMode ?? true,
        page: video.page ?? 1,
        mixedMode: video.mixedMode ?? false,
        hiresMode: video.hiresMode ?? false,
    };

    const diskState = machine.getDiskControllerState();

    return {
        version: SAVE_STATE_VERSION,
        timestamp: Date.now(),
        cpu: {
            A: cpu.A ?? 0,
            X: cpu.X ?? 0,
            Y: cpu.Y ?? 0,
            SP: cpu.S ?? 0xff,
            PC: cpu.PC ?? 0,
            P: cpu.P ?? 0,
        },
        ram,
        video: videoState,
        cycles: machine.cycles,
        disk: diskState,
    };
}

/**
 * Load a previously saved state into the Apple II machine.
 *
 * Restores CPU registers, RAM, video mode, and cycle count.
 *
 * @param machine - Apple2Machine instance to restore into
 * @param state - SaveState object to load
 * @throws Error if save state version is incompatible
 *
 * @example
 * const state = saveState(machine);
 * // ... run emulator ...
 * loadState(machine, state); // Restore to saved state
 */
export function loadState(machine: Apple2Machine, state: SaveState): void {
    if (state.version !== SAVE_STATE_VERSION) {
        throw new Error(
            `Incompatible save state version: ${state.version} (expected ${SAVE_STATE_VERSION})`,
        );
    }

    // Cancel pending timeouts (e.g., motor) that would corrupt restored state
    machine.prepareForStateRestore();

    const cpu: CPU = machine.cpu;
    cpu.A = state.cpu.A;
    cpu.X = state.cpu.X;
    cpu.Y = state.cpu.Y;
    cpu.S = state.cpu.SP;
    cpu.PC = state.cpu.PC;
    cpu.P = state.cpu.P;

    const ramDevice = machine.memory;
    if (!ramDevice || !ramDevice.buffer) {
        throw new Error('Cannot access RAM from machine');
    }
    ramDevice.buffer.set(state.ram);

    const video = (machine as any).videoSystem;
    if (state.video.textMode !== undefined) {
        video.setTextMode(state.video.textMode);
    }
    if (state.video.page !== undefined) {
        video.setPage(state.video.page);
    }
    if (state.video.mixedMode !== undefined) {
        video.setMixedMode(state.video.mixedMode);
    }
    if (state.video.hiresMode !== undefined) {
        video.setHiresMode(state.video.hiresMode);
    }

    (machine as any).totalCycles = state.cycles;

    if (state.disk) {
        machine.setDiskControllerState(state.disk);
    }
}

/**
 * Serialize a save state to JSON string.
 *
 * Converts Uint8Arrays to regular arrays for JSON compatibility.
 *
 * @param state - SaveState to serialize
 * @returns JSON string
 */
export function serializeSaveState(state: SaveState): string {
    const serializable = {
        ...state,
        ram: Array.from(state.ram),
        disk: state.disk
            ? {
                  ...state.disk,
                  drive1: serializeDriveState(state.disk.drive1),
                  drive2: serializeDriveState(state.disk.drive2),
              }
            : null,
    };
    return JSON.stringify(serializable);
}

/**
 * Deserialize a save state from JSON string.
 *
 * Converts arrays back to Uint8Arrays.
 *
 * @param json - JSON string to deserialize
 * @returns SaveState object
 */
export function deserializeSaveState(json: string): SaveState {
    const data = JSON.parse(json);
    return {
        ...data,
        ram: new Uint8Array(data.ram),
        disk: data.disk
            ? {
                  ...data.disk,
                  drive1: deserializeDriveState(data.disk.drive1),
                  drive2: deserializeDriveState(data.disk.drive2),
              }
            : null,
    };
}

/**
 * Get a human-readable description of a save state.
 *
 * @param state - SaveState to describe
 * @returns Description string
 */
export function describeSaveState(state: SaveState): string {
    const date = new Date(state.timestamp);
    const dateStr = date.toLocaleString();

    const videoMode = state.video.textMode
        ? `Text Page ${state.video.page}`
        : state.video.hiresMode
          ? `Hi-Res Page ${state.video.page}`
          : 'Graphics';

    return (
        `Save State (${dateStr})\n` +
        `  PC: $${state.cpu.PC.toString(16).toUpperCase().padStart(4, '0')}\n` +
        `  Cycles: ${state.cycles.toLocaleString()}\n` +
        `  Video: ${videoMode}`
    );
}
