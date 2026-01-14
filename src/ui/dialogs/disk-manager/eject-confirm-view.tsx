/**
 * Eject confirmation view for disk dialog.
 *
 * Displays confirmation prompt when user tries to eject a disk
 * with unsaved changes. Pure presentation - keyboard handling
 * is done by the parent DiskDialog component.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, HotkeyButton } from '../../common/index.js';

export interface EjectConfirmViewProps {
    /** Theme for colors */
    theme: Theme;
    /** Currently active drive (1 or 2) */
    activeDrive: 1 | 2;
    /** Name of disk being ejected */
    diskName: string | null;
}

/**
 * Confirmation dialog for ejecting disk with unsaved changes.
 *
 * Shows warning and Y/N options. Keyboard input is handled by parent.
 */
export function EjectConfirmView({
    theme,
    activeDrive,
    diskName,
}: EjectConfirmViewProps): React.ReactElement {
    return (
        <Box flexDirection="column" alignItems="center">
            <Text color={theme.status.paused} bold>
                Eject D{activeDrive} with unsaved changes?
            </Text>
            <Box marginTop={1}>
                <Text color={theme.accent.descColor}>
                    Changes to <Text color={theme.accent.keyColor}>{diskName}</Text> will be lost.
                </Text>
            </Box>
            <Box marginTop={1} gap={2}>
                <HotkeyButton hotkey="Y" label="Eject" enabled={true} theme={theme} />
                <HotkeyButton hotkey="N" label="Cancel" enabled={true} theme={theme} />
            </Box>
        </Box>
    );
}
