/**
 * Disk dialog operations hook.
 *
 * Provides disk loading, ejecting, and creation operations for the dialog.
 * Visibility/pause management is handled by useDialogPause.
 */

import { join } from 'path';
import { useCallback } from 'react';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { validateDiskFilename } from '../utils/filename-validation.js';
import { createBlankDisk } from '../disk/create-blank-disk.js';

/** Result type for createDisk action - uses human-readable error messages */
export type CreateDiskResult = { success: true } | { success: false; error: string };

export interface DiskDialogActions {
    loadDisk: (filePath: string) => Promise<void>;
    ejectDisk: () => void;
    createDisk: (filename: string, directory: string) => Promise<CreateDiskResult>;
}

/**
 * Hook for disk dialog operations.
 *
 * @param machine - Apple2Machine instance
 * @param activeDrive - Currently active drive (1 or 2)
 * @param setStatusMessage - Callback to display status feedback
 * @returns DiskDialogActions with load and eject functions
 */
export function useDiskDialog(
    machine: Apple2Machine,
    activeDrive: 1 | 2,
    setStatusMessage: (msg: string | null) => void,
): DiskDialogActions {
    const loadDisk = useCallback(
        async (filePath: string) => {
            try {
                await machine.loadDiskFromPath(activeDrive, filePath);
                const name = machine.getDiskName(activeDrive);
                setStatusMessage(`✔ Loaded ${name} into D${activeDrive}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setStatusMessage(`✘ Load failed: ${message}`);
            }
        },
        [machine, activeDrive, setStatusMessage],
    );

    const ejectDisk = useCallback(() => {
        const name = machine.getDiskName(activeDrive);
        if (!name) {
            setStatusMessage(`✔ D${activeDrive} is already empty`);
            return;
        }
        machine.ejectDisk(activeDrive);
        setStatusMessage(`✔ Ejected ${name} from D${activeDrive}`);
    }, [machine, activeDrive, setStatusMessage]);

    const createDisk = useCallback(
        async (filename: string, directory: string): Promise<CreateDiskResult> => {
            // Validate filename
            const validation = validateDiskFilename(filename);
            if (!validation.valid) {
                setStatusMessage(`✘ Create failed: ${validation.error}`);
                return { success: false, error: validation.error };
            }

            // Build full path in selected directory
            const filePath = join(directory, filename);

            // Create the blank disk
            const result = await createBlankDisk(filePath);

            if (!result.success) {
                // Map error types to user-friendly messages
                let errorMessage: string;
                switch (result.error) {
                    case 'exists':
                        errorMessage = 'File already exists';
                        break;
                    case 'invalid-extension':
                        errorMessage = 'Invalid extension';
                        break;
                    case 'write-failed':
                        errorMessage = result.message || 'Write failed';
                        break;
                    default:
                        errorMessage = 'Unknown error';
                }
                setStatusMessage(`✘ Create failed: ${errorMessage}`);
                return { success: false, error: errorMessage };
            }

            // Load the newly created disk and set it as writable
            try {
                await machine.loadDiskFromPath(activeDrive, filePath);
                const drive = machine.getDrive(activeDrive);
                if (drive) {
                    drive.setWriteProtectOverride(true);
                }
                setStatusMessage(`✔ Created ${filename} in D${activeDrive}`);
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setStatusMessage(`✘ Create failed: ${message}`);
                return { success: false, error: message };
            }
        },
        [machine, activeDrive, setStatusMessage],
    );

    return {
        loadDisk,
        ejectDisk,
        createDisk,
    };
}
