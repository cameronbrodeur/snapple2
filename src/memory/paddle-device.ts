/**
 * Paddle Input Device
 *
 * Emulates Apple II analog paddles with keyboard input.
 * Supports 4 paddles (PDL0-PDL3) with positions from 0-255.
 *
 * Default key mapping:
 * - PDL0 (horizontal): A/D or Left/Right arrows
 * - PDL1 (vertical): W/S or Up/Down arrows
 *
 * Paddles use timing-based reads: $C070 triggers read, then bit 7
 * of $C064-$C067 stays high for (11 + position × 11) cycles.
 */

/**
 * Paddle state for a single paddle.
 */
export interface PaddleState {
    /** Current position (0-255, 127 = center) */
    position: number;
    /** Cycle count when paddle timer was triggered */
    triggerCycle: number;
}

/**
 * Paddle device managing 4 analog paddles.
 */
export class PaddleDevice {
    /** Paddle states (0-3) */
    private paddles: PaddleState[] = [];

    /** Button states (bit 7 = pressed, active high for buttons) */
    private buttons: boolean[] = [false, false, false];

    /** Movement speed (position change per update when key held) */
    private readonly speed = 4;

    /** Key press timestamps for terminal-style input (no key-up events) */
    private keyPressTime = {
        left: 0,
        right: 0,
        up: 0,
        down: 0,
    };

    /** How long a key is considered "held" after last press (ms) */
    private readonly keyHoldTime = 40;

    constructor() {
        // Initialize 4 paddles at center position
        // triggerCycle = -Infinity ensures timer reads as "done" until triggered
        for (let i = 0; i < 4; i++) {
            this.paddles.push({
                position: 127, // Center
                triggerCycle: -Infinity,
            });
        }
    }

    /**
     * Trigger paddle read (called when $C070 is accessed).
     * Records the current cycle count for timing calculations.
     *
     * @param currentCycle - Current CPU cycle count
     */
    trigger(currentCycle: number): void {
        for (const paddle of this.paddles) {
            paddle.triggerCycle = currentCycle;
        }
    }

    /**
     * Read paddle timer value (bit 7 indicates timing in progress).
     *
     * @param paddleNum - Paddle number (0-3)
     * @param currentCycle - Current CPU cycle count
     * @returns Bit 7 set if timer still counting, clear when done
     */
    readPaddle(paddleNum: number, currentCycle: number): number {
        if (paddleNum < 0 || paddleNum > 3) return 0;

        const paddle = this.paddles[paddleNum];
        const elapsed = currentCycle - paddle.triggerCycle;

        // Timer duration: 11 + (position × 11) cycles
        // This gives ~11 cycles for position 0, ~2816 cycles for position 255
        const timerDuration = 11 + paddle.position * 11;

        // Bit 7 high while timing, low when complete
        return elapsed < timerDuration ? 0x80 : 0x00;
    }

    /**
     * Read pushbutton state.
     *
     * @param buttonNum - Button number (0-2)
     * @returns Bit 7 set if button pressed
     */
    readButton(buttonNum: number): number {
        if (buttonNum < 0 || buttonNum > 2) return 0;
        return this.buttons[buttonNum] ? 0x80 : 0x00;
    }

    /**
     * Set a button state.
     *
     * @param buttonNum - Button number (0-2)
     * @param pressed - Whether button is pressed
     */
    setButton(buttonNum: number, pressed: boolean): void {
        if (buttonNum >= 0 && buttonNum <= 2) {
            this.buttons[buttonNum] = pressed;
        }
    }

    /**
     * Set paddle position directly.
     *
     * @param paddleNum - Paddle number (0-3)
     * @param position - Position (0-255)
     */
    setPosition(paddleNum: number, position: number): void {
        if (paddleNum >= 0 && paddleNum < 4) {
            this.paddles[paddleNum].position = Math.max(0, Math.min(255, position));
        }
    }

    /**
     * Get paddle position.
     *
     * @param paddleNum - Paddle number (0-3)
     * @returns Position (0-255)
     */
    getPosition(paddleNum: number): number {
        if (paddleNum >= 0 && paddleNum < 4) {
            return this.paddles[paddleNum].position;
        }
        return 127;
    }

    /**
     * Handle key press for paddle movement.
     * Uses timestamp-based approach since terminals don't have key-up events.
     *
     * @param key - Key identifier ('left', 'right', 'up', 'down', 'a', 'd', 'w', 's')
     */
    keyDown(key: string): void {
        const now = Date.now();
        switch (key.toLowerCase()) {
            case 'left':
            case 'a':
                this.keyPressTime.left = now;
                break;
            case 'right':
            case 'd':
                this.keyPressTime.right = now;
                break;
            case 'up':
            case 'w':
                this.keyPressTime.up = now;
                break;
            case 'down':
            case 's':
                this.keyPressTime.down = now;
                break;
        }
    }

    // Check if a key is currently "held" (pressed within keyHoldTime)
    private isKeyHeld(key: 'left' | 'right' | 'up' | 'down'): boolean {
        const now = Date.now();
        return now - this.keyPressTime[key] < this.keyHoldTime;
    }

    /**
     * Update paddle positions based on recently pressed keys.
     * Should be called once per frame for smooth movement.
     */
    update(): void {
        const leftHeld = this.isKeyHeld('left');
        const rightHeld = this.isKeyHeld('right');
        const upHeld = this.isKeyHeld('up');
        const downHeld = this.isKeyHeld('down');

        // PDL0: Left/Right (A/D)
        if (leftHeld && !rightHeld) {
            this.paddles[0].position = Math.max(0, this.paddles[0].position - this.speed);
        } else if (rightHeld && !leftHeld) {
            this.paddles[0].position = Math.min(255, this.paddles[0].position + this.speed);
        }

        // PDL1: Up/Down (W/S)
        if (upHeld && !downHeld) {
            this.paddles[1].position = Math.max(0, this.paddles[1].position - this.speed);
        } else if (downHeld && !upHeld) {
            this.paddles[1].position = Math.min(255, this.paddles[1].position + this.speed);
        }
    }

    /**
     * Get current key states (for debugging/display).
     */
    getKeyStates() {
        return {
            left: this.isKeyHeld('left'),
            right: this.isKeyHeld('right'),
            up: this.isKeyHeld('up'),
            down: this.isKeyHeld('down'),
        };
    }
}
