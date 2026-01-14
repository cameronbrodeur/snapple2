/**
 * Help view for disk manager dialog.
 *
 * Shows keyboard shortcuts and usage instructions.
 * Pure presentation - keyboard handling done by parent.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme } from '../../common/index.js';

/** Fixed widths for two-column layout */
const KEY1_WIDTH = 6;
const DESC1_WIDTH = 24;
const KEY2_WIDTH = 10;

export interface DiskHelpViewProps {
    /** Theme for colors */
    theme: Theme;
}

/** Helper for two-column key/description row */
function HelpRow({
    k1,
    d1,
    k2,
    d2,
    keyColor,
    descColor,
}: {
    k1: string;
    d1: string;
    k2?: string;
    d2?: string;
    keyColor: string;
    descColor: string;
}): React.ReactElement {
    return (
        <Box>
            <Box width={KEY1_WIDTH}>
                <Text color={keyColor}>{k1}</Text>
            </Box>
            <Box width={DESC1_WIDTH}>
                <Text color={descColor}>{d1}</Text>
            </Box>
            {k2 && (
                <>
                    <Box width={KEY2_WIDTH}>
                        <Text color={keyColor}>{k2}</Text>
                    </Box>
                    <Text color={descColor}>{d2}</Text>
                </>
            )}
        </Box>
    );
}

/**
 * Help screen showing disk manager keyboard shortcuts.
 */
export function DiskHelpView({ theme }: DiskHelpViewProps): React.ReactElement {
    const keyColor = theme.accent.keyColor;
    const descColor = theme.accent.descColor;
    const dimColor = theme.status.dimColor;

    return (
        <Box flexDirection="column">
            {/* Main view section */}
            <Text color={descColor}>Main view:</Text>
            <Box marginLeft={2} flexDirection="column">
                <HelpRow
                    k1="L"
                    d1="Load disk…"
                    k2="N"
                    d2="New blank disk…"
                    keyColor={keyColor}
                    descColor={descColor}
                />
                <HelpRow
                    k1="S"
                    d1="Save changes"
                    k2="E"
                    d2="Eject disk…"
                    keyColor={keyColor}
                    descColor={descColor}
                />
                <HelpRow
                    k1="W"
                    d1="Toggle write-protect"
                    k2="Esc"
                    d2="Close"
                    keyColor={keyColor}
                    descColor={descColor}
                />
                <HelpRow
                    k1="↑↓"
                    d1="Switch drive"
                    k2="1/2"
                    d2="Select drive"
                    keyColor={keyColor}
                    descColor={descColor}
                />
            </Box>

            {/* File browser section */}
            <Box marginTop={1}>
                <Text color={descColor}>File browser:</Text>
            </Box>
            <Box marginLeft={2} flexDirection="column">
                <HelpRow
                    k1="↑↓"
                    d1="Move selection"
                    k2="PgUp/PgDn"
                    d2="Page Up / Page Down"
                    keyColor={keyColor}
                    descColor={descColor}
                />
                <HelpRow
                    k1="Enter"
                    d1="Open / Select"
                    k2="Esc"
                    d2="Go up / Cancel"
                    keyColor={keyColor}
                    descColor={descColor}
                />
                <HelpRow k1="a-z" d1="Jump to file" keyColor={keyColor} descColor={descColor} />
            </Box>

            {/* Footer */}
            <Box marginTop={2} justifyContent="center">
                <Text color={dimColor}>Press any key to return</Text>
            </Box>
        </Box>
    );
}
