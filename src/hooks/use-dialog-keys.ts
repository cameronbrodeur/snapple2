/**
 * Hook to handle keyboard input for dialogs.
 *
 * Manages key handling for:
 * - Help dialog: Esc to close
 * - Exit confirmation: Y/Enter to confirm, N/Esc to cancel
 *
 * Note: Disk dialog handles its own ESC via useInput in disk-dialog.tsx
 * to support navigating back from file-browser before closing.
 *
 * These handlers bypass Ink's useInput and function key blocking to ensure
 * dialogs can be closed even when input is blocked.
 */

import { useEffect, useCallback } from 'react';
import { ESCAPE_KEY, ESCAPE_TIMEOUT_MS } from '../shared/key-sequences.js';

export interface DialogKeyHandlers {
    /** Called when help dialog should close (Esc pressed) */
    onCloseHelp: () => void;
    /** Called when exit is confirmed (Y pressed) */
    onConfirmExit: () => void;
    /** Called when exit is cancelled (N or Esc pressed) */
    onCancelExit: () => void;
    /** Called when reboot is confirmed (Y pressed) */
    onConfirmReboot: () => void;
    /** Called when reboot is cancelled (N or Esc pressed) */
    onCancelReboot: () => void;
}

export interface DialogVisibilityState {
    /** Whether help dialog is visible */
    showHelp: boolean;
    /** Whether exit confirmation dialog is visible */
    showExitConfirm: boolean;
    /** Whether reboot confirmation dialog is visible */
    showRebootConfirm: boolean;
}

/**
 * Sets up keyboard listeners for dialogs.
 *
 * @param state - Current dialog visibility state
 * @param handlers - Callbacks for dialog actions
 */
export function useDialogKeys(state: DialogVisibilityState, handlers: DialogKeyHandlers): void {
    const { showHelp, showExitConfirm, showRebootConfirm } = state;
    const { onCloseHelp, onConfirmExit, onCancelExit, onConfirmReboot, onCancelReboot } = handlers;

    // Handle exit confirmation keys (Y-only for destructive action)
    const handleExitConfirmKey = useCallback(
        (key: string) => {
            const lower = key.toLowerCase();
            if (lower === 'y') {
                onConfirmExit();
            } else if (lower === 'n' || key === '\x1b') {
                onCancelExit();
            }
        },
        [onConfirmExit, onCancelExit],
    );

    // Exit confirmation key listener
    useEffect(() => {
        if (!showExitConfirm) return;

        const handleData = (data: Buffer) => {
            handleExitConfirmKey(data.toString());
        };

        process.stdin.on('data', handleData);
        return () => {
            process.stdin.off('data', handleData);
        };
    }, [showExitConfirm, handleExitConfirmKey]);

    // Handle reboot confirmation keys (Y-only for destructive action)
    const handleRebootConfirmKey = useCallback(
        (key: string) => {
            const lower = key.toLowerCase();
            if (lower === 'y') {
                onConfirmReboot();
            } else if (lower === 'n' || key === '\x1b') {
                onCancelReboot();
            }
        },
        [onConfirmReboot, onCancelReboot],
    );

    // Reboot confirmation key listener
    useEffect(() => {
        if (!showRebootConfirm) return;

        const handleData = (data: Buffer) => {
            handleRebootConfirmKey(data.toString());
        };

        process.stdin.on('data', handleData);
        return () => {
            process.stdin.off('data', handleData);
        };
    }, [showRebootConfirm, handleRebootConfirmKey]);

    // Help dialog key listener (Esc only)
    useEffect(() => {
        if (!showHelp) return;
        if (!process.stdin.isTTY) return;

        let buffer = '';

        const handleData = (data: Buffer) => {
            const str = data.toString();
            buffer += str;

            // Check for standalone Escape key
            // Need timeout to distinguish from escape sequences (which start with \x1b)
            if (str === ESCAPE_KEY) {
                const bufferSnapshot = buffer;
                setTimeout(() => {
                    // If buffer unchanged, no sequence chars arrived → standalone Esc
                    if (buffer === bufferSnapshot) {
                        onCloseHelp();
                        buffer = '';
                    }
                }, ESCAPE_TIMEOUT_MS);
                return;
            }

            // Clear buffer for non-matching keys
            buffer = '';
        };

        process.stdin.on('data', handleData);
        return () => {
            process.stdin.off('data', handleData);
        };
    }, [showHelp, onCloseHelp]);
}
