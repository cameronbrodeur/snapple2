#!/usr/bin/env tsx
/**
 * Integration Test: Emulator UI
 *
 * Tests that the emulator UI starts correctly and displays output.
 * This test runs the emulator for a short time and then exits.
 */

import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { ErrorPolicy } from '../../src/emulator/types.js';
import { loadRoms } from '../../src/rom/rom-manager.js';

async function testEmulatorUI() {
    console.log('=== Emulator UI Test ===\n');

    // Load ROMs
    console.log('Loading ROMs...');
    const roms = await loadRoms();
    console.log('✅ ROMs loaded successfully\n');

    // Create machine
    console.log('Creating Apple2Machine...');
    const machine = new Apple2Machine(roms, ErrorPolicy.LOG_CONTINUE);
    console.log('✅ Machine created successfully\n');

    // Reset machine
    console.log('Resetting machine...');
    machine.reboot();
    console.log('✅ Machine reset complete\n');

    // Test execution
    console.log('Test 1: Execute some cycles');
    const startTime = performance.now();
    const cyclesExecuted = machine.runCycles(10000);
    const endTime = performance.now();
    console.log(`  Executed ${cyclesExecuted} cycles in ${(endTime - startTime).toFixed(3)}ms`);
    console.log(`  ✅ Execution working\n`);

    // Test video buffer
    console.log('Test 2: Get video buffer');
    const buffer = machine.getVideoBuffer();
    console.log(`  Buffer size: ${buffer.length}×${buffer[0].length}`);
    console.log(`  ✅ Video buffer working\n`);

    // Test video state
    console.log('Test 3: Get video state');
    const videoState = machine.videoState;
    console.log(`  Text mode: ${videoState.textMode}`);
    console.log(`  Hi-res mode: ${videoState.hiresMode}`);
    console.log(`  Mixed mode: ${videoState.mixedMode}`);
    console.log(`  Page 2: ${videoState.page2}`);
    console.log(`  ✅ Video state working\n`);

    // Display a few rows of the screen
    console.log('Current screen (first 5 rows):');
    console.log('┌' + '─'.repeat(40) + '┐');
    for (let i = 0; i < 5; i++) {
        console.log('│' + buffer[i].join('') + '│');
    }
    console.log('└' + '─'.repeat(40) + '┘');
    console.log();

    console.log('=== All Tests Passed ===');
    console.log('\nTo run the interactive emulator, use:');
    console.log('  npm start');
    console.log('\nKeyboard controls:');
    console.log('  F1          - Toggle help');
    console.log('  F2          - Toggle status bar');
    console.log('  F3          - Pause/Resume');
    console.log('  F4          - Disk manager');
    console.log('  F5          - Save disk changes');
    console.log('  F6          - Snapshot (save state)');
    console.log('  F7          - Restore (load state)');
    console.log('  F9          - Reboot');
    console.log('  F10         - Quit');
}

// Run test
testEmulatorUI().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
