/**
 * Hotkey button component for keyboard shortcut hints.
 *
 * Displays a keyboard shortcut in [brackets] with a label.
 * Supports enabled/disabled states with appropriate styling.
 */

import React from 'react';
import { Text } from 'ink';
import { Theme } from './theme.js';

export interface HotkeyButtonProps {
    /** The keyboard shortcut to display (e.g., "L", "ESC", "←→") */
    hotkey: string;
    /** Description label shown after the hotkey */
    label: string;
    /** Whether the hotkey is currently available */
    enabled: boolean;
    /** Theme for color lookups */
    theme: Theme;
}

/**
 * Renders a hotkey hint like "[L] Load" with enabled/disabled styling.
 *
 * When enabled: uses theme.help colors (bright)
 * When disabled: uses theme.status.dimColor (grayed out)
 */
export function HotkeyButton({
    hotkey,
    label,
    enabled,
    theme,
}: HotkeyButtonProps): React.ReactElement {
    const color = enabled ? theme.accent.descColor : theme.status.dimColor;
    const keyColor = enabled ? theme.accent.keyColor : theme.status.dimColor;
    return (
        <Text color={color}>
            [<Text color={keyColor}>{hotkey}</Text>] {label}
        </Text>
    );
}
