/**
 * useProfilerLogger Hook
 *
 * React hook for managing profiler logging lifecycle.
 * Collects detailed metrics and writes to /tmp/ at 1-second intervals.
 *
 * Usage: When --log-profile CLI flag is set, logging starts automatically
 * on mount and continues until the emulator exits.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ProfilerLogger,
    ProfilerLogEntry,
    createProfilerLogger,
} from '../utils/profiler-logger.js';
import { PerformanceMetrics } from '../utils/profiler.js';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { deriveVideoMode } from '../utils/video-mode.js';
import { VideoMode } from '../emulator/types.js';

/** Target CPU speed for percentage calculation */
const TARGET_CPU_MHZ = 1.023;

/**
 * Return type for useProfilerLogger hook.
 */
export interface ProfilerLoggerHook {
    /** Whether logging is currently active */
    isLogging: boolean;
    /** Path to current log file (null if logging not enabled) */
    logFilepath: string | null;
}

/**
 * Convert VideoMode enum to string for logging.
 */
function videoModeToString(mode: VideoMode): string {
    switch (mode) {
        case VideoMode.TEXT:
            return 'TEXT';
        case VideoMode.LORES:
            return 'LORES';
        case VideoMode.HIRES:
            return 'HIRES';
        case VideoMode.MIXED:
            return 'MIXED';
        default:
            return 'UNKNOWN';
    }
}

/**
 * Hook for managing profiler logging.
 *
 * When enabled, starts logging immediately on mount and continues
 * until the emulator exits (unmount).
 *
 * @param machine - Apple II machine instance
 * @param profilerMetrics - Current profiler metrics (from useProfilerMetrics)
 * @param emulatorRunning - Whether the emulator is running (vs paused)
 * @param enabled - Whether profiler logging is enabled (--log-profile flag)
 * @returns ProfilerLoggerHook with logging state
 */
export function useProfilerLogger(
    machine: Apple2Machine,
    profilerMetrics: PerformanceMetrics | null,
    emulatorRunning: boolean,
    enabled: boolean = false,
): ProfilerLoggerHook {
    const [isLogging, setIsLogging] = useState(false);
    const [logFilepath, setLogFilepath] = useState<string | null>(null);
    const loggerRef = useRef<ProfilerLogger | null>(null);

    // Store latest metrics and running state in refs for collector callback
    // This avoids stale closure issues with the interval
    const metricsRef = useRef<PerformanceMetrics | null>(profilerMetrics);
    const runningRef = useRef<boolean>(emulatorRunning);
    useEffect(() => {
        metricsRef.current = profilerMetrics;
    }, [profilerMetrics]);
    useEffect(() => {
        runningRef.current = emulatorRunning;
    }, [emulatorRunning]);

    /**
     * Collect current metrics from machine and profiler.
     * Called once per logging interval (1 second).
     */
    const collectMetrics = useCallback((): ProfilerLogEntry => {
        const mem = process.memoryUsage();
        const videoState = machine.videoState;
        const videoMode = deriveVideoMode(videoState);

        // Use latest metrics from ref (avoids stale closure)
        const metrics = metricsRef.current ?? {
            frameTime: { current: 0, min: Infinity, max: 0, avg: 0, samples: 0 },
            cycleExecution: { current: 0, min: Infinity, max: 0, avg: 0, samples: 0 },
            totalCycles: machine.cycles,
            totalFrames: 0,
            actualCpuSpeed: 0,
        };

        // Calculate derived metrics
        const cpuSpeedPercent = (metrics.actualCpuSpeed / TARGET_CPU_MHZ) * 100;
        const frameRate = metrics.frameTime.avg > 0 ? 1000 / metrics.frameTime.avg : 0;
        const cyclesPerFrame =
            metrics.totalFrames > 0 ? metrics.totalCycles / metrics.totalFrames : 0;

        // Check disk motor status
        let diskMotor = false;
        if (machine.hasDiskController) {
            const drive1 = machine.getDrive(1);
            const drive2 = machine.getDrive(2);
            diskMotor = (drive1?.motorRunning ?? false) || (drive2?.motorRunning ?? false);
        }

        return {
            timestamp: '', // Filled by logger
            elapsedMs: 0, // Filled by logger
            frame: {
                current: metrics.frameTime.current,
                min: metrics.frameTime.min === Infinity ? 0 : metrics.frameTime.min,
                max: metrics.frameTime.max,
                avg: metrics.frameTime.avg,
                samples: metrics.frameTime.samples,
            },
            cycle: {
                current: metrics.cycleExecution.current,
                min: metrics.cycleExecution.min === Infinity ? 0 : metrics.cycleExecution.min,
                max: metrics.cycleExecution.max,
                avg: metrics.cycleExecution.avg,
                samples: metrics.cycleExecution.samples,
            },
            totalCycles: metrics.totalCycles,
            totalFrames: metrics.totalFrames,
            cpuSpeedMhz: metrics.actualCpuSpeed,
            cpuSpeedPercent,
            frameRate,
            cyclesPerFrame,
            memoryUsedMb: mem.heapUsed / 1024 / 1024,
            memoryTotalMb: mem.heapTotal / 1024 / 1024,
            externalMb: mem.external / 1024 / 1024,
            arrayBuffersMb: mem.arrayBuffers / 1024 / 1024,
            rssMb: mem.rss / 1024 / 1024,
            videoMode: videoModeToString(videoMode),
            diskMotor,
            emulatorRunning: runningRef.current,
        };
    }, [machine]);

    // Start logging on mount if enabled, stop on unmount
    useEffect(() => {
        if (!enabled) {
            return;
        }

        // Start logging
        const logger = createProfilerLogger();
        loggerRef.current = logger;

        logger.start(collectMetrics).then(() => {
            setIsLogging(true);
            setLogFilepath(logger.getFilepath());
        });

        // Cleanup on unmount
        return () => {
            if (loggerRef.current?.isRunning()) {
                loggerRef.current.stop();
            }
        };
    }, [enabled, collectMetrics]);

    return {
        isLogging,
        logFilepath,
    };
}
