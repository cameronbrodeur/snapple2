/**
 * Disk menu view for disk dialog.
 *
 * Displays the main menu of disk operations with hotkey buttons.
 * Shows available actions based on current disk state.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, HotkeyButton } from '../../common/index.js';
import { truncateWithEllipsis } from '../../../utils/file-system.js';
import { STATUS_MESSAGE_MAX_LENGTH } from './constants.js';

export interface DiskMenuViewProps {
    /** Theme for colors */
    theme: Theme;
    /** Currently active drive (1 or 2) */
    activeDrive: 1 | 2;
    /** Whether Save is available (disk loaded and has changes) */
    canSave: boolean;
    /** Whether Eject/Write-Protect are available (disk loaded) */
    canEject: boolean;
    /** Status message to display */
    statusMessage?: string | null;
}

/**
 * Main menu view with disk operation hotkeys.
 *
 * Shows Load, New, Save, Eject, Write-Protect options with context label.
 * Drive switching is done with ↑↓ or 1/2 keys (handled by parent).
 * Keyboard input is handled by the parent DiskDialog component.
 */
export function DiskMenuView({
    theme,
    activeDrive,
    canSave,
    canEject,
    statusMessage,
}: DiskMenuViewProps): React.ReactElement {
    return (
        <>
            {/* Context label showing which drive actions apply to */}
            <Box>
                <Text color={theme.accent.descColor}>
                    Disk actions (apply to{' '}
                    <Text color={theme.accent.descColor}>D{activeDrive}</Text>
                    ):
                </Text>
            </Box>

            {/* Action buttons - single row */}
            <Box gap={2} marginTop={1}>
                <HotkeyButton hotkey="L" label="Load…" enabled={true} theme={theme} />
                <HotkeyButton hotkey="N" label="New…" enabled={true} theme={theme} />
                <HotkeyButton hotkey="S" label="Save" enabled={canSave} theme={theme} />
                <HotkeyButton hotkey="W" label="Write-Protect" enabled={canEject} theme={theme} />
                <HotkeyButton hotkey="E" label="Eject…" enabled={canEject} theme={theme} />
            </Box>

            {/* Status message - always reserve one line for consistent height */}
            <Box marginTop={1} marginBottom={1}>
                <Text color={theme.status.paused}>
                    {statusMessage
                        ? truncateWithEllipsis(statusMessage, STATUS_MESSAGE_MAX_LENGTH)
                        : ' '}
                </Text>
            </Box>

            {/* Footer */}
            <Box gap={2}>
                <HotkeyButton hotkey="Esc" label="Close" enabled={true} theme={theme} />
            </Box>
        </>
    );
}
