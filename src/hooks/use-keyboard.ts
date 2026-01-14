/**
 * Keyboard input handling hook.
 *
 * Converts terminal keyboard input to Apple II format (high bit set, uppercase).
 * All Ctrl+letter combinations pass through to Apple II. Emulator controls use
 * function keys only (handled by useFunctionKeys).
 *
 * Respects InputBlockContext - when input is blocked (e.g., dialog open),
 * keyboard input is not forwarded to the Apple II.
 */

import { useInput } from 'ink';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { EmulatorActions } from './use-emulator.js';
import { useInputBlock } from './use-input-block.js';

// Convert ASCII to Apple II format (high bit set, uppercase)
function toAppleAscii(char: string): number {
    if (char.length === 0) return 0;
    const code = char.toUpperCase().charCodeAt(0);
    return code | 0x80;
}

// Convert Ctrl+letter to Apple II control code (e.g., Ctrl+A = $81, Ctrl+B = $82)
function ctrlToAppleAscii(char: string): number {
    const upper = char.toUpperCase();
    const code = upper.charCodeAt(0);
    const ctrlCode = code - 64; // A=1, B=2, ..., Z=26
    return ctrlCode | 0x80;
}

/**
 * Hook to handle keyboard input and forward to Apple II machine.
 *
 * Converts terminal input to Apple II ASCII (high bit set, uppercase).
 * All Ctrl+letter combinations pass through to Apple II (except Ctrl+C
 * which kills the terminal). Function keys are handled separately by
 * useFunctionKeys (F10 for quit).
 *
 * @param machine - Apple2Machine instance (for keyPress)
 * @param emulator - Emulator actions (for status message clearing)
 */
export function useKeyboard(machine: Apple2Machine, emulator: EmulatorActions): void {
    const { isBlocked } = useInputBlock();

    useInput((input, key) => {
        // Don't forward input to Apple II when a dialog is active
        if (isBlocked) return;

        // Function keys arrive as empty input with no key flags (Ink can't parse them).
        // Only clear status message when we have actual content to process.
        const hasKeyFlag = Object.values(key).some((v) => v === true);
        const hasContent = input.length > 0 || hasKeyFlag;
        if (hasContent) {
            emulator.setStatusMessage(null);
        }

        // Ctrl+letter combinations - ALL pass through to Apple II
        if (key.ctrl && input.length > 0) {
            // Ctrl+@ (backtick) → BREAK ($83)
            // Workaround: We can't use Ctrl+C because it kills the terminal process.
            // Ink detects Ctrl+@ as input='`' (backtick, 0x60) with ctrl=true.
            if (input === '`') {
                machine.keyPress(0x83);
                return;
            }

            const charCode = input.charCodeAt(0);

            // Already a control code (0x01-0x1F) - just set high bit
            if (charCode < 0x20) {
                machine.keyPress(charCode | 0x80);
                return;
            }

            // Letter key - convert to control code
            if ((charCode >= 0x41 && charCode <= 0x5a) || (charCode >= 0x61 && charCode <= 0x7a)) {
                machine.keyPress(ctrlToAppleAscii(input));
                return;
            }

            // Other Ctrl combinations - set high bit
            machine.keyPress(charCode | 0x80);
            return;
        }

        // Special keys
        if (key.return) {
            machine.keyPress(0x8d); // Return → $8D
            return;
        }
        if (key.escape) {
            machine.keyPress(0x9b); // Escape → $9B
            return;
        }
        if (key.leftArrow || key.backspace || key.delete) {
            machine.keyPress(0x88); // Backspace → $88
            machine.paddle.keyDown('left'); // Also update paddle
            return;
        }
        if (key.rightArrow) {
            machine.keyPress(0x95); // Right → $95
            machine.paddle.keyDown('right'); // Also update paddle
            return;
        }
        if (key.upArrow) {
            machine.keyPress(0x8b); // Up → $8B
            machine.paddle.keyDown('up'); // Also update paddle
            return;
        }
        if (key.downArrow) {
            machine.keyPress(0x8a); // Down → $8A
            machine.paddle.keyDown('down'); // Also update paddle
            return;
        }
        if (key.tab) {
            machine.keyPress(0x89); // Tab → $89
            return;
        }

        // Paddle keys (A/D/W/S) - also pass through to Apple II
        const lowerInput = input.toLowerCase();
        if (lowerInput === 'a' || lowerInput === 'd' || lowerInput === 'w' || lowerInput === 's') {
            machine.paddle.keyDown(lowerInput);
            // Continue to pass through to Apple II as normal key
        }

        // Regular printable characters - convert to Apple II format
        if (input.length > 0 && !key.meta) {
            machine.keyPress(toAppleAscii(input));
        }
    });
}
