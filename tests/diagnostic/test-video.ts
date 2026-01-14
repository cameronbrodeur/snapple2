#!/usr/bin/env tsx
/**
 * Integration Test: Video System
 *
 * Tests that the video system correctly renders text from memory.
 */

import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { ErrorPolicy } from '../../src/emulator/types.js';
import { loadRoms } from '../../src/rom/rom-manager.js';

async function testVideoRendering() {
    console.log('=== Video System Integration Test ===\n');

    // Load ROMs
    console.log('Loading ROMs...');
    const roms = await loadRoms();
    console.log('✅ ROMs loaded successfully\n');

    // Create machine
    console.log('Creating Apple2Machine...');
    const machine = new Apple2Machine(roms, ErrorPolicy.HALT);
    console.log('✅ Machine created successfully\n');

    // Reset machine
    console.log('Resetting machine...');
    machine.reboot();
    console.log('✅ Machine reset complete\n');

    // Test 1: Verify empty buffer
    console.log('Test 1: Empty buffer rendering');
    let buffer = machine.getVideoBuffer();
    console.log(`  Buffer size: ${buffer.length}×${buffer[0].length}`);

    // Count non-space characters
    let nonSpaceCount = 0;
    for (const row of buffer) {
        for (const char of row) {
            if (char !== ' ' && char !== '@') {
                nonSpaceCount++;
            }
        }
    }
    console.log(`  Non-placeholder chars: ${nonSpaceCount}`);

    if (nonSpaceCount > 0) {
        console.log('  ⚠️ Warning: Expected mostly empty buffer');
    } else {
        console.log('  ✅ Buffer is empty as expected');
    }
    console.log();

    // Test 2: Write test pattern to text page 1
    console.log('Test 2: Writing test pattern to text page 1');

    // Get RAM device to write to memory
    const { toWord, toByte } = await import('cpu6502/types');
    const ram = machine.memory;

    // Write "HELLO WORLD" to row 0 (address $0400)
    // Using normal ASCII codes ($C8 = H, $C5 = E, etc.)
    const message = 'HELLO WORLD';
    const codes = [
        0xc8,
        0xc5,
        0xcc,
        0xcc,
        0xcf, // HELLO
        0xa0, // space
        0xd7,
        0xcf,
        0xd2,
        0xcc,
        0xc4, // WORLD
    ];

    for (let i = 0; i < codes.length; i++) {
        ram.write(toWord(0x0400 + i), toByte(codes[i]));
    }
    console.log(`  Wrote "${message}" to address $0400`);

    // Write "APPLE ][" to row 1 (address $0480)
    const message2 = 'APPLE ][';
    const codes2 = [
        0xc1,
        0xd0,
        0xd0,
        0xcc,
        0xc5, // APPLE
        0xa0, // space
        0xdd,
        0xdb, // ][
    ];

    for (let i = 0; i < codes2.length; i++) {
        ram.write(toWord(0x0480 + i), toByte(codes2[i]));
    }
    console.log(`  Wrote "${message2}" to address $0480`);

    // Write "ROW 23" to last row (address $07D0)
    const message3 = 'ROW 23';
    const codes3 = [
        0xd2,
        0xcf,
        0xd7, // ROW
        0xa0, // space
        0xb2,
        0xb3, // 23
    ];

    for (let i = 0; i < codes3.length; i++) {
        ram.write(toWord(0x07d0 + i), toByte(codes3[i]));
    }
    console.log(`  Wrote "${message3}" to address $07D0`);
    console.log();

    // Test 3: Render and verify
    console.log('Test 3: Rendering text buffer');
    const startTime = performance.now();
    buffer = machine.getVideoBuffer();
    const renderTime = performance.now() - startTime;

    console.log(`  Render time: ${renderTime.toFixed(3)}ms`);
    console.log();

    // Verify row 0
    const row0 = buffer[0].slice(0, 11).join('');
    console.log(`  Row 0: "${row0}"`);
    if (row0 === message) {
        console.log('  ✅ Row 0 matches expected text');
    } else {
        console.log(`  ❌ Row 0 mismatch! Expected "${message}"`);
    }

    // Verify row 1
    const row1 = buffer[1].slice(0, 8).join('');
    console.log(`  Row 1: "${row1}"`);
    if (row1 === message2) {
        console.log('  ✅ Row 1 matches expected text');
    } else {
        console.log(`  ❌ Row 1 mismatch! Expected "${message2}"`);
    }

    // Verify row 23
    const row23 = buffer[23].slice(0, 6).join('');
    console.log(`  Row 23: "${row23}"`);
    if (row23 === message3) {
        console.log('  ✅ Row 23 matches expected text');
    } else {
        console.log(`  ❌ Row 23 mismatch! Expected "${message3}"`);
    }
    console.log();

    // Test 4: Page switching
    console.log('Test 4: Page switching (will be tested in Milestone 1.4)');
    console.log('  (Skipping for now - requires soft switch implementation)');
    console.log();

    // Test 5: Performance
    console.log('Test 5: Performance test (100 renders)');
    const perfStart = performance.now();
    for (let i = 0; i < 100; i++) {
        machine.getVideoBuffer();
    }
    const perfEnd = performance.now();
    const avgTime = (perfEnd - perfStart) / 100;

    console.log(`  100 renders in ${(perfEnd - perfStart).toFixed(2)}ms`);
    console.log(`  Average: ${avgTime.toFixed(3)}ms per render`);

    if (avgTime < 1.0) {
        console.log('  ✅ Performance excellent (< 1ms per render)');
    } else if (avgTime < 5.0) {
        console.log('  ✅ Performance acceptable (< 5ms per render)');
    } else {
        console.log('  ⚠️ Performance may be slow (> 5ms per render)');
    }
    console.log();

    // Display full screen buffer
    console.log('Full Screen Buffer:');
    console.log('┌' + '─'.repeat(40) + '┐');
    for (const row of buffer) {
        console.log('│' + row.join('') + '│');
    }
    console.log('└' + '─'.repeat(40) + '┘');
    console.log();

    console.log('=== All Tests Complete ===');
}

// Run test
testVideoRendering().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
