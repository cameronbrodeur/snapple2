/**
 * File browser component for disk dialog.
 *
 * Displays directory listing with keyboard navigation.
 * Filters to show only directories and supported disk formats.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Theme } from './index.js';
import { readDiskDirectory, FileEntry, truncateWithEllipsis } from '../../utils/file-system.js';
import * as path from 'path';

/** Max characters for path display before truncation */
const PATH_MAX_LENGTH = 60;
/** Max characters for filename display before truncation */
const FILENAME_MAX_LENGTH = 57;
/** Width of separator lines */
const SEPARATOR_WIDTH = 66;

// Remember last visited directory during session
let lastVisitedPath: string | null = null;

// Track last search for type-to-jump cycling
let lastSearchChar: string | null = null;
let lastSearchIndex: number = -1;

// Find next matching file for type-to-jump, cycling through matches on repeated presses
function findNextMatch(files: FileEntry[], char: string): number {
    const searchChar = char.toLowerCase();
    const isSameSearch = searchChar === lastSearchChar;
    const startFrom = isSameSearch ? lastSearchIndex + 1 : 0;

    for (let i = 0; i < files.length; i++) {
        const idx = (startFrom + i) % files.length;
        if (files[idx].name.toLowerCase().startsWith(searchChar)) {
            lastSearchChar = searchChar;
            lastSearchIndex = idx;
            return idx;
        }
    }
    return -1;
}

// Reset search state when directory changes
function resetSearchState(): void {
    lastSearchChar = null;
    lastSearchIndex = -1;
}

/** Browser mode determines what can be selected */
export type FileBrowserMode = 'load' | 'directory';

export interface FileBrowserProps {
    /** Starting directory path */
    initialPath: string;
    /** Theme for colors */
    theme: Theme;
    /** Browser mode: 'load' shows disk files, 'directory' shows only directories */
    mode?: FileBrowserMode;
    /** Called when a disk file is selected (mode='load' only) */
    onSelectDisk?: (filePath: string) => void;
    /** Called when a directory is selected (mode='directory' only) */
    onSelectDirectory?: (dirPath: string) => void;
    /** Called when the current path changes (for parent to track) */
    onPathChange?: (path: string) => void;
    /** Called when user presses ESC */
    onCancel: () => void;
    /** Whether this component has focus */
    isFocused: boolean;
    /** Maximum visible rows */
    maxRows?: number;
}

/**
 * File browser with keyboard navigation for selecting disk images.
 *
 * Supports directory traversal, type-to-jump search, and remembers
 * last visited path during the session.
 */
export function FileBrowser({
    initialPath,
    theme,
    mode = 'load',
    onSelectDisk,
    onSelectDirectory,
    onPathChange,
    onCancel,
    isFocused,
    maxRows = 10,
}: FileBrowserProps): React.ReactElement {
    // Use last visited path if available, otherwise use initialPath
    const startPath = lastVisitedPath ?? initialPath;
    const [currentPath, setCurrentPath] = useState(startPath);
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Update last visited path and notify parent whenever currentPath changes
    useEffect(() => {
        lastVisitedPath = currentPath;
        onPathChange?.(currentPath);
    }, [currentPath, onPathChange]);

    // Load directory contents
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        resetSearchState();
        readDiskDirectory(currentPath, { directoriesOnly: mode === 'directory' })
            .then((entries) => {
                if (!cancelled) {
                    setFiles(entries);
                    setSelectedIndex(0);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [currentPath, mode]);

    // Handle keyboard input
    useInput(
        (input, key) => {
            if (!isFocused) return;

            if (key.upArrow) {
                setSelectedIndex((prev) => Math.max(0, prev - 1));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => Math.min(files.length - 1, prev + 1));
            } else if (key.pageUp) {
                // Page up: move up by maxRows, but stay in bounds
                setSelectedIndex((prev) => Math.max(0, prev - maxRows));
            } else if (key.pageDown) {
                // Page down: move down by maxRows, but stay in bounds
                setSelectedIndex((prev) => Math.min(files.length - 1, prev + maxRows));
            } else if (key.ctrl && input === 'a') {
                // Ctrl+A: jump to first item
                setSelectedIndex(0);
            } else if (key.ctrl && input === 'e') {
                // Ctrl+E: jump to last item
                setSelectedIndex(Math.max(0, files.length - 1));
            } else if (key.return) {
                if (files.length === 0) return;
                const selected = files[selectedIndex];
                if (selected) {
                    if (selected.isDirectory) {
                        const newPath =
                            selected.name === '..'
                                ? path.dirname(currentPath)
                                : path.join(currentPath, selected.name);
                        setCurrentPath(newPath);
                    } else if (mode === 'load' && onSelectDisk) {
                        // In load mode, select disk file
                        onSelectDisk(path.join(currentPath, selected.name));
                    }
                    // In directory mode, files are not shown so this branch won't execute
                }
            } else if (key.escape) {
                // Go up a directory, or cancel if at initial path
                if (currentPath !== initialPath) {
                    setCurrentPath(path.dirname(currentPath));
                } else {
                    onCancel();
                }
            } else if (input && input.length === 1 && /[a-zA-Z0-9]/.test(input)) {
                const matchIndex = findNextMatch(files, input);
                if (matchIndex !== -1) {
                    setSelectedIndex(matchIndex);
                }
            }
        },
        { isActive: isFocused },
    );

    // Calculate scroll window
    const scrollOffset = Math.max(0, selectedIndex - maxRows + 3);
    const visibleFiles = files.slice(scrollOffset, scrollOffset + maxRows);
    const showScrollUp = scrollOffset > 0;
    const showScrollDown = scrollOffset + maxRows < files.length;
    const itemsAbove = scrollOffset;
    const itemsBelow = Math.max(0, files.length - scrollOffset - maxRows);

    if (loading) {
        return (
            <Box flexDirection="column">
                <Text color={theme.accent.descColor}>Loading...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box flexDirection="column">
                <Text color={theme.status.paused}>Error: {error}</Text>
            </Box>
        );
    }

    // Truncate path to prevent line wrapping (content area ~54 chars, "📂 " uses 2)
    const displayPath =
        currentPath.length > PATH_MAX_LENGTH
            ? '…' + currentPath.slice(-PATH_MAX_LENGTH + 1)
            : currentPath;

    // Colors based on focus state - dim when unfocused
    const pathColor = isFocused ? theme.accent.keyColor : theme.accent.secondaryKeyColor;
    const selectedColor = isFocused ? theme.accent.keyColor : theme.status.dimColor;
    const normalColor = isFocused ? theme.accent.descColor : theme.status.dimColor;
    const separatorColor = theme.status.dimColor;

    // Build fixed-height structure: always render same number of lines
    // This ensures consistent dialog height regardless of scroll state
    const fileLines: React.ReactNode[] = [];
    for (let i = 0; i < maxRows; i++) {
        const file = visibleFiles[i];
        if (file) {
            const actualIndex = scrollOffset + i;
            const isSelected = actualIndex === selectedIndex;
            const icon = file.isDirectory ? '📁' : '💾';
            const displayName = truncateWithEllipsis(file.name, FILENAME_MAX_LENGTH);
            fileLines.push(
                <Text
                    key={i}
                    color={isSelected ? selectedColor : normalColor}
                    dimColor={!isFocused}
                >
                    {isSelected ? '▶' : ' '} {icon} {displayName}
                </Text>,
            );
        } else if (files.length === 0 && i === 0) {
            // Empty state on first line only
            const emptyMessage =
                mode === 'directory' ? 'No subdirectories' : 'No disk images found';
            fileLines.push(
                <Text key={i} color={normalColor} dimColor>
                    {emptyMessage}
                </Text>,
            );
        } else {
            // Padding line to maintain height
            fileLines.push(<Text key={i}> </Text>);
        }
    }

    // Build separator line with optional indicator
    const topIndicator = showScrollUp ? ` ▲ ${itemsAbove} more` : '';
    const topLineChars = SEPARATOR_WIDTH - topIndicator.length;
    const topLine = '─'.repeat(Math.max(0, topLineChars));

    const bottomIndicator = showScrollDown ? ` ▼ ${itemsBelow} more` : '';
    const bottomLineChars = SEPARATOR_WIDTH - bottomIndicator.length;
    const bottomLine = '─'.repeat(Math.max(0, bottomLineChars));

    return (
        <Box flexDirection="column">
            {/* Path header with folder icon */}
            <Text color={pathColor} bold={isFocused} dimColor={!isFocused}>
                📂 {displayPath}
            </Text>

            {/* Top separator with scroll indicator */}
            <Text>
                <Text color={separatorColor} dimColor>
                    {topLine}
                </Text>
                <Text color={normalColor} dimColor={!isFocused}>
                    {topIndicator}
                </Text>
            </Text>

            {/* File list - always maxRows lines */}
            <Box flexDirection="column">{fileLines}</Box>

            {/* Bottom separator with scroll indicator */}
            <Text>
                <Text color={separatorColor} dimColor>
                    {bottomLine}
                </Text>
                <Text color={normalColor} dimColor={!isFocused}>
                    {bottomIndicator}
                </Text>
            </Text>
        </Box>
    );
}
