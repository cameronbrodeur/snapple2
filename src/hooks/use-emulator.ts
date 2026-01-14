/**
 * Emulator state management hook (coordinator).
 *
 * Composes smaller, focused hooks to manage emulator state:
 * - useStatusMessage: Transient status messages with auto-dismiss
 * - useSaveState: Save/load emulator snapshots
 * - useDiskState: Disk drive selection and write protection
 * - useDialogPause: Dialog visibility with automatic pause/resume
 *
 * This hook maintains backwards compatibility by exposing the same
 * EmulatorHook interface while delegating to the sub-hooks.
 */

import { useState, useCallback } from 'react';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { useStatusMessage } from './use-status-message.js';
import { useSaveState } from './use-save-state.js';
import { useDiskState } from './use-disk-state.js';
import { useDialogPause } from './use-dialog-pause.js';
import { useDiskDialog } from './use-disk-dialog.js';

export enum StatusBarMode {
    MINIMAL = 'minimal',
    FULL = 'full',
    HIDDEN = 'hidden',
    PROFILER = 'profiler',
}

export interface EmulatorState {
    running: boolean;
    cycles: number;
    statusBarMode: StatusBarMode;
    showHelp: boolean;
    showExitConfirm: boolean;
    showRebootConfirm: boolean;
    showDiskDialog: boolean;
    hasSaveState: boolean;
    statusMessage: string | null;
    activeDrive: 1 | 2;
    drive1Writable: boolean;
    drive2Writable: boolean;
}

export interface EmulatorActions {
    step: () => void;
    run: () => void;
    pause: () => void;
    togglePause: () => void;
    cycleStatusBarMode: () => void;
    openHelp: () => void;
    closeHelp: () => void;
    showExitConfirmDialog: () => void;
    hideExitConfirmDialog: () => void;
    showRebootConfirmDialog: () => void;
    hideRebootConfirmDialog: () => void;
    rebootNow: () => void;
    updateCycles: (cycles: number) => void;
    saveStateNow: () => void;
    loadStateNow: () => void;
    saveDisksNow: () => void;
    saveDiskNow: () => void;
    toggleWriteProtectNow: () => void;
    cycleActiveDrive: () => void;
    setActiveDrive: (driveNum: 1 | 2) => void;
    setStatusMessage: (msg: string | null) => void;
    openDiskDialog: () => void;
    closeDiskDialog: () => void;
    loadDiskFromDialog: (filePath: string) => Promise<void>;
    ejectDiskFromDialog: () => void;
    createDiskFromDialog: (
        filename: string,
        directory: string,
    ) => Promise<{ success: boolean; error?: string }>;
}

export interface EmulatorHook extends EmulatorState, EmulatorActions {}

/**
 * Hook for managing emulator state and control actions.
 *
 * Provides running/paused state, help/status visibility, save states,
 * disk operations (save, write-protect toggle, drive switching), and
 * status messages. Does NOT manage execution loop timing (see useExecution).
 *
 * @param machine - Apple2Machine instance
 * @returns EmulatorHook with state and actions
 */
export function useEmulator(machine: Apple2Machine): EmulatorHook {
    // Core execution state (kept here as it's the central coordination point)
    const [running, setRunning] = useState(true);
    const [cycles, setCycles] = useState(0);
    const [statusBarMode, setStatusBarMode] = useState<StatusBarMode>(StatusBarMode.MINIMAL);

    // Compose sub-hooks
    const { statusMessage, setStatusMessage } = useStatusMessage();

    const { hasSaveState, saveStateNow, loadStateNow } = useSaveState(
        machine,
        setStatusMessage,
        setCycles,
    );

    const {
        activeDrive,
        drive1Writable,
        drive2Writable,
        saveDisksNow,
        saveDiskNow,
        toggleWriteProtectNow,
        cycleActiveDrive,
        setActiveDrive,
    } = useDiskState(machine, setStatusMessage);

    const {
        showHelp,
        showExitConfirm,
        showRebootConfirm,
        showDiskDialog,
        openHelp,
        closeHelp,
        showExitConfirmDialog,
        hideExitConfirmDialog,
        showRebootConfirmDialog,
        hideRebootConfirmDialog,
        openDiskDialog,
        closeDiskDialog,
    } = useDialogPause(running, setRunning);

    const {
        loadDisk: loadDiskFromDialog,
        ejectDisk: ejectDiskFromDialog,
        createDisk: createDiskFromDialog,
    } = useDiskDialog(machine, activeDrive, setStatusMessage);

    // Execution control actions
    const step = useCallback(() => {
        machine.step();
        setCycles(machine.cycles);
    }, [machine]);

    const run = useCallback(() => {
        setRunning(true);
    }, []);

    const pause = useCallback(() => {
        setRunning(false);
    }, []);

    const togglePause = useCallback(() => {
        setRunning((prev) => !prev);
    }, []);

    const cycleStatusBarMode = useCallback(() => {
        setStatusBarMode((current) => {
            // Cycle: MINIMAL -> FULL -> PROFILER -> HIDDEN -> MINIMAL
            switch (current) {
                case StatusBarMode.MINIMAL:
                    return StatusBarMode.FULL;
                case StatusBarMode.FULL:
                    return StatusBarMode.PROFILER;
                case StatusBarMode.PROFILER:
                    return StatusBarMode.HIDDEN;
                case StatusBarMode.HIDDEN:
                    return StatusBarMode.MINIMAL;
            }
        });
    }, []);

    const updateCycles = useCallback((newCycles: number) => {
        setCycles(newCycles);
    }, []);

    const rebootNow = useCallback(() => {
        machine.reboot();
        setCycles(0);
        setStatusMessage('⟲ Reboot');
    }, [machine, setStatusMessage]);

    return {
        // State
        running,
        cycles,
        statusBarMode,
        showHelp,
        showExitConfirm,
        showRebootConfirm,
        showDiskDialog,
        hasSaveState,
        statusMessage,
        activeDrive,
        drive1Writable,
        drive2Writable,
        // Actions
        step,
        run,
        pause,
        togglePause,
        cycleStatusBarMode,
        openHelp,
        closeHelp,
        showExitConfirmDialog,
        hideExitConfirmDialog,
        showRebootConfirmDialog,
        hideRebootConfirmDialog,
        rebootNow,
        updateCycles,
        saveStateNow,
        loadStateNow,
        saveDisksNow,
        saveDiskNow,
        toggleWriteProtectNow,
        cycleActiveDrive,
        setActiveDrive,
        setStatusMessage,
        openDiskDialog,
        closeDiskDialog,
        loadDiskFromDialog,
        ejectDiskFromDialog,
        createDiskFromDialog,
    };
}
