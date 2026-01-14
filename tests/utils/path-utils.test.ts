import { describe, it, expect } from 'vitest';
import { extractBasename } from '../../src/utils/path-utils.js';

describe('extractBasename', () => {
    describe('Unix-style paths', () => {
        it('extracts name from absolute path', () => {
            expect(extractBasename('/home/user/game.dsk')).toBe('game');
        });

        it('extracts name from relative path', () => {
            expect(extractBasename('disks/game.woz')).toBe('game');
        });

        it('handles filename only', () => {
            expect(extractBasename('game.dsk')).toBe('game');
        });

        it('handles multiple dots in filename', () => {
            expect(extractBasename('/path/to/my.game.v2.dsk')).toBe('my.game.v2');
        });
    });

    describe('Windows-style paths', () => {
        it('extracts name from absolute path', () => {
            expect(extractBasename('C:\\Users\\test\\game.dsk')).toBe('game');
        });

        it('extracts name from relative path', () => {
            expect(extractBasename('disks\\game.woz')).toBe('game');
        });

        it('handles mixed separators (prefers backslash detection)', () => {
            expect(extractBasename('C:\\Users/test\\game.dsk')).toBe('game');
        });
    });

    describe('edge cases', () => {
        it('handles no extension', () => {
            expect(extractBasename('/path/to/noextension')).toBe('noextension');
        });

        it('handles hidden files (dot prefix)', () => {
            expect(extractBasename('/path/.hidden')).toBe('.hidden');
        });

        it('handles empty extension', () => {
            expect(extractBasename('/path/file.')).toBe('file');
        });
    });
});
