/**
 * Dialog visibility and pause management hook.
 *
 * Manages dialog visibility (help, exit confirm, disk dialog) and automatically
 * pauses the emulator when dialogs are open. Supports nested dialogs - only
 * resumes when the last dialog closes.
 */

import { useState, useCallback, useRef } from 'react';

export interface DialogPauseState {
    showHelp: boolean;
    showExitConfirm: boolean;
    showRebootConfirm: boolean;
    showDiskDialog: boolean;
}

export interface DialogPauseActions {
    openHelp: () => void;
    closeHelp: () => void;
    showExitConfirmDialog: () => void;
    hideExitConfirmDialog: () => void;
    showRebootConfirmDialog: () => void;
    hideRebootConfirmDialog: () => void;
    openDiskDialog: () => void;
    closeDiskDialog: () => void;
}

export interface DialogPauseHook extends DialogPauseState, DialogPauseActions {}

/**
 * Hook for managing dialog visibility with automatic pause/resume.
 *
 * When a dialog opens, the emulator pauses. When the last dialog closes,
 * the emulator resumes to its previous state (running or paused).
 *
 * Supports nested dialogs - tracks a count so that opening help while
 * exit confirm is open doesn't lose the original running state.
 *
 * @param running - Current running state of the emulator
 * @param setRunning - Callback to change running state
 * @returns DialogPauseHook with visibility state and toggle actions
 */
export function useDialogPause(
    running: boolean,
    setRunning: (running: boolean) => void,
): DialogPauseHook {
    const [showHelp, setShowHelp] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showRebootConfirm, setShowRebootConfirm] = useState(false);
    const [showDiskDialog, setShowDiskDialog] = useState(false);

    // Track running state before first dialog opened (to restore when last closes)
    const wasRunningBeforeDialog = useRef<boolean>(true);
    // Count dialogs that are requesting pause (for nested dialog handling)
    const dialogPauseCount = useRef<number>(0);

    // Save running state and pause when opening first dialog
    const handleDialogOpen = useCallback(() => {
        if (dialogPauseCount.current === 0) {
            wasRunningBeforeDialog.current = running;
        }
        dialogPauseCount.current++;
        setRunning(false);
    }, [running, setRunning]);

    // Restore running state when closing last dialog
    const handleDialogClose = useCallback(() => {
        dialogPauseCount.current = Math.max(0, dialogPauseCount.current - 1);
        if (dialogPauseCount.current === 0) {
            setRunning(wasRunningBeforeDialog.current);
        }
    }, [setRunning]);

    const openHelp = useCallback(() => {
        if (showHelp) return;
        handleDialogOpen();
        setShowHelp(true);
    }, [showHelp, handleDialogOpen]);

    const closeHelp = useCallback(() => {
        if (!showHelp) return;
        handleDialogClose();
        setShowHelp(false);
    }, [showHelp, handleDialogClose]);

    const showExitConfirmDialog = useCallback(() => {
        handleDialogOpen();
        setShowExitConfirm(true);
    }, [handleDialogOpen]);

    const hideExitConfirmDialog = useCallback(() => {
        handleDialogClose();
        setShowExitConfirm(false);
    }, [handleDialogClose]);

    const showRebootConfirmDialog = useCallback(() => {
        handleDialogOpen();
        setShowRebootConfirm(true);
    }, [handleDialogOpen]);

    const hideRebootConfirmDialog = useCallback(() => {
        handleDialogClose();
        setShowRebootConfirm(false);
    }, [handleDialogClose]);

    const openDiskDialog = useCallback(() => {
        if (showDiskDialog) return;
        handleDialogOpen();
        setShowDiskDialog(true);
    }, [showDiskDialog, handleDialogOpen]);

    const closeDiskDialog = useCallback(() => {
        if (!showDiskDialog) return;
        handleDialogClose();
        setShowDiskDialog(false);
    }, [showDiskDialog, handleDialogClose]);

    return {
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
    };
}
