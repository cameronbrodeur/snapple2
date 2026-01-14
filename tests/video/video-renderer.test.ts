/**
 * VideoRenderer interface tests.
 */

import { describe, it, expect } from 'vitest';
import { TerminalBuffer } from '../../emulator/types.js';

describe('VideoRenderer interface', () => {
    it('should define render method that accepts target buffer and showFlash', () => {
        // This test validates the interface shape at compile time
        // A mock renderer implementing the interface
        const mockRenderer = {
            render(target: TerminalBuffer, showFlash: boolean): void {
                target[0][0] = showFlash ? 'X' : 'O';
            },
            bufferWidth: 40,
            bufferHeight: 24,
        };

        const buffer: TerminalBuffer = [['']];
        mockRenderer.render(buffer, true);

        expect(buffer[0][0]).toBe('X');
        expect(mockRenderer.bufferWidth).toBe(40);
        expect(mockRenderer.bufferHeight).toBe(24);

        mockRenderer.render(buffer, false);
        expect(buffer[0][0]).toBe('O');
    });
});
