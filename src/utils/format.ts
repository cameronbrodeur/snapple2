/**
 * Formatting Utilities
 *
 * Functions for formatting numbers in various formats for display.
 */

/**
 * Format a byte as a hexadecimal string with $ prefix.
 *
 * @param n - Byte value (0-255)
 * @returns Formatted string like "$42"
 *
 * @example
 * formatByte(0x42) // Returns "$42"
 * formatByte(255)  // Returns "$FF"
 */
export function formatByte(n: number): string {
    return '$' + (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Format a word (16-bit value) as a hexadecimal string with $ prefix.
 *
 * @param n - Word value (0-65535)
 * @returns Formatted string like "$1234"
 *
 * @example
 * formatWord(0x1234) // Returns "$1234"
 * formatWord(65535)  // Returns "$FFFF"
 */
export function formatWord(n: number): string {
    return '$' + (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format a number with comma separators for thousands.
 *
 * @param n - Number to format
 * @returns Formatted string like "1,234,567"
 *
 * @example
 * formatDecimal(1234567) // Returns "1,234,567"
 * formatDecimal(42)      // Returns "42"
 */
export function formatDecimal(n: number): string {
    return n.toLocaleString('en-US');
}
