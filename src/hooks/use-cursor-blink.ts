/**
 * Hook to manage Apple II cursor blink timer.
 *
 * The Apple II cursor blinks at approximately 3.75 Hz (266ms interval).
 * This hook sets up an interval timer to toggle the flash state and
 * returns a counter that increments on each toggle, allowing callers
 * to use it as a React dependency for re-renders.
 */

import { useEffect, useState } from 'react';
import { Apple2Machine } from '../emulator/apple2-machine.js';

/** Apple II cursor blink interval (~3.75 Hz) */
const CURSOR_BLINK_MS = 266;

/**
 * Sets up cursor blink timer for the Apple II flash character mode.
 *
 * Returns a flash counter that increments each time the flash state toggles.
 * Use this counter to force React re-renders when flash state changes.
 *
 * @param machine - The Apple II machine instance
 * @returns Flash counter that increments on each toggle
 */
export function useCursorBlink(machine: Apple2Machine): number {
    const [flashCounter, setFlashCounter] = useState(0);

    useEffect(() => {
        const blinkInterval = setInterval(() => {
            machine.toggleFlash();
            setFlashCounter((c) => c + 1);
        }, CURSOR_BLINK_MS);

        return () => clearInterval(blinkInterval);
    }, [machine]);

    return flashCounter;
}
