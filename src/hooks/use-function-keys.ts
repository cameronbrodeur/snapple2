/**
 * Function key handler hook.
 *
 * Listens directly to process.stdin for function key escape sequences.
 * This is needed because Ink's useInput doesn't properly forward function keys.
 *
 * Respects InputBlockContext - when function keys are blocked (e.g., modal dialog),
 * function key input is ignored.
 *
 * Supported keys: F1, F2, F3, F4, F5, F6, F7, F9, F10
 */

import { useEffect } from 'react';
import { useInputBlock } from './use-input-block.js';
import { getFunctionKeySequences } from '../shared/key-sequences.js';

export interface FunctionKeyHandlers {
    onF1?: () => void;
    onF2?: () => void;
    onF3?: () => void;
    onF4?: () => void;
    onF5?: () => void;
    onF6?: () => void;
    onF7?: () => void;
    onF9?: () => void;
    onF10?: () => void;
}

/**
 * Function key escape sequence mappings.
 *
 * Uses centralized key sequences from key-sequences.ts.
 */
const FUNCTION_KEY_SEQUENCES: Array<{
    sequences: string[];
    handler: keyof FunctionKeyHandlers;
}> = [
    { sequences: getFunctionKeySequences('F1'), handler: 'onF1' },
    { sequences: getFunctionKeySequences('F2'), handler: 'onF2' },
    { sequences: getFunctionKeySequences('F3'), handler: 'onF3' },
    { sequences: getFunctionKeySequences('F4'), handler: 'onF4' },
    { sequences: getFunctionKeySequences('F5'), handler: 'onF5' },
    { sequences: getFunctionKeySequences('F6'), handler: 'onF6' },
    { sequences: getFunctionKeySequences('F7'), handler: 'onF7' },
    { sequences: getFunctionKeySequences('F9'), handler: 'onF9' },
    { sequences: getFunctionKeySequences('F10'), handler: 'onF10' },
];

/** Maximum buffer length before clearing (prevents memory leak) */
const MAX_BUFFER_LENGTH = 20;

/**
 * Hook to detect function key escape sequences by listening directly to stdin.
 *
 * Bypasses Ink's useInput which doesn't properly forward function keys.
 * Listens for escape sequences and invokes corresponding handlers.
 * Respects isFunctionKeysBlocked from InputBlockContext.
 *
 * @param handlers - Function key event handlers (F1-F10)
 */
export function useFunctionKeys(handlers: FunctionKeyHandlers): void {
    const { isFunctionKeysBlocked } = useInputBlock();

    useEffect(() => {
        let buffer = '';

        const handleData = (chunk: Buffer) => {
            // Block all function keys when a modal dialog is active
            if (isFunctionKeysBlocked) {
                buffer = '';
                return;
            }

            buffer += chunk.toString();

            // Check each function key mapping
            for (const { sequences, handler } of FUNCTION_KEY_SEQUENCES) {
                for (const seq of sequences) {
                    if (buffer.includes(seq)) {
                        handlers[handler]?.();
                        buffer = '';
                        return;
                    }
                }
            }

            // Prevent memory leak from accumulating escape sequences
            if (buffer.length > MAX_BUFFER_LENGTH) {
                buffer = '';
            }
        };

        if (process.stdin.isTTY) {
            process.stdin.on('data', handleData);
            return () => {
                process.stdin.off('data', handleData);
            };
        }
    }, [handlers, isFunctionKeysBlocked]);
}
