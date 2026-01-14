/**
 * Reboot confirmation dialog component.
 *
 * Displays a confirmation dialog when user presses F9 to reboot.
 * Prevents accidental reboots that would lose unsaved program state.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, HotkeyButton } from '../common/index.js';
import { useBlockAllInputWhileMounted } from '../../hooks/use-input-block.js';

export interface RebootConfirmDialogProps {
    visible: boolean;
    theme: Theme;
}

/**
 * Reboot confirmation modal.
 *
 * Shows Y/N prompt with warning about losing RAM contents.
 * Blocks all input while visible except Y, N, Esc.
 */
export const RebootConfirmDialog = React.memo(function RebootConfirmDialog({
    visible,
    theme,
}: RebootConfirmDialogProps) {
    // Block ALL keyboard input (including function keys) while modal is visible
    useBlockAllInputWhileMounted(visible);

    if (!visible) {
        return null;
    }

    return (
        <Box
            position="absolute"
            width="100%"
            height="100%"
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
        >
            <Box
                flexDirection="column"
                borderStyle="round"
                borderColor={theme.accent.borderColor}
                backgroundColor={theme.accent.background}
                paddingX={3}
                paddingY={1}
            >
                <Box justifyContent="center" marginBottom={1}>
                    <Text color={theme.accent.titleColor} bold>
                        Reboot Snapple ][?
                    </Text>
                </Box>

                <Box justifyContent="center" marginBottom={1}>
                    <Text color={theme.status.paused}>Unsaved data in RAM will be lost!</Text>
                </Box>

                <Box justifyContent="center" gap={2}>
                    <HotkeyButton hotkey="Y" label="Reboot" enabled={true} theme={theme} />
                    <HotkeyButton hotkey="N" label="Cancel" enabled={true} theme={theme} />
                </Box>
            </Box>
        </Box>
    );
});
