/**
 * Language Card Soft Switch Handler
 *
 * Handles soft switch accesses at $C080-$C08F for the Language Card.
 */

import { SoftSwitchHandler } from './soft-switch-handler.js';
import { LanguageCard } from './language-card.js';

/**
 * Soft switch handler for Language Card ($C080-$C08F).
 *
 * Both reads and writes to these addresses trigger the same behavior:
 * they configure the Language Card's bank selection and read/write modes.
 */
export class LanguageCardSwitch implements SoftSwitchHandler {
    /**
     * @param languageCard - Language Card device to delegate switch handling to
     */
    constructor(private languageCard: LanguageCard) {}

    /**
     * Read from Language Card soft switch.
     * The read triggers the switch logic; return value is floating bus.
     *
     * @param address - Soft switch address ($C080-$C08F)
     * @returns Floating bus value (0x00)
     */
    read(address: number): number {
        this.languageCard.handleSoftSwitch(address);
        return 0x00; // Floating bus
    }

    /**
     * Write to Language Card soft switch.
     * The write triggers the switch logic; value is ignored.
     *
     * @param address - Soft switch address ($C080-$C08F)
     * @param value - Value written (ignored)
     */
    write(address: number, value: number): void {
        this.languageCard.handleSoftSwitch(address);
    }
}
