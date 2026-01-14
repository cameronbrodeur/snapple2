/**
 * Soft Switches Device
 *
 * Memory-mapped I/O device for Apple II soft switches ($C000-$C0FF).
 */

import { MemoryDevice } from 'cpu6502/bus';
import { toByte, toWord, type Byte, type Word } from 'cpu6502/types';
import {
    SoftSwitchHandler,
    KeyboardSwitch,
    VideoModeSwitch,
    SpeakerSwitch,
    LanguageCard,
    LanguageCardSwitch,
    PaddleDevice,
    PaddleSwitch,
} from './soft-switch-handler.js';
import { KeyboardLatch } from './keyboard-device.js';
import { VideoSystem } from '../video/video-system.js';
import { SIZE } from '../emulator/constants.js';

/**
 * Soft switch device for Apple II.
 *
 * Implements the MemoryDevice interface from cpu6502 and dispatches
 * reads/writes to appropriate handlers based on address.
 */
export class SoftSwitchDevice implements MemoryDevice {
    readonly size = SIZE.SOFT_SWITCHES; // 256 bytes
    private handlers: Map<number, SoftSwitchHandler> = new Map();

    /**
     * Create a soft switch device with handlers for standard Apple II I/O.
     *
     * @param keyboard - Keyboard latch for $C000-$C010
     * @param video - Video system for $C050-$C057
     * @param languageCard - Optional Language Card for $C080-$C08F
     * @param paddle - Optional Paddle device for $C061-$C070
     * @param getCycles - Optional function to get current CPU cycle count (required for paddle)
     */
    constructor(
        keyboard: KeyboardLatch,
        video: VideoSystem,
        languageCard?: LanguageCard,
        paddle?: PaddleDevice,
        getCycles?: () => number,
    ) {
        // Register keyboard handler for $C000-$C010
        const keyboardHandler = new KeyboardSwitch(keyboard);
        for (let addr = 0xc000; addr <= 0xc010; addr++) {
            this.handlers.set(addr, keyboardHandler);
        }

        // Register speaker handler for $C030
        const speakerHandler = new SpeakerSwitch();
        this.handlers.set(0xc030, speakerHandler);

        // Register video mode handler for $C050-$C057
        const videoHandler = new VideoModeSwitch(video);
        for (let addr = 0xc050; addr <= 0xc057; addr++) {
            this.handlers.set(addr, videoHandler);
        }

        // Register paddle handler for $C061-$C067 and $C070 (if provided)
        if (paddle && getCycles) {
            const paddleHandler = new PaddleSwitch(paddle, getCycles);
            // Pushbuttons: $C061-$C063
            for (let addr = 0xc061; addr <= 0xc063; addr++) {
                this.handlers.set(addr, paddleHandler);
            }
            // Paddle timers: $C064-$C067
            for (let addr = 0xc064; addr <= 0xc067; addr++) {
                this.handlers.set(addr, paddleHandler);
            }
            // Paddle trigger: $C070
            this.handlers.set(0xc070, paddleHandler);
        }

        // Register Language Card handler for $C080-$C08F (if provided)
        if (languageCard) {
            const lcHandler = new LanguageCardSwitch(languageCard);
            for (let addr = 0xc080; addr <= 0xc08f; addr++) {
                this.handlers.set(addr, lcHandler);
            }
        }
    }

    /**
     * Read from soft switch address.
     *
     * @param offset - Offset from base address ($C000)
     * @returns Byte value, or $FF if no handler registered (open bus)
     */
    read(offset: Word): Byte {
        const address = 0xc000 + offset;
        const handler = this.handlers.get(address);

        if (handler) {
            return toByte(handler.read(address));
        }

        // Open bus - return $FF for unmapped addresses
        return toByte(0xff);
    }

    /**
     * Write to soft switch address.
     *
     * @param offset - Offset from base address ($C000)
     * @param value - Byte value to write
     */
    write(offset: Word, value: Byte): void {
        const address = 0xc000 + offset;
        const handler = this.handlers.get(address);

        if (handler) {
            handler.write(address, value);
        }

        // Writes to unmapped addresses are ignored
    }
}
