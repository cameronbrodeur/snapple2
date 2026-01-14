/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfilerMetrics } from '../../src/hooks/use-profiler-metrics.js';

// Mock the profiler module
vi.mock('../../src/utils/profiler.js', () => ({
    getProfiler: vi.fn(),
}));

import { getProfiler } from '../../src/utils/profiler.js';

describe('useProfilerMetrics', () => {
    const mockMetrics = {
        frameTime: { current: 16.5, min: 15, max: 18, avg: 16.7, samples: 100 },
        cycleExecution: { current: 800, min: 700, max: 900, avg: 850, samples: 100 },
        totalCycles: 1000000,
        totalFrames: 1000,
        actualCpuSpeed: 1.02,
    };

    const mockProfiler = {
        getMetrics: vi.fn().mockReturnValue(mockMetrics),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        // Reset mock implementations to default state
        mockProfiler.getMetrics.mockReturnValue(mockMetrics);
        vi.mocked(getProfiler).mockReturnValue(mockProfiler as any);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should return null when not visible', () => {
        const { result } = renderHook(() => useProfilerMetrics(false));
        expect(result.current).toBeNull();
    });

    it('should return null initially when visible', () => {
        const { result } = renderHook(() => useProfilerMetrics(true));
        expect(result.current).toBeNull();
    });

    it('should return metrics after first poll interval', () => {
        const { result } = renderHook(() => useProfilerMetrics(true));

        act(() => {
            vi.advanceTimersByTime(200); // 5Hz = 200ms interval
        });

        expect(result.current).toEqual(mockMetrics);
    });

    it('should handle profiler not initialized', () => {
        vi.mocked(getProfiler).mockImplementation(() => {
            throw new Error('Profiler not initialized');
        });

        const { result } = renderHook(() => useProfilerMetrics(true));

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current).toBeNull();
    });

    it('should stop polling when visibility changes to false', () => {
        const { result, rerender } = renderHook(
            ({ visible }: { visible: boolean }) => useProfilerMetrics(visible),
            { initialProps: { visible: true } },
        );

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current).toEqual(mockMetrics);

        rerender({ visible: false });

        // Clear metrics call count
        mockProfiler.getMetrics.mockClear();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Should not have polled again
        expect(mockProfiler.getMetrics).not.toHaveBeenCalled();
    });
});
