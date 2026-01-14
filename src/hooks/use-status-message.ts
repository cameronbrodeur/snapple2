/**
 * Status message hook with auto-dismiss.
 *
 * Manages a status message that automatically clears after a timeout.
 * Used for transient feedback like "Disk saved" or "Write protection toggled".
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/** Default auto-dismiss timeout in milliseconds */
const AUTO_DISMISS_MS = 3000;

export interface StatusMessageState {
    statusMessage: string | null;
}

export interface StatusMessageActions {
    setStatusMessage: (msg: string | null) => void;
}

export interface StatusMessageHook extends StatusMessageState, StatusMessageActions {}

/**
 * Hook for managing status messages with auto-dismiss.
 *
 * Messages automatically clear after 3 seconds. Setting a new message
 * resets the timer. Setting null clears immediately.
 *
 * @param autoDismissMs - Optional custom timeout (default 3000ms)
 * @returns StatusMessageHook with state and setter
 */
export function useStatusMessage(autoDismissMs: number = AUTO_DISMISS_MS): StatusMessageHook {
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const showStatusMessage = useCallback(
        (message: string | null) => {
            // Clear any existing timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            setStatusMessage(message);

            // Auto-dismiss after timeout (only if message is not null)
            if (message !== null) {
                timerRef.current = setTimeout(() => {
                    setStatusMessage(null);
                    timerRef.current = null;
                }, autoDismissMs);
            }
        },
        [autoDismissMs],
    );

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {
        statusMessage,
        setStatusMessage: showStatusMessage,
    };
}
