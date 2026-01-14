/**
 * Disk drive visual component for the disk manager dialog.
 *
 * Renders a 3-row disk drive shape using Unicode block characters (█▀▄).
 * Shows drive number, disk name, modified indicator, and write status.
 * Selected drives render brighter; inactive drives are dimmed.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme } from './theme.js';

/** Total width of the disk drive component */
const DISK_WIDTH = 62;
/** Width of content area (inside the █ borders) */
const CONTENT_WIDTH = DISK_WIDTH - 2;

export interface DiskDriveProps {
    /** Drive number (1 or 2) */
    driveNum: 1 | 2;
    /** Disk filename or null if no disk loaded */
    diskName: string | null;
    /** Whether this is the currently selected/active drive */
    active: boolean;
    /** Whether the disk has unsaved changes */
    dirty: boolean;
    /** Whether writes are allowed */
    writable: boolean;
    /** Theme for color lookups */
    theme: Theme;
}

/**
 * Renders a disk drive visual component.
 *
 * Uses nested Text elements to avoid Ink's inter-element spacing bug
 * (same technique as DiskPill).
 */
export function DiskDrive({
    driveNum,
    diskName,
    active,
    dirty,
    writable,
    theme,
}: DiskDriveProps): React.ReactElement {
    // Colors based on active state
    const borderColor = active ? theme.status.foreground : theme.status.dimColor;
    const textColor = active ? theme.accent.descColor : theme.status.dimColor;
    const nameColor = diskName ? textColor : theme.status.dimColor;
    const dirtyColor = theme.status.paused; // Orange/amber for unsaved changes
    const protectBgColor = writable ? theme.status.running : theme.status.paused;
    const interiorBg = theme.accent.darkShade;

    // Build content elements
    // Note: 💾 emoji takes 2 terminal columns but 1 JS char
    // " 💾 D1  " = 7 JS chars, 8 terminal columns
    const prefix = ` 💾 D${driveNum}  `;
    const displayName = diskName ?? '[EMPTY]';

    // Status section: "◖MOD◗ ◖RW◗ " or "      ◖RW◗ " or 11 spaces
    // Empty drives don't show dirty or write status
    const hasDisk = diskName !== null;
    const showDirty = dirty && hasDisk;
    const writeLabel = writable ? 'RW' : 'WP';

    // Calculate available width for disk name
    // Content width: 60 terminal columns
    // Prefix: 8 terminal columns (7 JS chars + 1 for emoji width)
    // Status: 12 chars (" ◖MOD◗ ◖RW◗ " or "       ◖RW◗ " or 12 spaces)
    // Name area: 60 - 8 - 12 = 40 terminal columns
    const NAME_WIDTH = 40;

    // Truncate or pad the name to fill available space
    const truncatedName =
        displayName.length > NAME_WIDTH
            ? displayName.slice(0, NAME_WIDTH - 1) + '…'
            : displayName.padEnd(NAME_WIDTH);

    // Build the three rows
    const topEdge = '▀'.repeat(CONTENT_WIDTH);
    const bottomEdge = '▄'.repeat(CONTENT_WIDTH);

    // prettier-ignore
    return (
        <Box flexDirection="column">
            {/* Top row: █▀▀▀...▀▀▀█ - interior bg shows in bottom half of ▀ */}
            <Text color={borderColor}>█<Text color={borderColor} backgroundColor={interiorBg}>{topEdge}</Text>█</Text>

            {/* Content row - dark interior background */}
            <Text color={borderColor}>█
                <Text color={textColor} backgroundColor={interiorBg}>{prefix}
                    <Text color={nameColor} backgroundColor={interiorBg}>{truncatedName}
                        {/* Status badges */}
                        {showDirty ? (
                            <Text color={textColor} backgroundColor={interiorBg}>{' '}
                                <Text color={dirtyColor} backgroundColor={interiorBg}>◖
                                <Text backgroundColor={dirtyColor} color={theme.status.inverseText}>MOD
                                    <Text color={dirtyColor} backgroundColor={interiorBg}>◗
                                        <Text color={textColor} backgroundColor={interiorBg}>{' '}
                                            {/* Write pill: ◖RW◗ */}
                                        <Text color={protectBgColor} backgroundColor={interiorBg}>◖
                                            <Text backgroundColor={protectBgColor} color={theme.status.inverseText}>{writeLabel}
                                                <Text color={protectBgColor} backgroundColor={interiorBg}>◗
                                                    <Text color={textColor} backgroundColor={interiorBg}>{' '}
                                                        <Text color={borderColor}>█</Text>
                                                    </Text>
                                                </Text>
                                            </Text>
                                        </Text>
                                        </Text>
                                    </Text>
                                </Text>
                            </Text>
                            </Text>
                        ) : hasDisk ? (
                            <Text color={textColor} backgroundColor={interiorBg}>{'       '}
                                {/* Write pill only: ◖RW◗ */}
                                <Text color={protectBgColor} backgroundColor={interiorBg}>◖
                                    <Text backgroundColor={protectBgColor} color={theme.status.inverseText}>{writeLabel}
                                        <Text color={protectBgColor} backgroundColor={interiorBg}>◗
                                            <Text color={textColor} backgroundColor={interiorBg}>{' '}
                                                <Text color={borderColor}>█</Text>
                                            </Text>
                                        </Text>
                                    </Text>
                                </Text>
                            </Text>
                        ) : (
                            <Text color={textColor} backgroundColor={interiorBg}>{'            '}
                                <Text color={borderColor}>█</Text>
                            </Text>
                        )}
                    </Text>
                </Text>
            </Text>

            {/* Bottom row: █▄▄▄...▄▄▄█ - interior bg shows in top half of ▄ */}
            <Text color={borderColor}>█<Text color={borderColor} backgroundColor={interiorBg}>{bottomEdge}</Text>█</Text>
        </Box>
    );
}
