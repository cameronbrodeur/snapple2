/**
 * Paddle Soft Switch Handler
 *
 * Handles soft switch accesses for paddle input:
 * - $C061-$C063: Pushbutton inputs (PB0-PB2)
 * - $C064-$C067: Paddle timers (PDL0-PDL3)
 * - $C070: Paddle trigger (strobe)
 */

import { SoftSwitchHandler } from './soft-switch-handler.js';
import { PaddleDevice } from './paddle-device.js';

/**
 * Soft switch handler for paddle input ($C061-$C067, $C070).
 */
export class PaddleSwitch implements SoftSwitchHandler {
    /**
     * @param paddle - Paddle device for state management
     * @param getCycles - Function to get current CPU cycle count
     */
    constructor(
        private paddle: PaddleDevice,
        private getCycles: () => number,
    ) {}

    /**
     * Read from paddle soft switch.
     *
     * @param address - Soft switch address ($C061-$C067 or $C070)
     * @returns Byte value with bit 7 indicating state
     */
    read(address: number): number {
        const currentCycle = this.getCycles();

        switch (address) {
            // Pushbuttons (active high - bit 7 set when pressed)
            case 0xc061:
                return this.paddle.readButton(0);
            case 0xc062:
                return this.paddle.readButton(1);
            case 0xc063:
                return this.paddle.readButton(2);

            // Paddle timers (bit 7 high while timing)
            case 0xc064:
                return this.paddle.readPaddle(0, currentCycle);
            case 0xc065:
                return this.paddle.readPaddle(1, currentCycle);
            case 0xc066:
                return this.paddle.readPaddle(2, currentCycle);
            case 0xc067:
                return this.paddle.readPaddle(3, currentCycle);

            // Paddle trigger - reading also triggers
            case 0xc070:
                this.paddle.trigger(currentCycle);
                return 0x00;

            default:
                return 0x00;
        }
    }

    /**
     * Write to paddle soft switch.
     *
     * @param address - Soft switch address
     * @param value - Value written (ignored for paddles)
     */
    write(address: number, value: number): void {
        // $C070: Paddle trigger (write also triggers)
        if (address === 0xc070) {
            this.paddle.trigger(this.getCycles());
        }
        // All other paddle addresses are read-only
    }
}
