/**
 * Colored ASCII Logo Component
 *
 * Renders the integrated Snapple ][ logo with rainbow-colored apple
 * and themed text title from final_snapple_logo_v2.txt
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme } from '../common/index.js';
import { Apple, Palette } from '../../shared/colors.js';

// Integrated logo: apple on left, "snapple ][" text on right (11 lines)
// From final_snapple_logo_v2.txt
const LOGO_LINES = [
    '             ⣀⣤      ',
    '           ⣴⣿⣿⣿      ',
    '      ⣀⣀  ⢰⣿⠿⠋⣀⣀     ',
    '   ⣤⣿⣿⣿⣿⣿⣿⣿⣶⣿⣿⣿⣿⣿⣿⣷⣄  ⢀⣤⣤⣤⡀⣀                                     ⠚⢿⣿           ⣤⣤⣤⣤⣤⡀   ⢀⣤⣤⣤⣤⣤',
    '  ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠋  ⣾⡏   ⠘⣿                                      ⢸⣿           ⠛⠛⠛⢻⣿⣿   ⣿⣿⠛⠛⠛⠛',
    ' ⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇   ⢻⣿⣦⣄  ⠉  ⠺⣿⣇⠶⠛⢿⣶   ⣤⣞⠉⠛⣷⡄ ⠒⣿⣿⠖⠛⠻⣶⣄ ⠒⣿⣿⠖⠛⠻⣶⣄  ⢸⣿   ⣠⡾⠋⠙⣷⣄     ⢸⣿⣿   ⣿⣿    ',
    ' ⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧    ⠈⠉⠛⠿⣿⣶⡀  ⣿⡇   ⣿⡇  ⠉⠁ ⣠⣿⣿  ⣿⣿   ⠘⣿⡄ ⣿⣿   ⠘⣿⡄ ⢸⣿  ⣸⣿⣤⣤⣤⣼⣿     ⢸⣿⣿   ⣿⣿    ',
    '  ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄ ⣷     ⣿⡇  ⣿⡇   ⣿⡇ ⢀⣾⠋  ⣿⣿  ⣿⣿   ⢠⣿⠁ ⣿⣿   ⢠⣿⠁ ⢸⣿  ⢸⣿          ⢸⣿⣿   ⣿⣿    ',
    '  ⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ ⡿⠿⣦⣤⣤⡶⠋  ⣤⣿⣷⣤⢠⣤⣿⣧⡄⠈⢿⣷⣤⠖⠻⣿⣤ ⣿⣿⣦⣀⣤⠿⠁  ⣿⣿⣦⣀⣤⠿⠁ ⢠⣼⣿⣦⡀ ⠙⢿⣦⣤⣴⠛     ⢸⣿⣿   ⣿⣿⠀   ',
    '    ⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟                             ⣿⣿       ⣿⣿                    ⣤⣤⣤⣼⣿⣿   ⣿⣿⣤⣤⣤⣤',
    '     ⠈⠛⠛⠛⠉⠉ ⠉⠉⠛⠛⠋                              ⠛⠛⠛⠛     ⠛⠛⠛⠛                   ⠛⠛⠛⠛⠛⠁   ⠈⠛⠛⠛⠛⠛',
];

// Get rainbow color for apple portion based on line index
function getAppleColor(lineIndex: number): string {
    // Lines 0-2: Green (stem)
    if (lineIndex <= 2) return Apple.green;
    // Line 3-4: Yellow (apple top)
    if (lineIndex <= 4) return Apple.yellow;
    // Lines 5-6: Orange (upper apple)
    if (lineIndex <= 6) return Apple.orange;
    // Lines 7: Red (middle apple)
    if (lineIndex <= 7) return Apple.red;
    // Lines 8: Purple (lower apple)
    if (lineIndex <= 8) return Apple.purple;
    // Lines 9-10: Blue (bottom apple)
    return Apple.blue;
}

// Apple graphic boundary - characters 0-19 are apple, 20+ is text/filler
const APPLE_WIDTH = 20;

// Where the "][" bracket portion starts (silver colored)
const BRACKET_START = 79;

export interface LogoProps {
    theme: Theme;
}

/**
 * Renders the Snapple ][ ASCII art logo with rainbow apple.
 */
export function Logo({ theme }: LogoProps) {
    // Render integrated logo with rainbow apple and themed text
    // 11 lines total
    return (
        <Box flexDirection="column" height={11} flexShrink={0} flexGrow={0}>
            {LOGO_LINES.map((line, index) => {
                // Lines 0-2 are apple-only (short lines)
                if (index <= 2) {
                    return (
                        <Text key={index} color={getAppleColor(index)}>
                            {line}
                        </Text>
                    );
                }

                // Lines 3-10: Split into apple + snapple text + ][ brackets
                const applePart = line.slice(0, APPLE_WIDTH);
                const textPart = line.slice(APPLE_WIDTH, BRACKET_START);
                const bracketPart = line.slice(BRACKET_START);

                return (
                    <Text key={index}>
                        <Text color={getAppleColor(index)}>{applePart}</Text>
                        <Text color={theme.accent.titleColor}>{textPart}</Text>
                        <Text color={Palette.silver.base}>{bracketPart}</Text>
                    </Text>
                );
            })}
        </Box>
    );
}
