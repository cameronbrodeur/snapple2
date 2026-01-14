/**
 * Disk state management hook.
 *
 * Manages disk drive selection, write protection, and save operations.
 * Tracks which drive is "active" for F5/F8 operations and the writable
 * state of each drive.
 */

import { useState, useCallback, useEffect } from 'react';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { saveDisk, saveAllDirtyDisks, toggleWriteProtect } from '../emulator/disk-save-handler.js';

export interface DiskStateState {
    activeDrive: 1 | 2;
    drive1Writable: boolean;
    drive2Writable: boolean;
}

export interface DiskStateActions {
    /** F5: Save all dirty disks (quick save) */
    saveDisksNow: () => Promise<void>;
    /** Disk dialog: Save only the active drive */
    saveDiskNow: () => Promise<void>;
    toggleWriteProtectNow: () => void;
    cycleActiveDrive: () => void;
    setActiveDrive: (driveNum: 1 | 2) => void;
}

export interface DiskStateHook extends DiskStateState, DiskStateActions {}

/**
 * Hook for managing disk drive state and operations.
 *
 * Tracks which drive is active for save/write-protect operations,
 * and the writable state of each drive. Initializes state from the
 * machine on mount.
 *
 * @param machine - Apple2Machine instance
 * @param setStatusMessage - Callback to display status feedback
 * @returns DiskStateHook with state and actions
 */
export function useDiskState(
    machine: Apple2Machine,
    setStatusMessage: (msg: string | null) => void,
): DiskStateHook {
    const [activeDrive, setActiveDrive] = useState<1 | 2>(1);
    const [drive1Writable, setDrive1Writable] = useState(false);
    const [drive2Writable, setDrive2Writable] = useState(false);

    // Initialize drive writable state from machine on mount
    useEffect(() => {
        const drive1 = machine.getDrive(1);
        const drive2 = machine.getDrive(2);
        if (drive1?.image) {
            setDrive1Writable(drive1.isWriteAllowed());
        }
        if (drive2?.image) {
            setDrive2Writable(drive2.isWriteAllowed());
        }
    }, [machine]);

    // F5: Save all dirty disks (quick save)
    const saveDisksNow = useCallback(async () => {
        await saveAllDirtyDisks(machine, setStatusMessage);
    }, [machine, setStatusMessage]);

    // Disk dialog: Save only the active drive
    const saveDiskNow = useCallback(async () => {
        await saveDisk(machine, activeDrive, setStatusMessage);
    }, [machine, activeDrive, setStatusMessage]);

    const toggleWriteProtectNow = useCallback(() => {
        toggleWriteProtect(machine, activeDrive, setStatusMessage);
        // Update state to trigger re-render (StatusBar reads writable from machine)
        const drive = machine.getDrive(activeDrive);
        if (drive?.image) {
            const nowWritable = drive.isWriteAllowed();
            if (activeDrive === 1) {
                setDrive1Writable(nowWritable);
            } else {
                setDrive2Writable(nowWritable);
            }
        }
    }, [machine, activeDrive, setStatusMessage]);

    const cycleActiveDrive = useCallback(() => {
        setActiveDrive((prev) => (prev === 1 ? 2 : 1));
    }, []);

    const setActiveDriveNum = useCallback((driveNum: 1 | 2) => {
        setActiveDrive(driveNum);
    }, []);

    return {
        activeDrive,
        drive1Writable,
        drive2Writable,
        saveDisksNow,
        saveDiskNow,
        toggleWriteProtectNow,
        cycleActiveDrive,
        setActiveDrive: setActiveDriveNum,
    };
}
