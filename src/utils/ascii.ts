/**
 * ASCII Conversion Utilities
 *
 * Functions for converting between standard ASCII and Apple II ASCII.
 * Apple II ASCII has the high bit (bit 7) set for all characters.
 */

/**
 * Convert a character to Apple II ASCII (set high bit).
 *
 * Apple II uses ASCII with the high bit (bit 7) set to 1.
 * For example, 'A' (0x41) becomes 0xC1.
 *
 * @param char - Single character string
 * @returns Apple II ASCII code (0-255)
 *
 * @example
 * toAppleAscii('A')  // Returns 0xC1 (193)
 * toAppleAscii(' ')  // Returns 0xA0 (160)
 * toAppleAscii('\r') // Returns 0x8D (141)
 */
export function toAppleAscii(char: string): number {
    if (char.length === 0) {
        return 0x80; // Default to high bit set
    }

    // Get the first character's code point
    const code = char.charCodeAt(0);

    // Set the high bit (bit 7)
    return code | 0x80;
}

/**
 * Convert Apple II ASCII (high bit set) to standard ASCII character.
 *
 * Apple II uses ASCII with the high bit (bit 7) set to 1.
 * This function clears the high bit to get standard ASCII.
 *
 * @param code - Apple II ASCII code (0-255)
 * @returns Standard ASCII character
 *
 * @example
 * fromAppleAscii(0xC1) // Returns 'A'
 * fromAppleAscii(0xA0) // Returns ' '
 * fromAppleAscii(0x8D) // Returns '\r'
 */
export function fromAppleAscii(code: number): string {
    // Clear the high bit (bit 7) to get standard ASCII
    const ascii = code & 0x7f;

    // Convert to character
    // Handle special cases for control characters
    if (ascii < 0x20) {
        // Control characters - return as-is or special handling
        if (ascii === 0x0d) {
            return '\r'; // Carriage return
        }
        if (ascii === 0x0a) {
            return '\n'; // Line feed
        }
        if (ascii === 0x1b) {
            return '\x1b'; // Escape
        }
        // For other control chars, return a placeholder or the character itself
        return String.fromCharCode(ascii);
    }

    return String.fromCharCode(ascii);
}

/**
 * Convert a string to Apple II ASCII bytes.
 *
 * @param str - String to convert
 * @returns Uint8Array of Apple II ASCII codes
 *
 * @example
 * stringToAppleAscii("HELLO") // Returns Uint8Array [0xC8, 0xC5, 0xCC, 0xCC, 0xCF]
 */
export function stringToAppleAscii(str: string): Uint8Array {
    const result = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        result[i] = toAppleAscii(str[i]);
    }
    return result;
}

/**
 * Convert Apple II ASCII bytes to a string.
 *
 * @param bytes - Array of Apple II ASCII codes
 * @returns Converted string
 *
 * @example
 * appleAsciiToString([0xC8, 0xC5, 0xCC, 0xCC, 0xCF]) // Returns "HELLO"
 */
export function appleAsciiToString(bytes: Uint8Array | number[]): string {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
        result += fromAppleAscii(bytes[i]);
    }
    return result;
}
