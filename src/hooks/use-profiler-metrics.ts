/**
 * useProfilerMetrics Hook
 *
 * Polls the global profiler at ~5Hz and returns current metrics.
 * Only polls when visible to avoid overhead.
 */

import { useState, useEffect } from 'react';
import { PerformanceMetrics, getProfiler } from '../utils/profiler.js';

/** Polling interval in milliseconds (~5Hz) */
const POLL_INTERVAL_MS = 200;

/**
 * Hook that polls profiler metrics at regular intervals.
 *
 * @param visible - Whether profiler UI is visible (controls polling)
 * @returns Current metrics or null if not visible/unavailable
 */
export function useProfilerMetrics(visible: boolean): PerformanceMetrics | null {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

    useEffect(() => {
        if (!visible) {
            setMetrics(null);
            return;
        }

        const interval = setInterval(() => {
            try {
                const profiler = getProfiler();
                setMetrics(profiler.getMetrics());
            } catch {
                // Profiler not initialized - leave metrics as null
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [visible]);

    return metrics;
}
