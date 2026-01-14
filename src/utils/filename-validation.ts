/**
 * Filename validation for disk creation.
 */

export const VALID_EXTENSIONS = ['dsk', 'do', 'woz'] as const;
export type DiskExtension = (typeof VALID_EXTENSIONS)[number];

export type ValidationResult =
    | { valid: true; extension: DiskExtension }
    | { valid: false; error: string };

/** Characters allowed in filename input */
export const ALLOWED_FILENAME_CHARS = /^[a-zA-Z0-9._-]$/;

/** Max filename length for UI input field */
export const FILENAME_MAX_LENGTH = 55;

/**
 * Check if a single character is valid for filenames.
 */
export function isValidFilenameChar(char: string): boolean {
    return char.length === 1 && ALLOWED_FILENAME_CHARS.test(char);
}

/**
 * Validate a filename for disk creation.
 *
 * @param filename - The filename to validate (e.g., "mywork.dsk")
 * @returns ValidationResult with success or error message
 */
export function validateDiskFilename(filename: string): ValidationResult {
    const trimmed = filename.trim();

    if (trimmed === '') {
        return { valid: false, error: 'Enter a filename' };
    }

    // Check each character against allowlist
    for (const char of trimmed) {
        if (!ALLOWED_FILENAME_CHARS.test(char)) {
            return { valid: false, error: 'Invalid filename character' };
        }
    }

    const dotIndex = trimmed.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex === trimmed.length - 1) {
        return { valid: false, error: 'Filename must use .dsk, .do, or .woz extension' };
    }

    const extension = trimmed.slice(dotIndex + 1).toLowerCase();
    if (!VALID_EXTENSIONS.includes(extension as DiskExtension)) {
        return { valid: false, error: 'Filename must use .dsk, .do, or .woz extension' };
    }

    return { valid: true, extension: extension as DiskExtension };
}
