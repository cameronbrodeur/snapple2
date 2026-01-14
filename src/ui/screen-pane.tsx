/**
 * ScreenPane Component
 *
 * Renders the Apple II video buffer with border.
 * Adapts to buffer dimensions (40×24 text mode or 140×96 hi-res mode).
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TerminalBuffer } from '../emulator/types.js';
import { Theme } from './common/index.js';

export interface ScreenPaneProps {
    buffer: TerminalBuffer;
    theme: Theme;
    /** Flash counter for cursor blink - forces re-render when flash state changes */
    flashCounter: number;
}

/**
 * Custom comparison function for React.memo.
 *
 * Only re-render if the buffer content, theme, or flash state has changed.
 *
 * Flash counter is checked first to ensure cursor blink always triggers
 * re-render. Buffer comparison uses pointer equality for cells since
 * half-block.ts caches all ANSI strings.
 */
function areEqual(prevProps: ScreenPaneProps, nextProps: ScreenPaneProps): boolean {
    // Flash counter forces re-render for cursor blink
    if (prevProps.flashCounter !== nextProps.flashCounter) {
        return false;
    }

    if (prevProps.theme !== nextProps.theme) {
        return false;
    }

    // Same buffer reference means no change
    if (prevProps.buffer === nextProps.buffer) {
        return true;
    }

    // Check dimensions
    const prevRows = prevProps.buffer.length;
    const nextRows = nextProps.buffer.length;
    if (prevRows !== nextRows) return false;
    if (prevRows === 0) return true;

    const prevCols = prevProps.buffer[0].length;
    const nextCols = nextProps.buffer[0].length;
    if (prevCols !== nextCols) return false;

    // Compare buffer content cell by cell
    for (let row = 0; row < prevRows; row++) {
        const prevRow = prevProps.buffer[row];
        const nextRow = nextProps.buffer[row];
        for (let col = 0; col < prevCols; col++) {
            if (prevRow[col] !== nextRow[col]) {
                return false;
            }
        }
    }

    return true;
}

/**
 * ScreenPane component (optimized with React.memo).
 *
 * Displays the video buffer with a themed border.
 * Adapts to buffer dimensions (40×24 text or 140×96 hi-res).
 *
 * Uses React.memo with custom comparison to only re-render
 * when the buffer content actually changes.
 */
export const ScreenPane = React.memo(function ScreenPane({
    buffer,
    theme,
    flashCounter: _flashCounter,
}: ScreenPaneProps) {
    // Calculate width from buffer: columns + 2 padding + 2 border
    const bufferWidth = buffer[0]?.length ?? 40;
    const boxWidth = bufferWidth + 4;

    return (
        <Box
            flexDirection="column"
            borderStyle={theme.screen.borderStyle}
            borderColor={theme.screen.borderColor}
            paddingX={1}
            width={boxWidth}
        >
            {buffer.map((row, index) => (
                <Text
                    key={index}
                    color={theme.screen.foreground}
                    backgroundColor={theme.screen.background}
                >
                    {row.join('')}
                </Text>
            ))}
        </Box>
    );
}, areEqual);
