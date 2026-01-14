/**
 * Terminal size error component.
 *
 * Displayed when the terminal is too small to render the emulator.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme } from './common/index.js';
import { TerminalSize } from '../hooks/use-terminal-size.js';

export interface TerminalTooSmallProps {
    /** Current terminal dimensions */
    currentSize: TerminalSize;
    /** Required minimum dimensions */
    requiredSize: TerminalSize;
    /** Theme for styling */
    theme: Theme;
}

/**
 * Error screen shown when terminal is too small.
 */
export function TerminalTooSmall({
    currentSize,
    requiredSize,
    theme,
}: TerminalTooSmallProps): React.ReactElement {
    return (
        <Box flexDirection="column" padding={1}>
            <Text color={theme.error} bold>
                Terminal Too Small
            </Text>
            <Text>
                Snapple ][ requires at least {requiredSize.columns}×{requiredSize.rows} characters.
            </Text>
            <Text>
                Current size: {currentSize.columns}×{currentSize.rows}
            </Text>
            <Text dimColor>Please resize your terminal and try again.</Text>
        </Box>
    );
}
