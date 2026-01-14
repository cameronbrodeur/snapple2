/**
 * Save state management hook.
 *
 * Handles saving and loading emulator snapshots (CPU state, memory, etc.).
 * Currently stores state in memory; future versions could persist to disk.
 */

import { useState, useCallback } from 'react';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { saveState, loadState, type SaveState } from '../emulator/save-state.js';
import { getProfiler } from '../utils/profiler.js';

/**
 * Format a timestamp as a short time string (e.g., "2:34 PM").
 */
function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Get the current disk name (drive 1 preferred, then drive 2).
 */
function getCurrentDiskName(machine: Apple2Machine): string | null {
    return machine.getDiskName(1) ?? machine.getDiskName(2);
}

/**
 * Build a user-friendly save state description.
 * Shows disk name (if provided) and timestamp.
 */
function formatDescription(diskName: string | null, timestamp: number): string {
    const time = formatTime(timestamp);
    return diskName ? `${diskName} @ ${time}` : time;
}

export interface SaveStateState {
    hasSaveState: boolean;
}

export interface SaveStateActions {
    saveStateNow: () => void;
    loadStateNow: () => void;
}

export interface SaveStateHook extends SaveStateState, SaveStateActions {}

/**
 * Hook for managing emulator save states.
 *
 * Provides save/load functionality for emulator snapshots.
 * The `hasSaveState` flag indicates whether a saved state exists.
 *
 * @param machine - Apple2Machine instance
 * @param setStatusMessage - Callback to display status feedback in status bar
 * @param onCyclesUpdate - Optional callback when cycles change after load
 * @returns SaveStateHook with state and actions
 */
export function useSaveState(
    machine: Apple2Machine,
    setStatusMessage: (msg: string | null) => void,
    onCyclesUpdate?: (cycles: number) => void,
): SaveStateHook {
    const [savedState, setSavedState] = useState<SaveState | null>(null);
    // Store description at save time (disk name may change before restore)
    const [savedDescription, setSavedDescription] = useState<string | null>(null);

    const saveStateNow = useCallback(() => {
        try {
            const state = saveState(machine);
            const diskName = getCurrentDiskName(machine);
            const description = formatDescription(diskName, state.timestamp);
            setSavedState(state);
            setSavedDescription(description);
            setStatusMessage(`✔ Saved: ${description}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setStatusMessage(`✘ Save failed: ${message}`);
        }
    }, [machine, setStatusMessage]);

    const loadStateNow = useCallback(() => {
        if (!savedState || !savedDescription) {
            setStatusMessage('✘ No saved state to restore');
            return;
        }

        try {
            loadState(machine, savedState);
            // Reset profiler timing so CPU speed calculation uses restored cycle count
            getProfiler().reset(machine.cycles);
            setStatusMessage(`✔ Restored: ${savedDescription}`);
            onCyclesUpdate?.(machine.cycles);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setStatusMessage(`✘ Restore failed: ${message}`);
        }
    }, [machine, savedState, savedDescription, setStatusMessage, onCyclesUpdate]);

    return {
        hasSaveState: savedState !== null,
        saveStateNow,
        loadStateNow,
    };
}
