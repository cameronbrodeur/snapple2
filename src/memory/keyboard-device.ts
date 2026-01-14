/**
 * Keyboard Latch Device
 *
 * Stores the last key pressed with the high bit set.
 * Reading the keyboard data does not clear it - the strobe must be cleared separately.
 */

/**
 * Keyboard latch for Apple II.
 *
 * The Apple II keyboard works by storing the last key pressed in a latch
 * with bit 7 (high bit) set to indicate a key is available.
 */
export class KeyboardLatch {
    /** Current keyboard data (ASCII with high bit set) */
    private data: number = 0x00;

    /**
     * Set a key in the keyboard latch.
     *
     * @param ascii - ASCII code of the key pressed
     */
    setKey(ascii: number): void {
        // Set high bit to indicate key is available
        this.data = ascii | 0x80;
    }

    /**
     * Clear the keyboard strobe (bit 7).
     *
     * This is called when $C010 is accessed.
     * The key data remains but the high bit is cleared.
     */
    clearStrobe(): void {
        this.data = this.data & 0x7f;
    }

    /**
     * Read the current keyboard data.
     *
     * @returns Current keyboard data (ASCII with high bit set if key available)
     */
    read(): number {
        return this.data;
    }

    /**
     * Check if a key is available (high bit set).
     *
     * @returns true if a key is waiting to be read
     */
    hasKey(): boolean {
        return (this.data & 0x80) !== 0;
    }

    /**
     * Clear the keyboard latch entirely.
     *
     * Used during reset to ensure no stale key data.
     */
    clear(): void {
        this.data = 0x00;
    }
}
