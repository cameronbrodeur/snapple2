import { describe, it, expect } from 'vitest';
import {
    validateDiskFilename,
    VALID_EXTENSIONS,
    ValidationResult,
} from '../../src/utils/filename-validation.js';

describe('validateDiskFilename', () => {
    describe('valid filenames', () => {
        it('accepts .dsk extension', () => {
            const result = validateDiskFilename('mywork.dsk');
            expect(result.valid).toBe(true);
        });

        it('accepts .do extension', () => {
            const result = validateDiskFilename('mywork.do');
            expect(result.valid).toBe(true);
        });

        it('accepts .woz extension', () => {
            const result = validateDiskFilename('mywork.woz');
            expect(result.valid).toBe(true);
        });

        it('accepts uppercase extensions', () => {
            const result = validateDiskFilename('mywork.DSK');
            expect(result.valid).toBe(true);
        });

        it('accepts filenames with hyphens', () => {
            const result = validateDiskFilename('my-work.dsk');
            expect(result.valid).toBe(true);
        });

        it('accepts filenames with underscores', () => {
            const result = validateDiskFilename('my_work.dsk');
            expect(result.valid).toBe(true);
        });

        it('accepts filenames with numbers', () => {
            const result = validateDiskFilename('disk001.dsk');
            expect(result.valid).toBe(true);
        });
    });

    describe('invalid filenames', () => {
        it('rejects empty filename', () => {
            const result = validateDiskFilename('');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Enter a filename');
            }
        });

        it('rejects whitespace-only filename', () => {
            const result = validateDiskFilename('   ');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Enter a filename');
            }
        });

        it('rejects invalid extension', () => {
            const result = validateDiskFilename('mywork.txt');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Filename must use .dsk, .do, or .woz extension');
            }
        });

        it('rejects missing extension', () => {
            const result = validateDiskFilename('mywork');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Filename must use .dsk, .do, or .woz extension');
            }
        });

        it('rejects filename with forward slash', () => {
            const result = validateDiskFilename('sub/work.dsk');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Invalid filename character');
            }
        });

        it('rejects filename with backslash', () => {
            const result = validateDiskFilename('sub\\work.dsk');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Invalid filename character');
            }
        });

        it('rejects filename with colon', () => {
            const result = validateDiskFilename('disk:1.dsk');
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.error).toBe('Invalid filename character');
            }
        });
    });
});

describe('VALID_EXTENSIONS', () => {
    it('includes dsk, do, and woz', () => {
        expect(VALID_EXTENSIONS).toContain('dsk');
        expect(VALID_EXTENSIONS).toContain('do');
        expect(VALID_EXTENSIONS).toContain('woz');
    });
});
