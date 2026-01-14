#!/usr/bin/env tsx
/**
 * Test DSK Boot
 *
 * Tests if a DSK file can boot by converting it and checking initial boot sequence.
 */

import { readFile } from 'fs/promises';
import { Apple2Machine } from '../src/emulator/apple2-machine.js';
import { ErrorPolicy } from '../src/emulator/types.js';
import { loadRoms } from '../src/rom/rom-manager.js';
import { convertDskToWoz } from '../src/disk/index.js';
import { toWord } from 'cpu6502/types';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: npx tsx tools/test-dsk-boot.ts <dsk-file>');
        process.exit(1);
    }

    const dskPath = args[0];

    console.log('\n=== DSK Boot Test ===\n');
    console.log(`Testing: ${dskPath}`);

    try {
        // Load ROMs
        console.log('\n1. Loading ROMs...');
        const roms = await loadRoms({});
        console.log('   ✅ ROMs loaded');

        // Load DSK file
        console.log('\n2. Loading DSK file...');
        const dskData = await readFile(dskPath);
        console.log(`   Size: ${dskData.length} bytes`);

        // Convert to WOZ
        console.log('\n3. Converting to WOZ...');
        const wozData = convertDskToWoz(dskData, false); // DOS 3.3 order
        console.log(`   ✅ Converted (${wozData.length} bytes)`);

        // Create machine
        console.log('\n4. Creating Apple II machine...');
        const machine = new Apple2Machine(roms, ErrorPolicy.HALT);
        machine.reboot();
        console.log('   ✅ Machine created');

        // Load disk
        console.log('\n5. Loading disk into drive 1...');
        machine.loadDisk(1, wozData);
        console.log('   ✅ Disk loaded');

        // Run for a bit to see if it boots
        console.log('\n6. Running boot sequence...');
        console.log('   Running 10 million cycles (about 10 seconds at 1MHz)...');

        const startCycles = machine.cycles;
        const targetCycles = 10_000_000;
        for (let i = 0; i < targetCycles; i++) {
            machine.step();

            // Print progress every million cycles
            if (i > 0 && i % 1_000_000 === 0) {
                const pc = machine.pc;
                console.log(
                    `   ${(i / 1_000_000).toFixed(0)}M cycles: PC=$${pc.toString(16).toUpperCase().padStart(4, '0')}`,
                );
            }
        }
        const endCycles = machine.cycles;

        console.log(`   ✅ Ran ${endCycles - startCycles} cycles`);

        // Check video state
        const videoState = machine.videoState;

        console.log('\n7. Checking boot state...');
        console.log(
            `   Video mode: ${videoState.textMode ? 'TEXT' : videoState.hiresMode ? 'HIRES' : 'LORES'}`,
        );
        console.log(`   Mixed mode: ${videoState.mixedMode}`);
        console.log(`   Active page: ${videoState.page2 ? 2 : 1}`);
        console.log(`   PC: $${machine.pc.toString(16).toUpperCase().padStart(4, '0')}`);

        // Get screen text from video memory
        const ram = machine.memory;
        const textPage1Start = 0x0400;

        // Read first few lines to see boot progress
        const lines: string[] = [];
        for (let line = 0; line < 5; line++) {
            let lineText = '';
            const lineStart = textPage1Start + line * 40;

            for (let col = 0; col < 40; col++) {
                const char = ram.read(toWord(lineStart + col)) & 0x7f;
                if (char >= 0x20 && char < 0x7f) {
                    lineText += String.fromCharCode(char);
                } else {
                    lineText += ' ';
                }
            }

            const trimmed = lineText.trim();
            if (trimmed) {
                lines.push(trimmed);
            }
        }

        console.log('\n   Screen content (first few lines):');
        lines.forEach((line, idx) => {
            console.log(`   Line ${idx}: "${line}"`);
        });

        // Check for common boot patterns
        const allText = lines.join(' ');

        if (allText.includes('APPLE ][') || allText.includes('APPLE II')) {
            if (allText.includes(']') || allText.includes('BASIC') || allText.includes('DOS')) {
                console.log('\n   ✅ Boot appears successful - reached BASIC or DOS prompt');
            } else if (lines.length === 1 && lines[0] === 'APPLE ][') {
                console.log('\n   ⚠️ WARNING: Only "APPLE ][" visible - might be hung during boot');
            } else {
                console.log('\n   ✅ Boot in progress');
            }
        } else if (allText.includes('DISK VOLUME')) {
            console.log('\n   ✅ DOS catalog visible - boot successful');
        } else if (allText.includes('SYNTAX ERROR') || allText.includes('ERROR')) {
            console.log('\n   ✅ Boot successful but encountered an error');
        } else if (!allText.trim()) {
            console.log('\n   ⚠️ WARNING: Screen appears blank - possible boot failure');
        } else {
            console.log('\n   ✅ Boot appears to have progressed');
        }

        console.log('\n=== Test Complete ===\n');
    } catch (error) {
        console.error(`\nError: ${error}`);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();
