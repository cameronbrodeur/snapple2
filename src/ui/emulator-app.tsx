/**
 * Main emulator UI component.
 *
 * Composes screen display, status bar, dialogs, keyboard input handling,
 * and CPU execution loop. Handles terminal size validation.
 */

import React, { useEffect, useMemo } from 'react';
import { Box, useApp } from 'ink';
import { Apple2Machine } from '../emulator/apple2-machine.js';
import { useEmulator, StatusBarMode } from '../hooks/use-emulator.js';
import { useProfilerMetrics } from '../hooks/use-profiler-metrics.js';
import { useProfilerLogger } from '../hooks/use-profiler-logger.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import { useExecution } from '../hooks/use-execution.js';
import { useFunctionKeys } from '../hooks/use-function-keys.js';
import { useTerminalSize } from '../hooks/use-terminal-size.js';
import { useCursorBlink } from '../hooks/use-cursor-blink.js';
import { useDialogKeys } from '../hooks/use-dialog-keys.js';
import {
    deriveVideoMode,
    deriveTextPage,
    isTerminalTooSmall,
    getMinTerminalSize,
} from '../utils/video-mode.js';
import { ScreenPane } from './screen-pane.js';
import { StatusBar } from './status-bar.js';
import { HelpDialog, ExitConfirmDialog, RebootConfirmDialog, DiskDialog } from './dialogs/index.js';
import { TerminalTooSmall } from './terminal-too-small.js';
import { Theme, DefaultTheme } from './common/index.js';

export interface EmulatorAppProps {
    machine: Apple2Machine;
    theme?: Theme;
    logProfileEnabled?: boolean;
}

/**
 * Main emulator UI component.
 *
 * Integrates display, status bar, keyboard handling, and execution loop.
 */
export function EmulatorApp({
    machine,
    theme = DefaultTheme,
    logProfileEnabled = false,
}: EmulatorAppProps): React.ReactElement {
    const { exit } = useApp();
    const terminalSize = useTerminalSize();
    const emulator = useEmulator(machine);

    // Poll profiler metrics when in PROFILER status bar mode
    const profilerMetrics = useProfilerMetrics(emulator.statusBarMode === StatusBarMode.PROFILER);

    // Profiler logging (enabled via --log-profile CLI flag)
    const profilerLogger = useProfilerLogger(
        machine,
        profilerMetrics,
        emulator.running,
        logProfileEnabled,
    );

    // Set up keyboard handling (F10 quit is handled by useFunctionKeys)
    useKeyboard(machine, emulator);

    // Set up dialog key handlers (Esc to close dialogs, Y/N for exit/reboot)
    // Note: Disk dialog handles its own ESC to support file browser navigation
    useDialogKeys(
        {
            showHelp: emulator.showHelp,
            showExitConfirm: emulator.showExitConfirm,
            showRebootConfirm: emulator.showRebootConfirm,
        },
        {
            onCloseHelp: emulator.closeHelp,
            onConfirmExit: exit,
            onCancelExit: emulator.hideExitConfirmDialog,
            onConfirmReboot: () => {
                emulator.rebootNow();
                emulator.hideRebootConfirmDialog();
            },
            onCancelReboot: emulator.hideRebootConfirmDialog,
        },
    );

    // Set up function key handling
    useFunctionKeys({
        onF1: emulator.openHelp,
        onF2: emulator.cycleStatusBarMode,
        onF3: emulator.togglePause,
        onF4: emulator.openDiskDialog,
        onF5: emulator.saveDisksNow,
        onF6: emulator.saveStateNow,
        onF7: emulator.loadStateNow,
        onF9: emulator.showRebootConfirmDialog,
        onF10: emulator.showExitConfirmDialog,
    });

    // Set up execution loop and cursor blink
    useExecution(machine, emulator.running, emulator.updateCycles);
    const flashCounter = useCursorBlink(machine);

    // Auto-start emulator on mount
    useEffect(() => {
        emulator.run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check for unsaved disk changes
    const hasUnsavedChanges = useMemo((): boolean => {
        if (!machine.hasDiskController) return false;
        const drive1 = machine.getDrive(1);
        const drive2 = machine.getDrive(2);
        const drive1Dirty = drive1?.image ? drive1.getWriteBuffer().isDirty() : false;
        const drive2Dirty = drive2?.image ? drive2.getWriteBuffer().isDirty() : false;
        return drive1Dirty || drive2Dirty;
    }, [machine, emulator.showExitConfirm]);

    // Get current video state
    // PERF: Memoize to avoid creating new objects on every 60Hz re-render.
    // Without memoization, each render creates new buffer array + state object,
    // causing ~13-15 MB/sec memory pressure that overwhelms GC.
    // flashCounter dependency ensures re-fetch when cursor blink toggles.
    const videoBuffer = useMemo(() => machine.getVideoBuffer(), [emulator.cycles, flashCounter]);
    const videoState = useMemo(() => machine.videoState, [emulator.cycles]);
    const videoMode = useMemo(() => deriveVideoMode(videoState), [videoState]);
    const textPage = useMemo(() => deriveTextPage(videoState), [videoState]);

    // Check terminal size
    if (isTerminalTooSmall(terminalSize, videoState)) {
        return (
            <TerminalTooSmall
                currentSize={terminalSize}
                requiredSize={getMinTerminalSize(videoState)}
                theme={theme}
            />
        );
    }

    return (
        <Box flexDirection="column" padding={1}>
            {/* Main screen */}
            <ScreenPane buffer={videoBuffer} theme={theme} flashCounter={flashCounter} />

            {/* Status bar */}
            <StatusBar
                running={emulator.running}
                videoMode={videoMode}
                textPage={textPage}
                mode={emulator.statusBarMode}
                theme={theme}
                machine={machine}
                statusMessage={emulator.statusMessage}
                activeDrive={emulator.activeDrive}
                profilerMetrics={profilerMetrics}
                isLogging={profilerLogger.isLogging}
            />

            {/* Help dialog */}
            <HelpDialog visible={emulator.showHelp} theme={theme} />

            {/* Exit confirmation dialog */}
            <ExitConfirmDialog
                visible={emulator.showExitConfirm}
                theme={theme}
                hasUnsavedChanges={hasUnsavedChanges}
            />

            {/* Reboot confirmation dialog */}
            <RebootConfirmDialog visible={emulator.showRebootConfirm} theme={theme} />

            {/* Disk dialog */}
            <DiskDialog
                visible={emulator.showDiskDialog}
                theme={theme}
                activeDrive={emulator.activeDrive}
                drive1={{
                    name: machine.getDiskName(1),
                    writable: machine.getDrive(1)?.isWriteAllowed() ?? false,
                    dirty: machine.getDrive(1)?.getWriteBuffer().isDirty() ?? false,
                }}
                drive2={{
                    name: machine.getDiskName(2),
                    writable: machine.getDrive(2)?.isWriteAllowed() ?? false,
                    dirty: machine.getDrive(2)?.getWriteBuffer().isDirty() ?? false,
                }}
                initialPath={process.cwd()}
                statusMessage={emulator.showDiskDialog ? emulator.statusMessage : null}
                onClose={emulator.closeDiskDialog}
                onSwitchDrive={emulator.cycleActiveDrive}
                onSetDrive={emulator.setActiveDrive}
                onLoadDisk={emulator.loadDiskFromDialog}
                onEjectDisk={emulator.ejectDiskFromDialog}
                onSaveDisk={emulator.saveDiskNow}
                onToggleWriteProtect={emulator.toggleWriteProtectNow}
                onCreateDisk={emulator.createDiskFromDialog}
            />
        </Box>
    );
}
