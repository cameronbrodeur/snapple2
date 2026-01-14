/**
 * Profiler Logger
 *
 * Dedicated logging component for detailed performance metrics.
 * Writes JSON Lines format to /tmp/ for deep analysis.
 *
 * Usage:
 *   const logger = createProfilerLogger();
 *   await logger.start(collectMetrics);
 *   // ... run emulator ...
 *   await logger.stop();
 *
 * Output: /tmp/snapple2-profiler-{timestamp}.jsonl
 */

import { createWriteStream, WriteStream } from 'fs';
import path from 'path';

/** Default log directory */
const DEFAULT_LOG_DIR = '/tmp';

/** Default logging interval (1 second) */
const DEFAULT_INTERVAL_MS = 1000;

/**
 * Configuration options for ProfilerLogger.
 */
export interface ProfilerLoggerOptions {
    /** Directory for log files (default: /tmp) */
    logDir?: string;
    /** Logging interval in milliseconds (default: 1000) */
    intervalMs?: number;
}

/**
 * Structure of each log entry.
 * Written as a single JSON line per interval.
 */
export interface ProfilerLogEntry {
    // Timing
    timestamp: string; // ISO 8601
    elapsedMs: number; // Time since logger start

    // Frame metrics
    frame: {
        current: number; // Latest frame time (ms)
        min: number;
        max: number;
        avg: number;
        samples: number;
    };

    // Cycle execution metrics
    cycle: {
        current: number; // Latest cycle time (μs)
        min: number;
        max: number;
        avg: number;
        samples: number;
    };

    // Cumulative stats
    totalCycles: number;
    totalFrames: number;

    // Derived metrics
    cpuSpeedMhz: number; // Actual CPU speed
    cpuSpeedPercent: number; // % of target 1.023MHz
    frameRate: number; // Calculated FPS
    cyclesPerFrame: number; // Avg cycles per frame

    // System metrics - full memory breakdown
    memoryUsedMb: number; // V8 heap used (JS objects, strings)
    memoryTotalMb: number; // V8 heap allocated
    externalMb: number; // C++ objects bound to JS (Buffer internals)
    arrayBuffersMb: number; // ArrayBuffer/Uint8Array backing stores
    rssMb: number; // Resident Set Size (total process memory)

    // Emulator state
    videoMode: string; // TEXT | LORES | HIRES | MIXED
    diskMotor: boolean; // Disk motor running
    emulatorRunning: boolean; // CPU executing (vs paused)
}

/**
 * Function type for collecting metrics from the emulator.
 * Called once per logging interval.
 */
export type MetricsCollector = () => ProfilerLogEntry;

/**
 * ProfilerLogger class.
 *
 * Manages file-based logging of detailed performance metrics.
 * Uses WriteStream for efficient buffered I/O.
 */
export class ProfilerLogger {
    private filepath: string;
    private startTime: number = 0;
    private writeStream: WriteStream | null = null;
    private interval: NodeJS.Timeout | null = null;
    private intervalMs: number;
    private running: boolean = false;

    /**
     * Create a new ProfilerLogger instance.
     *
     * @param options - Configuration options
     */
    constructor(options: ProfilerLoggerOptions = {}) {
        const logDir = options.logDir ?? DEFAULT_LOG_DIR;
        this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;

        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.filepath = path.join(logDir, `snapple2-profiler-${timestamp}.jsonl`);
    }

    /**
     * Start logging to file.
     *
     * @param collectMetrics - Function to collect metrics each interval
     */
    async start(collectMetrics: MetricsCollector): Promise<void> {
        if (this.running) {
            return;
        }

        this.startTime = Date.now();
        this.writeStream = createWriteStream(this.filepath, { flags: 'a' });
        this.running = true;

        // Write header comment (helps identify log files)
        this.writeStream.write(
            `// Snapple ][ Profiler Log - Started ${new Date().toISOString()}\n`,
        );

        // Start interval timer
        this.interval = setInterval(() => {
            if (!this.writeStream || !this.running) {
                return;
            }

            // Collect metrics and add timing
            const entry = collectMetrics();
            entry.elapsedMs = Date.now() - this.startTime;
            entry.timestamp = new Date().toISOString();

            // Write as JSON line
            this.writeStream.write(JSON.stringify(entry) + '\n');
        }, this.intervalMs);
    }

    /**
     * Stop logging and close the file.
     *
     * @returns Promise that resolves when file is closed
     */
    async stop(): Promise<void> {
        if (!this.running) {
            return;
        }

        this.running = false;

        // Clear interval
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        // Close write stream
        if (this.writeStream) {
            return new Promise((resolve) => {
                this.writeStream!.end(() => {
                    this.writeStream = null;
                    resolve();
                });
            });
        }
    }

    /**
     * Check if logger is currently running.
     */
    isRunning(): boolean {
        return this.running;
    }

    /**
     * Get the log file path.
     */
    getFilepath(): string {
        return this.filepath;
    }
}

/**
 * Factory function to create a ProfilerLogger instance.
 *
 * @param options - Configuration options
 * @returns New ProfilerLogger instance
 */
export function createProfilerLogger(options?: ProfilerLoggerOptions): ProfilerLogger {
    return new ProfilerLogger(options);
}
