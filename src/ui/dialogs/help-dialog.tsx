/**
 * Help dialog component.
 *
 * Displays keyboard controls reference and status indicator legend
 * in a centered dialog when F1 is pressed.
 * Supports F1 (help), F2 (status), F3 (pause), F4 (disk manager),
 * F5 (save disk), F6 (snapshot), F7 (restore), F9 (reboot), F10 (quit).
 * Optimized with React.memo to prevent unnecessary re-renders.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Theme, ExampleStatusPill, ExampleDiskStatusPill, HotkeyButton } from '../common/index.js';
import { Logo } from './logo.js';
import { Palette } from '../../shared/colors.js';
import { useBlockAllInputWhileMounted } from '../../hooks/use-input-block.js';

export interface HelpDialogProps {
    visible: boolean;
    theme: Theme;
}

// Column widths for alignment (includes 2-space gap after each column)
const COL1_KEY_WIDTH = 4; // F1, F10
const COL1_DESC_WIDTH = 16; // Toggle help + gap
const COL2_KEY_WIDTH = 12; // Ctrl+letter
const COL2_DESC_WIDTH = 18; // Kills emulator! + gap
const STATUS_PILL_WIDTH = 12; // ◖▶ RUNNING◗

/**
 * Single row in the help table with three columns.
 */
interface HelpRowProps {
    // Column 1: Emulator F-keys
    fKey?: string;
    fDesc?: string;
    // Column 2: Apple II keys
    aKey?: string;
    aDesc?: string;
    aDescDim?: boolean;
    // Column 3: Status indicator (render function for flexibility)
    statusContent?: React.ReactNode;
    theme: Theme;
}

function HelpRow({ fKey, fDesc, aKey, aDesc, aDescDim, statusContent, theme }: HelpRowProps) {
    return (
        <Box>
            {/* Column 1: Emulator F-keys */}
            <Box width={COL1_KEY_WIDTH}>
                {fKey && <Text color={theme.accent.keyColor}>{fKey}</Text>}
            </Box>
            <Box width={COL1_DESC_WIDTH}>
                {fDesc && <Text color={theme.accent.descColor}>{fDesc}</Text>}
            </Box>

            {/* Column 2: Apple II keys */}
            <Box width={COL2_KEY_WIDTH}>
                {aKey && <Text color={theme.accent.keyColor}>{aKey}</Text>}
            </Box>
            <Box width={COL2_DESC_WIDTH}>
                {aDesc && (
                    <Text color={theme.accent.descColor} dimColor={aDescDim}>
                        {aDesc}
                    </Text>
                )}
            </Box>

            {/* Column 3: Status indicator */}
            {statusContent}
        </Box>
    );
}

/**
 * Keyboard controls reference dialog.
 *
 * Displays function keys, Apple II keys, and status indicators
 * in a centered modal. Blocks all input while visible except F1/Esc.
 */
export const HelpDialog = React.memo(function HelpDialog({ visible, theme }: HelpDialogProps) {
    // Block ALL keyboard input (including function keys) while dialog is visible
    // F1 is handled by a dedicated listener in emulator-app to allow closing
    useBlockAllInputWhileMounted(visible);

    if (!visible) {
        return null;
    }

    return (
        <Box
            position="absolute"
            width="100%"
            height="100%"
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
            marginTop={-3}
        >
            <Box
                flexDirection="column"
                borderStyle="round"
                borderColor={theme.accent.borderColor}
                backgroundColor={theme.accent.background}
                paddingX={2}
                paddingY={1}
            >
                {/* Logo component handles its own height (11 lines) */}
                <Logo theme={theme} />

                {/* Row-based three-column layout */}
                <Box flexDirection="column" marginTop={1}>
                    {/* Header row */}
                    <Box marginBottom={1}>
                        <Box width={COL1_KEY_WIDTH + COL1_DESC_WIDTH}>
                            <Text color={theme.accent.keyColor} bold>
                                EMULATOR (F-Keys)
                            </Text>
                        </Box>
                        <Box width={COL2_KEY_WIDTH + COL2_DESC_WIDTH}>
                            <Text color={theme.accent.keyColor} bold>
                                APPLE II KEYS
                            </Text>
                        </Box>
                        <Text color={theme.accent.keyColor} bold>
                            STATUS INDICATORS
                        </Text>
                    </Box>

                    {/* Row 1: F1 / A-Z / RUNNING */}
                    <HelpRow
                        fKey="F1"
                        fDesc="Toggle help"
                        aKey="A-Z, 0-9"
                        aDesc="Regular keys"
                        statusContent={
                            <ExampleStatusPill
                                content="▶ RUNNING"
                                bgColor={theme.status.running}
                                theme={theme}
                                description="CPU executing"
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Row 2: F2 / Arrows / PAUSED */}
                    <HelpRow
                        fKey="F2"
                        fDesc="Cycle status"
                        aKey="Arrows"
                        aDesc="Navigation"
                        statusContent={
                            <ExampleStatusPill
                                content="⏸ PAUSED "
                                bgColor={theme.status.paused}
                                theme={theme}
                                description="CPU halted (F3 resumes)"
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Row 3: F3 / Ctrl+letter / (empty) */}
                    <HelpRow
                        fKey="F3"
                        fDesc="Pause/Resume"
                        aKey="Ctrl+letter"
                        aDesc="Pass through"
                        theme={theme}
                    />

                    {/* Row 4: F4 / Ctrl+@ / D1 WP (motor on) */}
                    <HelpRow
                        fKey="F4"
                        fDesc="Disk manager"
                        aKey="Ctrl+@"
                        aDesc="BREAK"
                        statusContent={
                            <ExampleDiskStatusPill
                                driveNum={1}
                                dirty={false}
                                writable={false}
                                active={true}
                                motorOn={true}
                                description="Motor on (●), write-protected"
                                theme={theme}
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Row 5: F5 / Ctrl+C / D2 RW with dirty indicator */}
                    <HelpRow
                        fKey="F5"
                        fDesc="Save disk"
                        aDesc="Kills emulator!"
                        aKey="Ctrl+C"
                        aDescDim={true}
                        statusContent={
                            <ExampleDiskStatusPill
                                driveNum={2}
                                dirty={true}
                                writable={true}
                                active={false}
                                motorOn={false}
                                description="Motor off (○), unsaved (●)"
                                theme={theme}
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Blank row to separate disk status from video mode pills */}
                    <HelpRow fKey="F6" fDesc="Snapshot" theme={theme} />

                    {/* Row 7: F7 / (empty) / Text */}
                    <HelpRow
                        fKey="F7"
                        fDesc="Restore"
                        statusContent={
                            <ExampleStatusPill
                                content="Text  P1"
                                bgColor={Palette.gray.base}
                                theme={theme}
                                description="40×24 text mode"
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Row 8: F9 / (empty) / Mixed */}
                    <HelpRow
                        fKey="F9"
                        fDesc="Reboot"
                        statusContent={
                            <ExampleStatusPill
                                content="Mixed P1"
                                bgColor={Palette.yellow.bright}
                                theme={theme}
                                description="Graphics + 4 text rows"
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Row 9: F10 / (empty) / LoRes */}
                    <HelpRow
                        fKey="F10"
                        fDesc="Quit"
                        statusContent={
                            <ExampleStatusPill
                                content="LoRes P2"
                                bgColor={Palette.teal.bright}
                                theme={theme}
                                description="40×48 lo-res graphics"
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />

                    {/* Row 10: (empty) / (empty) / HiRes */}
                    <HelpRow
                        statusContent={
                            <ExampleStatusPill
                                content="HiRes P1"
                                bgColor={Palette.blue.bright}
                                theme={theme}
                                description="280×192 hi-res graphics"
                                width={STATUS_PILL_WIDTH}
                            />
                        }
                        theme={theme}
                    />
                </Box>

                {/* Footer */}
                <Box marginTop={1}>
                    <HotkeyButton hotkey="Esc" label="Close" enabled={true} theme={theme} />
                </Box>
            </Box>
        </Box>
    );
});
