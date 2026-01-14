/**
 * Exit confirmation dialog component.
 *
 * Displays a confirmation dialog when user presses F10 to quit.
 * Prevents accidental exits, especially with unsaved changes.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, HotkeyButton } from '../common/index.js';
import { useBlockAllInputWhileMounted } from '../../hooks/use-input-block.js';

export interface ExitConfirmDialogProps {
    visible: boolean;
    theme: Theme;
    hasUnsavedChanges?: boolean;
}

/**
 * Exit confirmation modal.
 *
 * Shows Y/N prompt with unsaved changes warning if applicable.
 * Blocks all input while visible except Y, N, Enter, Esc.
 */
export const ExitConfirmDialog = React.memo(function ExitConfirmDialog({
    visible,
    theme,
    hasUnsavedChanges = false,
}: ExitConfirmDialogProps) {
    // Block ALL keyboard input (including function keys) while modal is visible
    // Only Y, N, Enter, Esc are handled by the dedicated stdin listener in emulator-app
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
                        Exit Snapple ][?
                    </Text>
                </Box>

                {hasUnsavedChanges && (
                    <Box justifyContent="center" marginBottom={1}>
                        <Text color={theme.status.paused}>
                            Warning: You have unsaved disk changes!
                        </Text>
                    </Box>
                )}

                <Box justifyContent="center" gap={2}>
                    <HotkeyButton hotkey="Y" label="Quit" enabled={true} theme={theme} />
                    <HotkeyButton hotkey="N" label="Cancel" enabled={true} theme={theme} />
                </Box>
            </Box>
        </Box>
    );
});
