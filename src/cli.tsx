#!/usr/bin/env node
/**
 * Command-line interface for Snapple ][ emulator.
 *
 * Handles argument parsing, ROM loading, disk image loading (with automatic format
 * conversion), theme selection, and launching the emulator UI.
 */

import React from 'react';
import { render, Text, Box } from 'ink';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoms, verifyRoms, RomLoadError } from './rom/rom-manager.js';
import { detectDiskFormat, convertDskToWoz, isProDOSFormat } from './disk/index.js';
import { InputBlockProvider } from './hooks/use-input-block.js';
import type { Apple2Machine } from './emulator/apple2-machine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI options configuration
const OPTIONS = {
    'roms-dir': {
        type: 'string' as const,
        short: 'r',
        description: 'Directory containing ROM files',
    },
    'verify-roms': {
        type: 'boolean' as const,
        description: 'Verify ROM files and exit',
    },
    disk1: {
        type: 'string' as const,
        description: 'Disk image for drive 1 (.woz, .dsk, .do, .po)',
    },
    disk2: {
        type: 'string' as const,
        description: 'Disk image for drive 2 (.woz, .dsk, .do, .po)',
    },
    'write-protect': {
        type: 'boolean' as const,
        description: 'Force write-protect on loaded disks',
    },
    writable: {
        type: 'boolean' as const,
        description: 'Force disks writable (override protection)',
    },
    theme: {
        type: 'string' as const,
        short: 't',
        description: 'Color theme (green, amber, white)',
    },
    'log-profile': {
        type: 'boolean' as const,
        description: 'Enable detailed profiler logging to /tmp/',
    },
    help: {
        type: 'boolean' as const,
        short: 'h',
        description: 'Show help message',
    },
    version: {
        type: 'boolean' as const,
        short: 'v',
        description: 'Show version number',
    },
} as const;

// Parse command-line arguments
function parseCliArgs() {
    try {
        const { values } = parseArgs({
            options: OPTIONS,
            allowPositionals: false,
        });
        return values;
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
}

// Show help message
function showHelp() {
    console.log(`
Snapple ][ - Apple II Plus Emulator

USAGE:
  snapple [options]

OPTIONS:
  -r, --roms-dir <path>    Directory containing ROM files
      --verify-roms        Verify ROM files and exit
      --disk1 <path>       Disk image for drive 1 (.woz, .dsk, .do, .po)
      --disk2 <path>       Disk image for drive 2 (.woz, .dsk, .do, .po)
      --write-protect      Force write-protect on loaded disks
      --writable           Force disks writable (override protection)
  -t, --theme <name>       Color theme: green (default), amber, white, blue
      --log-profile        Enable detailed profiler logging to /tmp/
  -h, --help               Show this help message
  -v, --version            Show version number

ENVIRONMENT VARIABLES:
  SNAPPLE_ROMS_DIR         Default directory for ROM files

ROM FILES:
  Snapple requires 7 ROM files (all 2KB each):
    - applesoft-d000.bin, applesoft-d800.bin, applesoft-e000.bin
    - applesoft-e800.bin, applesoft-f000.bin
    - monitor-f800.bin, character-rom.bin

  ROM search order:
    1. --roms-dir argument
    2. SNAPPLE_ROMS_DIR environment variable
    3. ./roms/ (current directory)
    4. ~/.snapple2/roms/ (user home)

  See roms/README.md for details on obtaining ROM files.

EXAMPLES:
  # Run with ROMs in default location
  snapple

  # Run with custom ROM directory
  snapple --roms-dir ~/apple2-roms

  # Run with amber theme
  snapple --theme amber

  # Run with a disk image in drive 1
  snapple --disk1 ~/disks/dos33.woz

  # Load a DSK file (auto-converts to WOZ)
  snapple --disk1 ~/disks/game.dsk

  # Run with disks in both drives
  snapple --disk1 ~/disks/dos33.woz --disk2 ~/disks/games.dsk

  # Verify ROM files
  snapple --verify-roms

KEYBOARD CONTROLS:
  Emulator Controls (Function Keys):
    F1            Toggle help dialog
    F2            Cycle status bar (Minimal → Full → Profiler → Hidden)
    F3            Pause/Resume emulator
    F4            Disk manager
    F5            Save disk changes to file
    F6            Save emulator state (snapshot)
    F7            Load emulator state (restore)
    F9            Reboot (shows confirmation)
    F10           Quit (shows confirmation if unsaved changes)

  Apple II Keys:
    All keys pass through (uppercase, arrows, ctrl combinations)
    Ctrl+@        BREAK - use instead of Ctrl+C (which kills emulator)

For more information, visit: https://github.com/cameronbrodeur/snapple2
`);
}

// Show version number from package.json
async function showVersion() {
    try {
        // Read version from package.json
        const packageJsonPath = join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        console.log(`Snapple ][ v${packageJson.version}`);
    } catch {
        console.log('Snapple ][ (version unknown)');
    }
}

// Loading screen component shown during ROM loading
function LoadingScreen({ message }: { message: string }) {
    return (
        <Box flexDirection="column" padding={1}>
            <Text color="cyan" bold>
                Snapple ][ - Apple II Plus Emulator
            </Text>
            <Text>{message}</Text>
        </Box>
    );
}

// Error screen component shown when ROM loading fails
function ErrorScreen({ error }: { error: Error }) {
    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
            <Text color="red" bold>
                Error: {error.name}
            </Text>
            <Text>{error.message}</Text>
        </Box>
    );
}

// Success component shown when ROM verification succeeds
function SuccessScreen({ message }: { message: string }) {
    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
            <Text color="green" bold>
                ✔ Success
            </Text>
            <Text>{message}</Text>
        </Box>
    );
}

/**
 * Load a disk image with automatic format conversion.
 *
 * Detects format (.woz, .dsk, .do, .po) and converts DSK/DO/PO to WOZ
 * before loading into the specified drive. Supports write protection
 * control via optional flags.
 *
 * @param machine - Apple2Machine instance
 * @param driveNumber - Drive 1 or 2
 * @param diskPath - Path to disk image file
 * @param writeProtect - Force write protection (overrides file flag)
 * @param writable - Force writable (overrides protection)
 */
async function loadDiskImage(
    machine: Apple2Machine,
    driveNumber: 1 | 2,
    diskPath: string,
    writeProtect?: boolean,
    writable?: boolean,
): Promise<void> {
    try {
        // Detect format
        const format = detectDiskFormat(diskPath);
        if (!format) {
            console.error(`Error: Unknown disk format. Supported: .woz, .dsk, .do, .po`);
            process.exit(1);
        }

        // Read disk file
        const diskData = await readFile(diskPath);

        let wozData: Uint8Array;

        if (format === 'woz') {
            // Already WOZ format
            wozData = diskData;
            console.log(`Loaded disk ${driveNumber}: ${diskPath} (WOZ)`);
        } else {
            // Convert DSK/DO/PO to WOZ
            const isProDOS = isProDOSFormat(diskPath);
            console.log(
                `Converting disk ${driveNumber}: ${diskPath} (${format.toUpperCase()} → WOZ)`,
            );
            console.log(`  Sector order: ${isProDOS ? 'ProDOS' : 'DOS 3.3'}`);

            wozData = convertDskToWoz(diskData, isProDOS);
            console.log(`  ✔ Converted successfully`);
        }

        // Load into machine (pass filepath so F5 save works)
        machine.loadDisk(driveNumber, wozData, diskPath);

        // Apply write protection flags
        if (writeProtect !== undefined || writable !== undefined) {
            const drive = machine.getDrive(driveNumber);
            if (drive) {
                if (writeProtect) {
                    // Force write protection (even if disk is normally writable)
                    drive.setForceWriteProtect(true);
                } else if (writable) {
                    // Override write protection (allow writes to protected disks)
                    drive.setWriteProtectOverride(true);
                }
            }
        }
    } catch (error) {
        console.error(`Failed to load disk ${driveNumber}: ${error}`);
        process.exit(1);
    }
}

// Main application entry point
async function main() {
    const args = parseCliArgs();

    // Handle --help flag
    if (args.help) {
        showHelp();
        process.exit(0);
    }

    // Handle --version flag
    if (args.version) {
        await showVersion();
        process.exit(0);
    }

    // Get ROM directory from CLI args or environment
    const romsDir = args['roms-dir'] ?? process.env.SNAPPLE_ROMS_DIR;

    // Handle --verify-roms flag
    if (args['verify-roms']) {
        const { waitUntilExit } = render(<LoadingScreen message="Verifying ROM files..." />);

        try {
            await verifyRoms({ romsDir });
            const { waitUntilExit: waitSuccess } = render(
                <SuccessScreen message="All ROM files verified successfully." />,
            );
            await waitSuccess();
            process.exit(0);
        } catch (error) {
            const { waitUntilExit: waitError } = render(<ErrorScreen error={error as Error} />);
            await waitError();
            process.exit(1);
        }
    }

    // Load ROMs
    const { waitUntilExit: waitLoading } = render(<LoadingScreen message="Loading ROM files..." />);

    try {
        const roms = await loadRoms({ romsDir });
        waitLoading();

        // Import emulator components
        const { Apple2Machine } = await import('./emulator/apple2-machine.js');
        const { ErrorPolicy } = await import('./emulator/types.js');
        const { EmulatorApp } = await import('./ui/emulator-app.js');
        const { initProfiler } = await import('./utils/profiler.js');
        const { GreenTheme, AmberTheme, WhiteTheme, BlueTheme } =
            await import('./ui/common/index.js');

        // Initialize profiler
        initProfiler();

        // Theme lookup table
        const THEMES = {
            green: GreenTheme,
            amber: AmberTheme,
            white: WhiteTheme,
            blue: BlueTheme,
        } as const;

        // Select theme based on --theme argument
        const themeName = (args.theme ?? 'green').toLowerCase() as keyof typeof THEMES;
        const theme = THEMES[themeName];
        if (!theme) {
            const validThemes = Object.keys(THEMES).join(', ');
            console.error(`Error: Unknown theme '${themeName}'. Available themes: ${validThemes}`);
            process.exit(1);
        }

        // Create Apple II machine
        const machine = new Apple2Machine(roms, ErrorPolicy.LOG_CONTINUE);
        machine.reboot();

        // Load disk images if specified
        if (args['disk1']) {
            await loadDiskImage(
                machine,
                1,
                args['disk1'] as string,
                args['write-protect'],
                args['writable'],
            );
        }

        if (args['disk2']) {
            await loadDiskImage(
                machine,
                2,
                args['disk2'] as string,
                args['write-protect'],
                args['writable'],
            );
        }

        // Enter alternate screen buffer
        process.stdout.write('\x1b[?1049h');

        // Ensure we exit alternate screen buffer on any process termination
        const exitAlternateScreen = () => {
            process.stdout.write('\x1b[?1049l');
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
        };

        // Register cleanup on process exit
        process.on('exit', exitAlternateScreen);

        // Handle SIGTERM for graceful shutdown
        const handleTerminate = () => {
            exitAlternateScreen();
            process.exit(0);
        };

        process.on('SIGTERM', handleTerminate);

        // Start application
        // NOTE: We let Ctrl+C kill the emulator normally (use F10 for clean exit)
        // Use Ctrl+@ to send BREAK ($83) to the Apple II instead
        const { waitUntilExit } = render(
            <InputBlockProvider>
                <EmulatorApp
                    machine={machine}
                    theme={theme}
                    logProfileEnabled={args['log-profile'] ?? false}
                />
            </InputBlockProvider>,
        );

        await waitUntilExit();
        exitAlternateScreen();
        process.exit(0);
    } catch (error) {
        waitLoading();

        const { waitUntilExit: waitError } = render(<ErrorScreen error={error as Error} />);
        await waitError();
        process.exit(1);
    }
}

// Run main function
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
