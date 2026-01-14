import { describe, it, expect } from 'vitest';
import { GraphicsMode } from '../../src/video/terminal-caps.js';

/**
 * Terminal Capabilities Tests
 *
 * Currently only tests Unicode mode. Sixel support was explored but paused
 * due to performance issues. See 'sixel-mode' branch for that implementation.
 */
describe('Terminal Capabilities', () => {
    describe('GraphicsMode', () => {
        it('should have UNICODE mode', () => {
            expect(GraphicsMode.UNICODE).toBe('unicode');
        });
    });
});
