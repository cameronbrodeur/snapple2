/**
 * Soft Switch Handlers
 *
 * Handlers for Apple II soft switches (memory-mapped I/O).
 */

import { KeyboardLatch } from './keyboard-device.js';
import { VideoSystem } from '../video/video-system.js';

/**
 * Interface for soft switch handlers.
 */
export interface SoftSwitchHandler {
    /**
     * Read from a soft switch address.
     *
     * @param address - Memory address being read
     * @returns Byte value
     */
    read(address: number): number;

    /**
     * Write to a soft switch address.
     *
     * @param address - Memory address being written
     * @param value - Byte value to write
     */
    write(address: number, value: number): void;
}

/**
 * Keyboard soft switch handler ($C000-$C010).
 *
 * $C000: Read keyboard data
 * $C010: Clear keyboard strobe
 */
export class KeyboardSwitch implements SoftSwitchHandler {
    constructor(private keyboard: KeyboardLatch) {}

    read(address: number): number {
        if (address === 0xc010) {
            // Reading $C010 clears the strobe
            this.keyboard.clearStrobe();
            return 0x00; // Return value doesn't matter for strobe clear
        }

        // $C000-$C00F: Read keyboard data
        return this.keyboard.read();
    }

    write(address: number, value: number): void {
        if (address === 0xc010) {
            // Writing $C010 also clears the strobe
            this.keyboard.clearStrobe();
        }
        // Keyboard is read-only, writes have no effect
    }
}

/**
 * Video mode soft switch handler ($C050-$C057).
 *
 * $C050: Text mode off (graphics)
 * $C051: Text mode on
 * $C052: Mixed mode off
 * $C053: Mixed mode on
 * $C054: Page 2 off (page 1)
 * $C055: Page 2 on
 * $C056: Hi-res mode off
 * $C057: Hi-res mode on
 */
export class VideoModeSwitch implements SoftSwitchHandler {
    constructor(private video: VideoSystem) {}

    read(address: number): number {
        // Reading these switches also triggers the mode change
        this.handleSwitch(address);
        return 0x00; // Return value doesn't matter
    }

    write(address: number, value: number): void {
        // Writing these switches triggers the mode change
        this.handleSwitch(address);
    }

    private handleSwitch(address: number): void {
        switch (address) {
            case 0xc050: // Text mode off (graphics)
                this.video.setTextMode(false);
                break;
            case 0xc051: // Text mode on
                this.video.setTextMode(true);
                break;
            case 0xc052: // Mixed mode off
                this.video.setMixedMode(false);
                break;
            case 0xc053: // Mixed mode on
                this.video.setMixedMode(true);
                break;
            case 0xc054: // Page 2 off (page 1)
                this.video.setPage(1);
                break;
            case 0xc055: // Page 2 on
                this.video.setPage(2);
                break;
            case 0xc056: // Hi-res mode off
                this.video.setHiresMode(false);
                break;
            case 0xc057: // Hi-res mode on
                this.video.setHiresMode(true);
                break;
        }
    }
}

/**
 * Speaker soft switch handler ($C030).
 *
 * Accessing $C030 toggles the speaker output.
 * For now, this is a stub that does nothing.
 */
export class SpeakerSwitch implements SoftSwitchHandler {
    read(address: number): number {
        // TODO: Implement speaker toggle
        return 0x00;
    }

    write(address: number, value: number): void {
        // TODO: Implement speaker toggle
    }
}

// Re-export Language Card components
export { LanguageCard } from './language-card.js';
export { LanguageCardSwitch } from './language-card-switch.js';
export type { LanguageCardState } from './language-card-types.js';

// Re-export Paddle components
export { PaddleDevice } from './paddle-device.js';
export { PaddleSwitch } from './paddle-switch.js';
