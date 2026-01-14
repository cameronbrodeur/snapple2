/**
 * Profiler warning threshold utilities.
 *
 * Pure functions that determine when metrics indicate performance problems.
 */

/** Target CPU speed in MHz (Apple II Plus) */
const TARGET_CPU_MHZ = 1.023;

/** Acceptable CPU speed range (95% to 110% of target) */
const CPU_SPEED_MIN_PERCENT = 0.95;
const CPU_SPEED_MAX_PERCENT = 1.1;

/** Maximum acceptable average frame time in milliseconds */
const MAX_FRAME_TIME_MS = 20;

/**
 * Checks if CPU speed is outside acceptable range.
 *
 * @param cpuSpeedMhz - Actual CPU speed in MHz
 * @returns true if warning should be shown
 */
export function isCpuSpeedWarning(cpuSpeedMhz: number): boolean {
    const minSpeed = TARGET_CPU_MHZ * CPU_SPEED_MIN_PERCENT;
    const maxSpeed = TARGET_CPU_MHZ * CPU_SPEED_MAX_PERCENT;
    return cpuSpeedMhz < minSpeed || cpuSpeedMhz > maxSpeed;
}

/**
 * Checks if average frame time exceeds threshold.
 *
 * @param frameTimeMs - Average frame time in milliseconds
 * @returns true if warning should be shown
 */
export function isFrameTimeWarning(frameTimeMs: number): boolean {
    return frameTimeMs > MAX_FRAME_TIME_MS;
}
