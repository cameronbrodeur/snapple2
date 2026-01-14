/**
 * Load disk view for disk dialog.
 *
 * Wraps FileBrowser with header and visual separators for loading
 * disk images into a drive. Includes half-block separators for
 * consistent visual styling.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, HotkeyButton, FileBrowser } from '../../common/index.js';
import { SEPARATOR_WIDTH, FOCUS_BACKGROUND } from './constants.js';

export interface LoadDiskViewProps {
    /** Theme for colors */
    theme: Theme;
    /** Currently active drive (1 or 2) */
    activeDrive: 1 | 2;
    /** Initial directory path for browser */
    initialPath: string;
    /** Called when user selects a disk file */
    onSelectDisk: (filePath: string) => void;
    /** Called when user cancels (ESC) */
    onCancel: () => void;
}

/**
 * File browser view for loading disk images.
 *
 * Shows header with drive number, FileBrowser for navigation,
 * and half-block separators for visual boundaries.
 */
export function LoadDiskView({
    theme,
    activeDrive,
    initialPath,
    onSelectDisk,
    onCancel,
}: LoadDiskViewProps): React.ReactElement {
    return (
        <>
            {/* Header */}
            <Text color={theme.accent.descColor}>Load disk into Drive {activeDrive}:</Text>

            {/* Top separator */}
            <Text color={FOCUS_BACKGROUND} backgroundColor={theme.accent.background}>
                {'▄'.repeat(SEPARATOR_WIDTH)}
            </Text>

            {/* File browser */}
            <Box flexDirection="column" backgroundColor={FOCUS_BACKGROUND} paddingX={1}>
                <FileBrowser
                    initialPath={initialPath}
                    theme={theme}
                    onSelectDisk={onSelectDisk}
                    onCancel={onCancel}
                    isFocused={true}
                />
            </Box>

            {/* Bottom separator */}
            <Text color={FOCUS_BACKGROUND} backgroundColor={theme.accent.background}>
                {'▀'.repeat(SEPARATOR_WIDTH)}
            </Text>

            {/* Footer hints */}
            <Box gap={2}>
                <HotkeyButton hotkey="Enter" label="Open" enabled={true} theme={theme} />
                <HotkeyButton hotkey="↑↓" label="Navigate" enabled={true} theme={theme} />
                <HotkeyButton hotkey="Esc" label="Back" enabled={true} theme={theme} />
            </Box>
        </>
    );
}
