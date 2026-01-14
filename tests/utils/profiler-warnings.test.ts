import { describe, it, expect } from 'vitest';
import { isCpuSpeedWarning, isFrameTimeWarning } from '../../src/utils/profiler-warnings.js';

describe('profiler-warnings', () => {
    describe('isCpuSpeedWarning', () => {
        it('should return false when CPU speed is within 95-110% of target', () => {
            expect(isCpuSpeedWarning(1.023)).toBe(false);
            expect(isCpuSpeedWarning(0.98)).toBe(false);
            expect(isCpuSpeedWarning(1.12)).toBe(false);
        });

        it('should return true when CPU speed is below 95%', () => {
            expect(isCpuSpeedWarning(0.9)).toBe(true);
            expect(isCpuSpeedWarning(0.5)).toBe(true);
        });

        it('should return true when CPU speed is above 110%', () => {
            expect(isCpuSpeedWarning(1.2)).toBe(true);
            expect(isCpuSpeedWarning(1.5)).toBe(true);
        });
    });

    describe('isFrameTimeWarning', () => {
        it('should return false when frame time is 20ms or below', () => {
            expect(isFrameTimeWarning(16.67)).toBe(false);
            expect(isFrameTimeWarning(20)).toBe(false);
        });

        it('should return true when frame time exceeds 20ms', () => {
            expect(isFrameTimeWarning(20.01)).toBe(true);
            expect(isFrameTimeWarning(30)).toBe(true);
        });
    });
});
