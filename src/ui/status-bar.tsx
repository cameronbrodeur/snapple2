/**
 * Status bar component.
 *
 * Displays emulator status (running/paused), video mode, disk status,
 * keyboard shortcuts, and status messages in boxed sections.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, StatusPill, DiskStatusPill, HotkeyButton } from './common/index.js';
import { Palette } from '../shared/colors.js';
import { VideoMode, TextPage } from '../emulator/types.js';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { StatusBarMode } from '../hooks/use-emulator.js';
import { PerformanceMetrics } from '../utils/profiler.js';
import { isCpuSpeedWarning, isFrameTimeWarning } from '../utils/profiler-warnings.js';

/**
 * Fixed column widths for hotkey button alignment.
 * Widths accommodate longest label in each column position
 */
const HOTKEY_COL_WIDTHS = [14, 13, 12, 11, 12] as const;

/**
 * Props for the StatusBar component.
 */
export interface StatusBarProps {
    running: boolean;
    videoMode: VideoMode;
    textPage: TextPage;
    mode: StatusBarMode;
    theme: Theme;
    machine: Apple2Machine;
    statusMessage?: string | null;
    activeDrive: 1 | 2;
    profilerMetrics?: PerformanceMetrics | null;
    isLogging?: boolean;
}

/**
 * Returns the display color for a video mode indicator.
 */
function getVideoModeColor(videoMode: VideoMode): string {
    switch (videoMode) {
        case VideoMode.TEXT:
            return Palette.gray.base;
        case VideoMode.MIXED:
            return Palette.yellow.bright;
        case VideoMode.LORES:
            return Palette.teal.bright;
        case VideoMode.HIRES:
            return Palette.blue.bright;
        default:
            return Palette.gray.base;
    }
}

/**
 * Disk drive state for status bar display.
 */
interface DiskInfo {
    active: boolean;
    dirty: boolean;
    writable: boolean;
    motorOn: boolean;
}

/**
 * Extracts disk status from a drive for display.
 */
function getDiskInfo(machine: Apple2Machine, driveNum: 1 | 2, activeDrive: 1 | 2): DiskInfo | null {
    const drive = machine.getDrive(driveNum);
    if (!drive?.image) return null;

    return {
        active: driveNum === activeDrive,
        dirty: drive.getWriteBuffer().isDirty(),
        writable: drive.isWriteAllowed(),
        motorOn: drive.motorRunning,
    };
}

/**
 * Props for the HotkeyRows component.
 */
interface HotkeyRowsProps {
    running: boolean;
    theme: Theme;
    f2Label: string;
}

/**
 * Renders the two rows of hotkey buttons used in profiler and full modes.
 */
function HotkeyRows({ running, theme, f2Label }: HotkeyRowsProps): React.ReactElement {
    return (
        <>
            <Box>
                <Box width={HOTKEY_COL_WIDTHS[0]}>
                    <HotkeyButton hotkey="F1" label="Help" enabled={true} theme={theme} />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[1]}>
                    <HotkeyButton hotkey="F2" label={f2Label} enabled={true} theme={theme} />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[2]}>
                    <HotkeyButton
                        hotkey="F3"
                        label={running ? 'Pause' : 'Resume'}
                        enabled={true}
                        theme={theme}
                    />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[3]}>
                    <HotkeyButton hotkey="F4" label="Disk" enabled={true} theme={theme} />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[4]}>
                    <HotkeyButton hotkey="F5" label="Save" enabled={true} theme={theme} />
                </Box>
            </Box>
            <Box>
                <Box width={HOTKEY_COL_WIDTHS[0]}>
                    <HotkeyButton hotkey="F6" label="Snapshot" enabled={true} theme={theme} />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[1]}>
                    <HotkeyButton hotkey="F7" label="Restore" enabled={true} theme={theme} />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[2]}>
                    <HotkeyButton hotkey="F9" label="Reboot" enabled={true} theme={theme} />
                </Box>
                <Box width={HOTKEY_COL_WIDTHS[3]}>
                    <HotkeyButton hotkey="F10" label="Quit" enabled={true} theme={theme} />
                </Box>
            </Box>
        </>
    );
}

/**
 * Displays emulator status information in multiple modes.
 *
 * Three modes: HIDDEN (placeholder only), MINIMAL (key shortcuts),
 * FULL (pills + shortcuts + status message).
 */
export function StatusBar({
    running,
    videoMode,
    textPage,
    mode,
    theme,
    machine,
    statusMessage,
    activeDrive,
    profilerMetrics,
    isLogging = false,
}: StatusBarProps) {
    // Hidden mode: no status visible
    if (mode === StatusBarMode.HIDDEN) {
        return (
            // Reserve 4 lines to match full mode height (pills + 2 keyboard rows + status message)
            // (prevents dialog shifting)
            <Box flexDirection="column" marginTop={1} height={4} paddingLeft={1}>
                {statusMessage && <Text color={theme.status.foreground}>{statusMessage}</Text>}
            </Box>
        );
    }

    // Minimal mode: just essential shortcuts
    if (mode === StatusBarMode.MINIMAL) {
        return (
            <Box flexDirection="column" marginTop={1} height={4} paddingLeft={1}>
                <Box gap={2}>
                    <HotkeyButton hotkey="F1" label="Help" enabled={true} theme={theme} />
                    <HotkeyButton hotkey="F10" label="Quit" enabled={true} theme={theme} />
                </Box>
                {statusMessage && (
                    <Box>
                        <Text color={theme.status.foreground}>{statusMessage}</Text>
                    </Box>
                )}
            </Box>
        );
    }

    // Profiler mode: performance metrics on single row
    if (mode === StatusBarMode.PROFILER && profilerMetrics) {
        const cpuPercent = Math.round((profilerMetrics.actualCpuSpeed / 1.023) * 100);
        const cpuWarning = isCpuSpeedWarning(profilerMetrics.actualCpuSpeed);
        const frameWarning = isFrameTimeWarning(profilerMetrics.frameTime.avg);
        const memoryWarning = profilerMetrics.heapUsedMb > 2048; // 2GB threshold

        const warningColor = Palette.yellow.bright;
        const normalColor = Palette.gray.base;

        return (
            <Box flexDirection="column" marginTop={1} height={4} paddingLeft={1}>
                {/* Performance metrics */}
                <Box flexDirection="row" gap={1}>
                    <StatusPill
                        content={`CPU ${profilerMetrics.actualCpuSpeed.toFixed(2)}MHz ${cpuPercent}%`}
                        bgColor={cpuWarning ? warningColor : theme.status.running}
                        theme={theme}
                    />
                    <StatusPill
                        content={`Memory ${Math.round(profilerMetrics.heapUsedMb)}Mb`}
                        bgColor={memoryWarning ? warningColor : normalColor}
                        theme={theme}
                    />
                    <StatusPill
                        content={`Frame ${profilerMetrics.frameTime.avg.toFixed(1)}ms`}
                        bgColor={frameWarning ? warningColor : normalColor}
                        theme={theme}
                    />
                    <StatusPill
                        content={`Cycle ${profilerMetrics.cycleExecution.avg.toFixed(0)}\u03BCs`}
                        bgColor={normalColor}
                        theme={theme}
                    />
                    <StatusPill
                        content={`Frames ${profilerMetrics.totalFrames.toLocaleString()}`}
                        bgColor={normalColor}
                        theme={theme}
                    />
                    {isLogging && (
                        <StatusPill content="LOG" bgColor={Palette.red.base} theme={theme} />
                    )}
                </Box>

                <HotkeyRows running={running} theme={theme} f2Label="Status" />

                {/* Status message */}
                {statusMessage && (
                    <Box>
                        <Text color={theme.status.foreground}>{statusMessage}</Text>
                    </Box>
                )}
            </Box>
        );
    }

    // Full mode: complete status bar
    const statusColor = running ? theme.status.running : theme.status.paused;
    const statusText = running ? '▶ RUNNING' : '⏸ PAUSED ';

    // Format video mode status text
    let videoModeText = '';
    switch (videoMode) {
        case VideoMode.TEXT:
            videoModeText = `Text  P${textPage}`;
            break;
        case VideoMode.LORES:
            videoModeText = `LoRes P${textPage}`;
            break;
        case VideoMode.HIRES:
            videoModeText = `HiRes P${textPage}`;
            break;
        case VideoMode.MIXED:
            videoModeText = `Mixed P${textPage}`;
            break;
    }

    // Get disk info for both drives
    const disk1Info = getDiskInfo(machine, 1, activeDrive);
    const disk2Info = getDiskInfo(machine, 2, activeDrive);

    return (
        <Box flexDirection="column" marginTop={1} height={4} paddingLeft={1}>
            {/* Status pills */}
            <Box flexDirection="row">
                <StatusPill content={statusText} bgColor={statusColor} theme={theme} />

                {disk1Info && (
                    <DiskStatusPill
                        driveNum={1}
                        active={disk1Info.active}
                        dirty={disk1Info.dirty}
                        writable={disk1Info.writable}
                        motorOn={disk1Info.motorOn}
                        theme={theme}
                    />
                )}

                {disk2Info && (
                    <DiskStatusPill
                        driveNum={2}
                        active={disk2Info.active}
                        dirty={disk2Info.dirty}
                        writable={disk2Info.writable}
                        motorOn={disk2Info.motorOn}
                        theme={theme}
                    />
                )}

                <StatusPill
                    content={videoModeText}
                    bgColor={getVideoModeColor(videoMode)}
                    theme={theme}
                />
            </Box>

            <HotkeyRows running={running} theme={theme} f2Label="Status" />

            {/* Status message */}
            {statusMessage && (
                <Box>
                    <Text color={theme.status.foreground}>{statusMessage}</Text>
                </Box>
            )}
        </Box>
    );
}
