/**
 * Pill-shaped status indicator components.
 *
 * Renders pill-shaped UI elements with Unicode ◖/◗ caps.
 * Used by StatusBar and HelpDialog for consistent visual styling.
 *
 * Implementation note: The ◗ cap is nested inside the content Text element
 * to avoid Ink's inter-element spacing bug. This nesting requires marginRight
 * compensation of -1 when used in a container.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Palette, Semantic } from '../../shared/colors.js';
import { Theme } from './theme.js';

/**
 * Standard status pill indicator with solid color background.
 */
export interface StatusPillProps {
    /** Text content displayed inside the status pill */
    content: string;
    /** Background color of the status pill (also used for cap color) */
    bgColor: string;
    /** Theme for color lookups */
    theme: Theme;
    /** Right margin (default 2, reduced by 1 internally to compensate for nesting) */
    marginRight?: number;
}

/**
 * Renders a pill-shaped indicator with ◖ and ◗ caps.
 */
export function StatusPill({
    content,
    bgColor,
    theme,
    marginRight = 2,
}: StatusPillProps): React.ReactElement {
    const textColor = theme.status.inverseText;

    // prettier-ignore
    return (
        <Box marginRight={marginRight - 1}>
            <Text backgroundColor={Semantic.background} color={bgColor}>◖</Text>
            <Text backgroundColor={bgColor} color={textColor}>{content}
                <Text backgroundColor={Semantic.background} color={bgColor}>◗</Text>
            </Text>
        </Box>
    );
}

/**
 * Disk status pill for the status bar.
 *
 * Compact format: ◖● D{n} RW ●◗
 * - First ● = activity LED (red when motor on, dim when off)
 * - D{n}: drive number
 * - RW/WP: write status
 * - Second ● = dirty indicator (orange, shown when unsaved changes)
 *
 * Background color indicates active state (bright) vs inactive (dim)
 */
export interface DiskStatusPillProps {
    /** Drive number (1 or 2) */
    driveNum: 1 | 2;
    /** Whether this is the active drive (affects background brightness) */
    active: boolean;
    /** Whether the disk has unsaved changes */
    dirty: boolean;
    /** Whether writes are allowed */
    writable: boolean;
    /** Whether the disk motor is running (activity LED) */
    motorOn: boolean;
    /** Theme for color lookups */
    theme: Theme;
    /** Right margin (default 2) */
    marginRight?: number;
}

/**
 * Renders a disk status pill with color-coded segments.
 */
export function DiskStatusPill({
    driveNum,
    active,
    dirty,
    writable,
    motorOn,
    theme,
    marginRight = 2,
}: DiskStatusPillProps): React.ReactElement {
    const bgColor = active ? theme.status.foreground : theme.status.dimColor;
    const textColor = theme.status.inverseText;
    const protectColor = writable ? theme.status.running : theme.status.paused;
    const dirtyColor = theme.status.paused; // Orange for unsaved changes warning

    // Activity LED: red when motor on, visible gray when off
    const ledChar = motorOn ? '●' : '○';
    const ledColor = motorOn ? Palette.red.bright : Palette.gray.dim;

    // prettier-ignore
    return (
        <Box marginRight={marginRight}>
            <Text backgroundColor={Semantic.background} color={bgColor}>◖</Text>
            <Text backgroundColor={bgColor} color={ledColor}>{ledChar}</Text>
            <Text backgroundColor={bgColor} color={textColor}>{` D${driveNum}`}</Text>
            <Text backgroundColor={bgColor} color={protectColor}>{writable ? ' RW' : ' WP'}</Text>
            <Text backgroundColor={bgColor} color={dirty ? dirtyColor : textColor}>{dirty ? ' ●' : null}</Text>
            <Text backgroundColor={Semantic.background} color={bgColor}>◗</Text>
        </Box>
    );
}

/**
 * Example status pill for help dialog legend.
 *
 * Shows a status pill with description text for demonstrating status indicators.
 */
export interface ExampleStatusPillProps {
    /** Text content inside the status pill */
    content: string;
    /** Background color of the status pill */
    bgColor: string;
    /** Theme for color lookups */
    theme: Theme;
    /** Description text shown after the status pill */
    description: string;
    /** Fixed width for status pill container (for column alignment) */
    width?: number;
}

/**
 * Renders an example status pill with trailing description.
 */
export function ExampleStatusPill({
    content,
    bgColor,
    theme,
    description,
    width = 12,
}: ExampleStatusPillProps): React.ReactElement {
    const textColor = theme.status.inverseText;
    const descColor = theme.accent.descColor;

    // prettier-ignore
    return (
        <Box>
            <Box width={width}>
                <Text backgroundColor={Semantic.background} color={bgColor}>◖</Text>
                <Text backgroundColor={bgColor} color={textColor}>{content}
                    <Text backgroundColor={Semantic.background} color={bgColor}>◗</Text>
                </Text>
            </Box>
            <Text color={descColor}>{description}</Text>
        </Box>
    );
}

/**
 * Example disk status pill for help dialog legend.
 *
 * Shows a disk status pill example with description text.
 */
export interface ExampleDiskStatusPillProps {
    /** Drive number (1 or 2) */
    driveNum: 1 | 2;
    /** Whether to show dirty indicator */
    dirty: boolean;
    /** Whether to show as writable */
    writable: boolean;
    /** Whether to show as active drive */
    active: boolean;
    /** Whether to show motor as running (activity LED) */
    motorOn: boolean;
    /** Description text shown after the status pill */
    description: string;
    /** Theme for color lookups */
    theme: Theme;
    /** Fixed width for status pill container */
    width?: number;
}

/**
 * Renders an example disk status pill with trailing description.
 */
export function ExampleDiskStatusPill({
    driveNum,
    dirty,
    writable,
    active,
    motorOn,
    description,
    theme,
    width = 12,
}: ExampleDiskStatusPillProps): React.ReactElement {
    const bgColor = active ? theme.status.foreground : theme.status.dimColor;
    const textColor = theme.status.inverseText;
    const protectColor = writable ? theme.status.running : theme.status.paused;
    const dirtyColor = theme.status.paused;

    // Activity LED: red when motor on, visible gray when off
    const ledChar = motorOn ? '●' : '○';
    const ledColor = motorOn ? Palette.red.bright : Palette.gray.dim;

    // prettier-ignore
    return (
        <Box>
            <Box width={width}>
                <Text backgroundColor={Semantic.background} color={bgColor}>◖</Text>
                <Text backgroundColor={bgColor} color={ledColor}>{ledChar}</Text>
                <Text backgroundColor={bgColor} color={textColor}>{` D${driveNum}`}</Text>
                <Text backgroundColor={bgColor} color={protectColor}>{writable ? ' RW' : ' WP'}</Text>
                <Text backgroundColor={bgColor} color={dirty ? dirtyColor : textColor}>{dirty ? ' ●' : ''}
                    <Text backgroundColor={Semantic.background} color={bgColor}>◗</Text>
                </Text>
            </Box>
            <Text color={theme.accent.descColor}>{description}</Text>
        </Box>
    );
}
