/**
 * useExecution Hook
 *
 * Manages CPU execution loop with drift compensation.
 */

import { useEffect } from 'react';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { getProfiler } from '../utils/profiler.js';

/**
 * Apple II Plus CPU frequency (1.023 MHz)
 */
const CPU_HZ = 1_023_000;

/**
 * Target frame time in milliseconds (60 Hz)
 */
const FRAME_TIME_MS = 16.67;

/**
 * useExecution hook.
 *
 * Runs the CPU at the correct speed using a high-resolution timer
 * with drift compensation to maintain long-term accuracy.
 *
 * @param machine - Apple2Machine instance
 * @param running - Whether the emulator is running
 * @param updateCycles - Callback to update cycle count in UI
 */
export function useExecution(
    machine: Apple2Machine,
    running: boolean,
    updateCycles: (cycles: number) => void,
): void {
    useEffect(() => {
        if (!running) {
            return;
        }

        let lastTime = performance.now();
        let cycleDebt = 0; // Accumulated timing error

        // Get profiler (throws if not initialized yet)
        let profiler;
        try {
            profiler = getProfiler();
            // Reset profiler stats when (re)starting execution
            // This ensures CPU speed calculation doesn't include paused time
            profiler.reset(machine.cycles);
        } catch {
            profiler = null;
        }

        const interval = setInterval(() => {
            const now = performance.now();
            const elapsed = now - lastTime;
            lastTime = now;

            // Calculate cycles based on actual elapsed time
            const targetCycles = Math.floor((elapsed / 1000) * CPU_HZ) + cycleDebt;

            // Execute cycles (with profiling)
            const cycleStart = performance.now();
            const actualCycles = machine.runCycles(targetCycles);
            const cycleTime = (performance.now() - cycleStart) * 1000; // Convert to microseconds

            // Update paddle positions based on held keys
            machine.updatePaddles();

            // Track any timing debt for next frame
            cycleDebt = targetCycles - actualCycles;

            // Update UI cycle count (throttled by frame rate)
            updateCycles(machine.cycles);

            // Record profiling metrics (UI displays via useProfilerMetrics hook)
            if (profiler) {
                profiler.recordFrameTime(elapsed);
                profiler.recordCycleExecution(cycleTime);
                profiler.updateCycles(machine.cycles);
                profiler.updateMemory();
            }
        }, FRAME_TIME_MS);

        return () => clearInterval(interval);
    }, [running, machine, updateCycles]);
}
