/**
 * Disk Manager dialog component.
 *
 * Modal dialog for managing disk operations: load, eject, save, write-protect.
 * Triggered by F4, blocks all input while visible.
 *
 * Acts as orchestrator, delegating rendering to specialized view components:
 * - DiskMenuView: Main menu with operation hotkeys
 * - LoadDiskView: File browser for loading disks
 * - EjectConfirmView: Confirmation for ejecting dirty disks
 * - ReplaceConfirmView: Confirmation for replacing dirty disk with Load/New
 * - CreateDiskView: Create new blank disk with directory selection
 * - DiskHelpView: Keyboard shortcuts help screen
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Theme, DiskDrive, HotkeyButton } from '../../common/index.js';
import { useBlockAllInputWhileMounted } from '../../../hooks/use-input-block.js';
import { DiskMenuView } from './disk-menu-view.js';
import { LoadDiskView } from './load-disk-view.js';
import { EjectConfirmView } from './eject-confirm-view.js';
import { CreateDiskView } from './create-disk-view.js';
import { DiskHelpView } from './disk-help-view.js';
import { ReplaceConfirmView } from './replace-confirm-view.js';

type View = 'menu' | 'load-disk' | 'eject-confirm' | 'create-disk' | 'replace-confirm' | 'help';
type PendingAction = 'load' | 'create' | null;

/** Drive state for display in dialog */
export interface DriveState {
    name: string | null;
    writable: boolean;
    dirty: boolean;
}

export interface DiskDialogProps {
    visible: boolean;
    theme: Theme;
    activeDrive: 1 | 2;
    drive1: DriveState;
    drive2: DriveState;
    initialPath: string;
    statusMessage?: string | null;
    onClose: () => void;
    onSwitchDrive: () => void;
    onSetDrive: (driveNum: 1 | 2) => void;
    onLoadDisk: (filePath: string) => void;
    onEjectDisk: () => void;
    onSaveDisk: () => void;
    onToggleWriteProtect: () => void;
    onCreateDisk: (
        filename: string,
        directory: string,
    ) => Promise<{ success: boolean; error?: string }>;
}

export function DiskDialog({
    visible,
    theme,
    activeDrive,
    drive1,
    drive2,
    initialPath,
    statusMessage,
    onClose,
    onSwitchDrive,
    onSetDrive,
    onLoadDisk,
    onEjectDisk,
    onSaveDisk,
    onToggleWriteProtect,
    onCreateDisk,
}: DiskDialogProps): React.ReactElement | null {
    const [view, setView] = useState<View>('menu');
    const [previousView, setPreviousView] = useState<View>('menu');
    const [filenameError, setFilenameError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);

    useBlockAllInputWhileMounted(visible);

    const activeDriveState = activeDrive === 1 ? drive1 : drive2;
    const canSave = activeDriveState.name !== null && activeDriveState.dirty;
    const canEject = activeDriveState.name !== null;

    useInput(
        (input, key) => {
            if (!visible) return;

            // Handle help view - any key returns to previous view
            if (view === 'help') {
                setView(previousView);
                return;
            }

            // Handle eject confirmation view (Y-only for destructive action)
            if (view === 'eject-confirm') {
                const lower = input.toLowerCase();
                if (lower === 'y') {
                    onEjectDisk();
                    setView('menu');
                } else if (lower === 'n' || key.escape) {
                    setView('menu');
                }
                return;
            }

            // Handle replace confirmation view (dirty disk warning for Load/New)
            if (view === 'replace-confirm') {
                const lower = input.toLowerCase();
                if (lower === 's') {
                    // Save first, then proceed
                    onSaveDisk();
                    if (pendingAction === 'load') {
                        setView('load-disk');
                    } else if (pendingAction === 'create') {
                        setFilenameError(null);
                        setView('create-disk');
                    }
                    setPendingAction(null);
                } else if (lower === 'd') {
                    // Eject dirty disk first (discards changes), then proceed
                    onEjectDisk();
                    if (pendingAction === 'load') {
                        setView('load-disk');
                    } else if (pendingAction === 'create') {
                        setFilenameError(null);
                        setView('create-disk');
                    }
                    setPendingAction(null);
                } else if (key.escape) {
                    setView('menu');
                    setPendingAction(null);
                }
                return;
            }

            if (key.escape) {
                if (view === 'load-disk') {
                    setView('menu');
                } else if (view === 'create-disk') {
                    // CreateDiskView handles its own ESC behavior
                    // (input mode: cancel, browser mode: go up dir or cancel)
                } else {
                    onClose();
                }
                return;
            }

            // Help available from any view (except help/eject-confirm which return early above)
            if (input === '?') {
                setPreviousView(view);
                setView('help');
                return;
            }

            // Drive switching with ↑↓ (toggle) or 1/2 (select) keys (menu view only)
            if (view === 'menu') {
                if (key.upArrow || key.downArrow) {
                    onSwitchDrive();
                    return;
                }
                if (input === '1') {
                    onSetDrive(1);
                    return;
                }
                if (input === '2') {
                    onSetDrive(2);
                    return;
                }
            }

            if (view === 'menu') {
                const lower = input.toLowerCase();
                if (lower === 'l') {
                    // Show replace confirmation if disk has unsaved changes
                    if (activeDriveState.dirty) {
                        setPendingAction('load');
                        setView('replace-confirm');
                    } else {
                        setView('load-disk');
                    }
                } else if (lower === 's') {
                    if (canSave) {
                        onSaveDisk();
                    }
                } else if (lower === 'e') {
                    // Show confirmation if disk has unsaved changes
                    if (activeDriveState.dirty) {
                        setView('eject-confirm');
                    } else if (canEject) {
                        onEjectDisk();
                    }
                } else if (lower === 'w') {
                    if (canEject) {
                        onToggleWriteProtect();
                    }
                } else if (lower === 'n') {
                    // Show replace confirmation if disk has unsaved changes
                    if (activeDriveState.dirty) {
                        setPendingAction('create');
                        setView('replace-confirm');
                    } else {
                        setFilenameError(null);
                        setView('create-disk');
                    }
                }
            }
        },
        { isActive: visible },
    );

    const handleSelectDisk = useCallback(
        (filePath: string) => {
            onLoadDisk(filePath);
            setView('menu');
            onClose();
        },
        [onLoadDisk, onClose],
    );

    const handleFileBrowserCancel = useCallback(() => {
        setView('menu');
    }, []);

    const handleFilenameSubmit = useCallback(
        async (filename: string, directory: string) => {
            const result = await onCreateDisk(filename, directory);
            if (result.success) {
                setView('menu');
                onClose();
            } else if (result.error) {
                setFilenameError(result.error);
            }
        },
        [onCreateDisk, onClose],
    );

    const handleFilenameCancel = useCallback(() => {
        setFilenameError(null);
        setView('menu');
    }, []);

    if (!visible) return null;

    // Different header titles for different views
    const headerTitle = view === 'help' ? 'DISK MANAGER HELP' : 'DISK MANAGER';
    const showDrivePills = view === 'menu';
    const showHelpButton =
        view !== 'help' && view !== 'eject-confirm' && view !== 'replace-confirm';

    return (
        <Box
            position="absolute"
            width="100%"
            height="100%"
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
            marginTop={-2}
        >
            <Box
                flexDirection="column"
                borderStyle="round"
                borderColor={theme.accent.borderColor}
                backgroundColor={theme.accent.background}
                paddingX={2}
                paddingY={1}
                width={74}
            >
                {/* Header with [?] help button */}
                <Box justifyContent="space-between">
                    <Box width={4} />
                    <Text color={theme.accent.keyColor} bold>
                        {headerTitle}
                    </Text>
                    {showHelpButton ? (
                        <HotkeyButton hotkey="?" label="" enabled={true} theme={theme} />
                    ) : (
                        <Box width={4} />
                    )}
                </Box>

                {/* Separator line */}
                <Text color={theme.status.dimColor}>{'─'.repeat(68)}</Text>

                {/* Drives section - disk drive visuals */}
                {showDrivePills && (
                    <Box flexDirection="column" marginTop={1}>
                        <Box marginLeft={3}>
                            <DiskDrive
                                driveNum={1}
                                diskName={drive1.name}
                                active={activeDrive === 1}
                                dirty={drive1.dirty}
                                writable={drive1.writable}
                                theme={theme}
                            />
                        </Box>
                        <Box marginTop={1} marginLeft={3}>
                            <DiskDrive
                                driveNum={2}
                                diskName={drive2.name}
                                active={activeDrive === 2}
                                dirty={drive2.dirty}
                                writable={drive2.writable}
                                theme={theme}
                            />
                        </Box>
                    </Box>
                )}

                {/* Content - delegated to view components */}
                <Box flexDirection="column" marginTop={1}>
                    {view === 'menu' && (
                        <DiskMenuView
                            theme={theme}
                            activeDrive={activeDrive}
                            canSave={canSave}
                            canEject={canEject}
                            statusMessage={statusMessage}
                        />
                    )}
                    {view === 'load-disk' && (
                        <LoadDiskView
                            theme={theme}
                            activeDrive={activeDrive}
                            initialPath={initialPath}
                            onSelectDisk={handleSelectDisk}
                            onCancel={handleFileBrowserCancel}
                        />
                    )}
                    {view === 'eject-confirm' && (
                        <EjectConfirmView
                            theme={theme}
                            activeDrive={activeDrive}
                            diskName={activeDriveState.name}
                        />
                    )}
                    {view === 'replace-confirm' && (
                        <ReplaceConfirmView
                            theme={theme}
                            activeDrive={activeDrive}
                            diskName={activeDriveState.name}
                        />
                    )}
                    {view === 'create-disk' && (
                        <CreateDiskView
                            theme={theme}
                            activeDrive={activeDrive}
                            initialPath={initialPath}
                            error={filenameError}
                            onSubmit={handleFilenameSubmit}
                            onCancel={handleFilenameCancel}
                        />
                    )}
                    {view === 'help' && <DiskHelpView theme={theme} />}
                </Box>
            </Box>
        </Box>
    );
}
