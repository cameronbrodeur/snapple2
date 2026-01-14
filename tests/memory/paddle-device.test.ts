import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PaddleDevice } from '../../src/memory/paddle-device.js';
import { PaddleSwitch } from '../../src/memory/paddle-switch.js';

describe('PaddleDevice', () => {
    let paddle: PaddleDevice;

    beforeEach(() => {
        vi.useFakeTimers();
        paddle = new PaddleDevice();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial state', () => {
        it('should initialize all paddles at center position (127)', () => {
            expect(paddle.getPosition(0)).toBe(127);
            expect(paddle.getPosition(1)).toBe(127);
            expect(paddle.getPosition(2)).toBe(127);
            expect(paddle.getPosition(3)).toBe(127);
        });

        it('should have no buttons pressed', () => {
            expect(paddle.readButton(0)).toBe(0x00);
            expect(paddle.readButton(1)).toBe(0x00);
            expect(paddle.readButton(2)).toBe(0x00);
        });
    });

    describe('paddle positioning', () => {
        it('should allow setting paddle position directly', () => {
            paddle.setPosition(0, 200);
            expect(paddle.getPosition(0)).toBe(200);
        });

        it('should clamp position to 0-255 range', () => {
            paddle.setPosition(0, -50);
            expect(paddle.getPosition(0)).toBe(0);

            paddle.setPosition(0, 300);
            expect(paddle.getPosition(0)).toBe(255);
        });

        it('should return center (127) for invalid paddle numbers', () => {
            expect(paddle.getPosition(-1)).toBe(127);
            expect(paddle.getPosition(4)).toBe(127);
        });
    });

    describe('button handling', () => {
        it('should set button state with bit 7', () => {
            paddle.setButton(0, true);
            expect(paddle.readButton(0)).toBe(0x80);

            paddle.setButton(0, false);
            expect(paddle.readButton(0)).toBe(0x00);
        });

        it('should handle all three buttons independently', () => {
            paddle.setButton(0, true);
            paddle.setButton(1, false);
            paddle.setButton(2, true);

            expect(paddle.readButton(0)).toBe(0x80);
            expect(paddle.readButton(1)).toBe(0x00);
            expect(paddle.readButton(2)).toBe(0x80);
        });
    });

    describe('timing-based reads', () => {
        it('should return bit 7 high immediately after trigger', () => {
            paddle.trigger(1000);
            // Immediately after trigger, timer should still be counting
            expect(paddle.readPaddle(0, 1000)).toBe(0x80);
        });

        it('should return bit 7 low after timer expires', () => {
            paddle.setPosition(0, 0); // Position 0 = 11 cycles
            paddle.trigger(1000);

            // After 11+ cycles, timer should be done
            expect(paddle.readPaddle(0, 1012)).toBe(0x00);
        });

        it('should take longer for higher paddle positions', () => {
            paddle.setPosition(0, 255); // Position 255 = 11 + (255 * 11) = 2816 cycles
            paddle.trigger(1000);

            // At 1500 cycles, should still be counting
            expect(paddle.readPaddle(0, 1500)).toBe(0x80);

            // At 4000 cycles (well past 2816), should be done
            expect(paddle.readPaddle(0, 4000)).toBe(0x00);
        });

        it('should time each paddle independently', () => {
            paddle.setPosition(0, 0); // Fast
            paddle.setPosition(1, 255); // Slow
            paddle.trigger(1000);

            // Paddle 0 should finish quickly
            expect(paddle.readPaddle(0, 1012)).toBe(0x00);
            // Paddle 1 should still be counting
            expect(paddle.readPaddle(1, 1012)).toBe(0x80);
        });
    });

    describe('keyboard input', () => {
        it('should move paddle left when A or left arrow pressed', () => {
            vi.setSystemTime(1000); // Set initial time
            paddle.setPosition(0, 127);
            paddle.keyDown('a');
            paddle.update();

            expect(paddle.getPosition(0)).toBeLessThan(127);
        });

        it('should move paddle right when D or right arrow pressed', () => {
            vi.setSystemTime(1000);
            paddle.setPosition(0, 127);
            paddle.keyDown('d');
            paddle.update();

            expect(paddle.getPosition(0)).toBeGreaterThan(127);
        });

        it('should move paddle up when W or up arrow pressed', () => {
            vi.setSystemTime(1000);
            paddle.setPosition(1, 127);
            paddle.keyDown('w');
            paddle.update();

            expect(paddle.getPosition(1)).toBeLessThan(127);
        });

        it('should move paddle down when S or down arrow pressed', () => {
            vi.setSystemTime(1000);
            paddle.setPosition(1, 127);
            paddle.keyDown('s');
            paddle.update();

            expect(paddle.getPosition(1)).toBeGreaterThan(127);
        });

        it('should not exceed position bounds when moving left', () => {
            vi.setSystemTime(1000);
            paddle.setPosition(0, 5);
            paddle.keyDown('left');
            paddle.update();
            paddle.keyDown('left');
            paddle.update();
            paddle.keyDown('left');
            paddle.update();

            expect(paddle.getPosition(0)).toBe(0);
        });

        it('should not exceed position bounds when moving right', () => {
            vi.setSystemTime(1000);
            paddle.setPosition(0, 250);
            paddle.keyDown('right');
            paddle.update();
            paddle.keyDown('right');
            paddle.update();
            paddle.keyDown('right');
            paddle.update();

            expect(paddle.getPosition(0)).toBe(255);
        });

        it('should stop moving when key not recently pressed', () => {
            vi.setSystemTime(1000);
            paddle.setPosition(0, 127);
            paddle.keyDown('a');
            paddle.update();
            const afterFirstUpdate = paddle.getPosition(0);

            // Advance time past keyHoldTime (100ms)
            vi.setSystemTime(1200);
            paddle.update();

            // Position should not change further
            expect(paddle.getPosition(0)).toBe(afterFirstUpdate);
        });
    });
});

describe('PaddleSwitch', () => {
    let paddle: PaddleDevice;
    let handler: PaddleSwitch;
    let cycles: number;

    beforeEach(() => {
        paddle = new PaddleDevice();
        cycles = 0;
        handler = new PaddleSwitch(paddle, () => cycles);
    });

    describe('button reads', () => {
        it('should read PB0 from $C061', () => {
            paddle.setButton(0, true);
            expect(handler.read(0xc061)).toBe(0x80);
        });

        it('should read PB1 from $C062', () => {
            paddle.setButton(1, true);
            expect(handler.read(0xc062)).toBe(0x80);
        });

        it('should read PB2 from $C063', () => {
            paddle.setButton(2, true);
            expect(handler.read(0xc063)).toBe(0x80);
        });
    });

    describe('paddle timer reads', () => {
        it('should read PDL0 timer from $C064', () => {
            paddle.setPosition(0, 0);
            handler.read(0xc070); // Trigger
            cycles = 5;
            expect(handler.read(0xc064)).toBe(0x80); // Still counting
            cycles = 20;
            expect(handler.read(0xc064)).toBe(0x00); // Done
        });

        it('should read PDL1 timer from $C065', () => {
            paddle.setPosition(1, 100);
            handler.read(0xc070); // Trigger
            cycles = 500;
            expect(handler.read(0xc065)).toBe(0x80); // Still counting
        });

        it('should read PDL2 timer from $C066', () => {
            expect(handler.read(0xc066)).toBe(0x00); // No trigger yet
        });

        it('should read PDL3 timer from $C067', () => {
            expect(handler.read(0xc067)).toBe(0x00); // No trigger yet
        });
    });

    describe('paddle trigger', () => {
        it('should trigger on read of $C070', () => {
            paddle.setPosition(0, 50);
            cycles = 1000;
            handler.read(0xc070);

            // Check that timer started
            cycles = 1001;
            expect(handler.read(0xc064)).toBe(0x80);
        });

        it('should trigger on write to $C070', () => {
            paddle.setPosition(0, 50);
            cycles = 2000;
            handler.write(0xc070, 0);

            cycles = 2001;
            expect(handler.read(0xc064)).toBe(0x80);
        });
    });
});
