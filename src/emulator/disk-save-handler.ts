/**
 * Disk save operations for F5 keyboard shortcut and dialog [S] action.
 *
 * Handles saving modified disk tracks to files and toggling write protection.
 */

import path from 'node:path';
import { Apple2Machine } from './apple2-machine.js';
import { DiskWriter, WozImage } from '../disk/index.js';

type DiskSaveResult =
    | { success: true; trackCount: number; filepath: string }
    | { success: false; error: string; skipped?: boolean };

// Validate and save a single drive, returning result for caller to handle messaging
async function saveDriveToFile(
    machine: Apple2Machine,
    driveNumber: 1 | 2,
): Promise<DiskSaveResult> {
    const drive = machine.getDrive(driveNumber);

    if (!drive) {
        return { success: false, error: 'No disk controller' };
    }

    if (!drive.image) {
        return { success: false, error: 'No disk loaded', skipped: true };
    }

    const writeBuffer = drive.getWriteBuffer();
    if (!writeBuffer.isDirty()) {
        return { success: false, error: 'No changes to save', skipped: true };
    }

    if (!drive.isWriteAllowed()) {
        return { success: false, error: 'Write-protected' };
    }

    const filepath = drive.getDiskPath();
    if (!filepath) {
        return { success: false, error: 'No filepath' };
    }

    if (!(drive.image instanceof WozImage)) {
        return { success: false, error: 'Not WOZ format' };
    }

    try {
        const writer = new DiskWriter();
        const trackCount = writeBuffer.getDirtyTrackCount();
        await writer.save(drive.image, writeBuffer, filepath);
        writeBuffer.clearDirty();
        return { success: true, trackCount, filepath };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}

/**
 * Save a single disk (disk dialog [S] key handler).
 *
 * Saves the specified drive and shows a detailed status message.
 *
 * @param machine - Apple2Machine instance
 * @param driveNumber - Drive 1 or 2
 * @param setMessage - Callback to display status feedback
 */
export async function saveDisk(
    machine: Apple2Machine,
    driveNumber: 1 | 2,
    setMessage: (msg: string) => void,
): Promise<void> {
    const result = await saveDriveToFile(machine, driveNumber);

    if (result.success) {
        const filename = path.basename(result.filepath);
        setMessage(`✔ Saved ${filename} (${result.trackCount} tracks)`);
    } else {
        setMessage(`✘ Save failed: ${result.error}`);
    }
}

/**
 * Save all dirty disks (F5 "quick save" handler).
 *
 * Checks both drives and saves any with unsaved changes.
 * Shows a consolidated status message.
 *
 * @param machine - Apple2Machine instance
 * @param setMessage - Callback to display status feedback
 */
export async function saveAllDirtyDisks(
    machine: Apple2Machine,
    setMessage: (msg: string) => void,
): Promise<void> {
    const results: string[] = [];
    let savedCount = 0;

    for (const driveNumber of [1, 2] as const) {
        const result = await saveDriveToFile(machine, driveNumber);

        if (result.success) {
            results.push(`D${driveNumber}: ${result.trackCount} tracks`);
            savedCount++;
        } else if (!result.skipped) {
            // Only report errors, not "no disk" or "no changes"
            results.push(`D${driveNumber}: ${result.error}`);
        }
    }

    if (results.length === 0) {
        setMessage('✘ No changes to save');
    } else if (savedCount > 0) {
        setMessage(`✔ Saved ${results.join(', ')}`);
    } else {
        setMessage(`✘ ${results.join(', ')}`);
    }
}

/**
 * Toggle write protection for disk (F8 handler).
 *
 * Cycles between protected and writable states. When currently writable,
 * forces protection. When protected, overrides to allow writes.
 *
 * @param machine - Apple2Machine instance
 * @param driveNumber - Drive 1 or 2
 * @param setMessage - Callback to display status feedback
 */
export function toggleWriteProtect(
    machine: Apple2Machine,
    driveNumber: 1 | 2,
    setMessage: (msg: string) => void,
): void {
    try {
        const drive = machine.getDrive(driveNumber);
        if (!drive?.image) {
            return;
        }

        // Toggle between protected and writable
        const currentlyWritable = drive.isWriteAllowed();

        if (currentlyWritable) {
            // Currently writable → force protection
            drive.setForceWriteProtect(true);
            drive.setWriteProtectOverride(false);
        } else {
            // Currently protected → allow writes
            drive.setForceWriteProtect(false);
            drive.setWriteProtectOverride(true);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setMessage(`✘ Error: ${message}`);
    }
}
