/**
 * Create disk view with directory selection.
 *
 * Combines filename input with directory browser for selecting
 * save location. Tab toggles focus between input and browser.
 * Uses inverse video (background color) to indicate focus.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Theme, HotkeyButton, FileBrowser } from '../../common/index.js';
import { isValidFilenameChar, FILENAME_MAX_LENGTH } from '../../../utils/filename-validation.js';
import {
    SEPARATOR_WIDTH,
    FOCUS_BACKGROUND,
    BLUR_BACKGROUND,
    BROWSER_MAX_ROWS,
} from './constants.js';

// Session-persistent path for create disk operations
let lastCreatePath: string | null = null;

type FocusMode = 'input' | 'browser';

export interface CreateDiskViewProps {
    /** Theme for colors */
    theme: Theme;
    /** Currently active drive (1 or 2) */
    activeDrive: 1 | 2;
    /** Initial directory path */
    initialPath: string;
    /** Validation error message to display */
    error?: string | null;
    /** Called when user submits with filename and directory */
    onSubmit: (filename: string, directory: string) => void;
    /** Called when user cancels */
    onCancel: () => void;
}

/**
 * Create disk view with filename input and directory browser.
 *
 * Focus modes:
 * - 'input': Typing in filename field (Tab → browser)
 * - 'browser': Navigating directories (Tab → input)
 *
 * The focused section is indicated by inverse video (background color).
 */
export function CreateDiskView({
    theme,
    activeDrive,
    initialPath,
    error,
    onSubmit,
    onCancel,
}: CreateDiskViewProps): React.ReactElement {
    // Use session-persistent path if available
    const startPath = lastCreatePath ?? initialPath;

    const [focusMode, setFocusMode] = useState<FocusMode>('input');
    const [filename, setFilename] = useState('');
    const [currentPath, setCurrentPath] = useState(startPath);

    // Handle path changes from FileBrowser
    const handlePathChange = useCallback((path: string) => {
        setCurrentPath(path);
        lastCreatePath = path;
    }, []);

    // Handle keyboard input when in input mode
    useInput(
        (input, key) => {
            if (focusMode !== 'input') return;

            if (key.escape) {
                onCancel();
                return;
            }

            if (key.tab) {
                setFocusMode('browser');
                return;
            }

            if (key.return) {
                onSubmit(filename, currentPath);
                return;
            }

            if (key.backspace || key.delete) {
                setFilename((prev) => prev.slice(0, -1));
                return;
            }

            // Only allow valid filename characters, enforce max length
            if (isValidFilenameChar(input)) {
                setFilename((prev) => (prev.length < FILENAME_MAX_LENGTH ? prev + input : prev));
            }
        },
        { isActive: focusMode === 'input' },
    );

    // Handle Tab key when in browser mode (to switch back to input)
    useInput(
        (input, key) => {
            if (focusMode !== 'browser') return;

            if (key.tab) {
                setFocusMode('input');
            }
        },
        { isActive: focusMode === 'browser' },
    );

    // Pre-compute focus-dependent styles
    const inputFocused = focusMode === 'input';
    const browserFocused = focusMode === 'browser';

    // Section backgrounds based on focus
    const inputBackground = inputFocused ? FOCUS_BACKGROUND : BLUR_BACKGROUND;
    const browserBackground = browserFocused ? FOCUS_BACKGROUND : BLUR_BACKGROUND;

    // Text colors based on input focus state
    const labelColor = inputFocused ? theme.accent.descColor : theme.status.dimColor;
    const filenameColor = inputFocused ? theme.accent.keyColor : theme.accent.secondaryKeyColor;
    const errorColor = inputFocused ? theme.error : theme.status.dimColor;

    // Footer labels change based on focus
    const tabLabel = inputFocused ? 'Browse' : 'Filename';
    const enterLabel = inputFocused ? 'Create disk' : 'Open directory';

    return (
        <Box flexDirection="column">
            {/* Header */}
            <Text color={theme.accent.descColor}>Create blank disk for Drive {activeDrive}:</Text>

            {/* Filename section with half-block separators */}
            <Text color={inputBackground} backgroundColor={theme.accent.background}>
                {'▄'.repeat(SEPARATOR_WIDTH)}
            </Text>
            <Box flexDirection="column" backgroundColor={inputBackground} paddingX={1}>
                <Box>
                    <Text color={labelColor}>Filename: </Text>
                    <Text color={filenameColor}>{filename}</Text>
                    {inputFocused && <Text color={theme.accent.keyColor}>█</Text>}
                </Box>
                <Box>
                    <Text color={errorColor}>{error || ' '}</Text>
                </Box>
            </Box>
            <Text color={inputBackground} backgroundColor={theme.accent.background}>
                {'▀'.repeat(SEPARATOR_WIDTH)}
            </Text>

            {/* Browser section with half-block separators */}
            <Text color={browserBackground} backgroundColor={theme.accent.background}>
                {'▄'.repeat(SEPARATOR_WIDTH)}
            </Text>
            <Box flexDirection="column" backgroundColor={browserBackground} paddingX={1}>
                <FileBrowser
                    initialPath={currentPath}
                    theme={theme}
                    mode="directory"
                    onPathChange={handlePathChange}
                    onCancel={onCancel}
                    isFocused={browserFocused}
                    maxRows={BROWSER_MAX_ROWS}
                />
            </Box>
            <Text color={browserBackground} backgroundColor={theme.accent.background}>
                {'▀'.repeat(SEPARATOR_WIDTH)}
            </Text>

            {/* Footer hints */}
            <Box gap={2}>
                <HotkeyButton hotkey="Enter" label={enterLabel} enabled={true} theme={theme} />
                {browserFocused ? (
                    <HotkeyButton hotkey="↑↓" label="Navigate" enabled={true} theme={theme} />
                ) : undefined}
                <HotkeyButton hotkey="Tab" label={tabLabel} enabled={true} theme={theme} />
                <HotkeyButton hotkey="Esc" label="Cancel" enabled={true} theme={theme} />
            </Box>
        </Box>
    );
}
