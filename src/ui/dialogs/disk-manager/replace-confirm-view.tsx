/**
 * Replace confirmation view for disk dialog.
 *
 * Shown when user tries to Load or New while disk has unsaved changes.
 * Offers to save, discard, or cancel.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, HotkeyButton } from '../../common/index.js';

export interface ReplaceConfirmViewProps {
    /** Theme for colors */
    theme: Theme;
    /** Currently active drive (1 or 2) */
    activeDrive: 1 | 2;
    /** Name of the disk being replaced */
    diskName: string | null;
}

/**
 * Confirmation dialog for replacing a dirty disk.
 *
 * Aligned with EjectConfirmView styling for consistency.
 */
export function ReplaceConfirmView({
    theme,
    activeDrive,
    diskName,
}: ReplaceConfirmViewProps): React.ReactElement {
    return (
        <Box flexDirection="column" alignItems="center">
            <Text color={theme.status.paused} bold>
                Unsaved changes in D{activeDrive}
            </Text>
            <Box marginTop={1}>
                <Text color={theme.accent.descColor}>
                    Changes to <Text color={theme.accent.keyColor}>{diskName}</Text> will be lost.
                </Text>
            </Box>
            <Box flexDirection="column" marginTop={1} gap={1}>
                <HotkeyButton hotkey="S" label="Save then continue" enabled={true} theme={theme} />
                <HotkeyButton
                    hotkey="D"
                    label="Discard and continue"
                    enabled={true}
                    theme={theme}
                />
            </Box>
        </Box>
    );
}
