/**
 * Performance Profiler
 *
 * Tracks performance metrics for the emulator.
 * Access via F2 status bar cycling (Minimal → Full → Profiler → Hidden).
 */

export interface PerformanceMetrics {
    // Frame timing (milliseconds)
    frameTime: {
        current: number;
        min: number;
        max: number;
        avg: number;
        samples: number;
    };

    // Cycle execution timing (microseconds)
    cycleExecution: {
        current: number;
        min: number;
        max: number;
        avg: number;
        samples: number;
    };

    // Emulator state
    totalCycles: number;
    totalFrames: number;
    actualCpuSpeed: number; // MHz

    // Memory usage (megabytes)
    heapUsedMb: number;
}

/**
 * Performance Profiler class.
 *
 * Collects performance metrics for display in status bar UI.
 */
export class Profiler {
    private metrics: PerformanceMetrics;
    private startTime: number;
    private cyclesAtReset: number;

    constructor() {
        this.startTime = performance.now();
        this.cyclesAtReset = 0;
        this.metrics = this.createEmptyMetrics();
    }

    /**
     * Create empty metrics object.
     */
    private createEmptyMetrics(): PerformanceMetrics {
        return {
            frameTime: {
                current: 0,
                min: Infinity,
                max: 0,
                avg: 0,
                samples: 0,
            },
            cycleExecution: {
                current: 0,
                min: Infinity,
                max: 0,
                avg: 0,
                samples: 0,
            },
            totalCycles: 0,
            totalFrames: 0,
            actualCpuSpeed: 0,
            heapUsedMb: 0,
        };
    }

    /**
     * Reset all metrics for a new measurement period.
     *
     * Call when resuming execution after a pause to get accurate
     * CPU speed calculations (avoids counting paused time).
     *
     * @param currentCycles - Current total cycle count from machine
     */
    reset(currentCycles: number): void {
        this.startTime = performance.now();
        this.cyclesAtReset = currentCycles;
        this.metrics = this.createEmptyMetrics();
    }

    /**
     * Record frame time measurement.
     *
     * @param timeMs - Frame time in milliseconds
     */
    recordFrameTime(timeMs: number): void {
        const metric = this.metrics.frameTime;
        metric.current = timeMs;
        metric.min = Math.min(metric.min, timeMs);
        metric.max = Math.max(metric.max, timeMs);
        metric.avg = (metric.avg * metric.samples + timeMs) / (metric.samples + 1);
        metric.samples++;

        this.metrics.totalFrames++;
    }

    /**
     * Record cycle execution time measurement.
     *
     * @param timeUs - Execution time in microseconds
     */
    recordCycleExecution(timeUs: number): void {
        const metric = this.metrics.cycleExecution;
        metric.current = timeUs;
        metric.min = Math.min(metric.min, timeUs);
        metric.max = Math.max(metric.max, timeUs);
        metric.avg = (metric.avg * metric.samples + timeUs) / (metric.samples + 1);
        metric.samples++;
    }

    /**
     * Update emulator cycle count and calculate CPU speed.
     *
     * @param totalCycles - Total cycles executed since machine creation
     */
    updateCycles(totalCycles: number): void {
        this.metrics.totalCycles = totalCycles;

        // Calculate actual CPU speed in MHz (cycles since last reset)
        const cyclesSinceReset = totalCycles - this.cyclesAtReset;
        const elapsedSeconds = (performance.now() - this.startTime) / 1000;
        if (elapsedSeconds > 0) {
            this.metrics.actualCpuSpeed = cyclesSinceReset / elapsedSeconds / 1_000_000;
        }
    }

    /**
     * Update memory usage from Node.js heap statistics.
     */
    updateMemory(): void {
        const heapUsed = process.memoryUsage().heapUsed;
        this.metrics.heapUsedMb = heapUsed / (1024 * 1024);
    }

    /**
     * Get current metrics.
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }
}

/**
 * Global profiler instance.
 * Initialize with `initProfiler()` before use.
 */
let globalProfiler: Profiler | null = null;

/**
 * Initialize the global profiler.
 */
export function initProfiler(): void {
    globalProfiler = new Profiler();
}

/**
 * Get the global profiler instance.
 *
 * @throws Error if profiler not initialized
 */
export function getProfiler(): Profiler {
    if (!globalProfiler) {
        throw new Error('Profiler not initialized. Call initProfiler() first.');
    }
    return globalProfiler;
}
