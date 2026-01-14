/**
 * Input blocking context for dialogs.
 *
 * Provides a way for dialogs to block keyboard input from reaching the
 * Apple II emulator and/or emulator function keys. Uses counters to handle
 * nested dialogs.
 *
 * Two levels of blocking:
 * - Regular input: Blocks keys going to Apple II (used by all dialogs)
 * - Function keys: Blocks F1-F10 emulator controls (used by modal dialogs)
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface InputBlockContextValue {
    /** Whether regular input is currently blocked (keys to Apple II) */
    isBlocked: boolean;
    /** Whether function keys are currently blocked (F1-F10) */
    isFunctionKeysBlocked: boolean;
    /** Call when showing a dialog that should block regular input */
    blockInput: () => void;
    /** Call when hiding a dialog (pairs with blockInput) */
    unblockInput: () => void;
    /** Call when showing a modal that should block function keys */
    blockFunctionKeys: () => void;
    /** Call when hiding a modal (pairs with blockFunctionKeys) */
    unblockFunctionKeys: () => void;
}

const InputBlockContext = createContext<InputBlockContextValue | null>(null);

/**
 * Provider component for input blocking state.
 * Wrap your app (or the part that needs input blocking) with this.
 */
export function InputBlockProvider({ children }: { children: React.ReactNode }) {
    // Use counters to handle nested dialogs (e.g., help open, then exit confirm)
    const [blockCount, setBlockCount] = useState(0);
    const [functionKeyBlockCount, setFunctionKeyBlockCount] = useState(0);

    const blockInput = useCallback(() => {
        setBlockCount((prev) => prev + 1);
    }, []);

    const unblockInput = useCallback(() => {
        setBlockCount((prev) => Math.max(0, prev - 1));
    }, []);

    const blockFunctionKeys = useCallback(() => {
        setFunctionKeyBlockCount((prev) => prev + 1);
    }, []);

    const unblockFunctionKeys = useCallback(() => {
        setFunctionKeyBlockCount((prev) => Math.max(0, prev - 1));
    }, []);

    const value = useMemo(
        () => ({
            isBlocked: blockCount > 0,
            isFunctionKeysBlocked: functionKeyBlockCount > 0,
            blockInput,
            unblockInput,
            blockFunctionKeys,
            unblockFunctionKeys,
        }),
        [
            blockCount,
            functionKeyBlockCount,
            blockInput,
            unblockInput,
            blockFunctionKeys,
            unblockFunctionKeys,
        ],
    );

    return <InputBlockContext.Provider value={value}>{children}</InputBlockContext.Provider>;
}

/**
 * Hook to access input blocking state and controls.
 *
 * @returns InputBlockContextValue with isBlocked state and block/unblock functions
 * @throws Error if used outside of InputBlockProvider
 */
export function useInputBlock(): InputBlockContextValue {
    const context = useContext(InputBlockContext);
    if (!context) {
        throw new Error('useInputBlock must be used within an InputBlockProvider');
    }
    return context;
}

/**
 * Hook that automatically blocks regular input while the component is mounted.
 * Use this in dialog components that should block keyboard input to Apple II
 * but still allow function keys (e.g., F1 to close help).
 *
 * @example
 * function MyDialog({ visible }) {
 *     useBlockInputWhileMounted(visible);
 *     if (!visible) return null;
 *     return <Box>...</Box>;
 * }
 */
export function useBlockInputWhileMounted(active: boolean): void {
    const { blockInput, unblockInput } = useInputBlock();

    React.useEffect(() => {
        if (active) {
            blockInput();
            return () => unblockInput();
        }
    }, [active, blockInput, unblockInput]);
}

/**
 * Hook that blocks ALL input (regular + function keys) while mounted.
 * Use this for modal dialogs that should capture all keyboard input
 * (e.g., exit confirmation that only responds to Y/N/Enter/Esc).
 *
 * @example
 * function ExitConfirm({ visible }) {
 *     useBlockAllInputWhileMounted(visible);
 *     if (!visible) return null;
 *     return <Box>...</Box>;
 * }
 */
export function useBlockAllInputWhileMounted(active: boolean): void {
    const { blockInput, unblockInput, blockFunctionKeys, unblockFunctionKeys } = useInputBlock();

    React.useEffect(() => {
        if (active) {
            blockInput();
            blockFunctionKeys();
            return () => {
                unblockInput();
                unblockFunctionKeys();
            };
        }
    }, [active, blockInput, unblockInput, blockFunctionKeys, unblockFunctionKeys]);
}
