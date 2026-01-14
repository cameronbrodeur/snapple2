#!/usr/bin/env tsx
/**
 * Integration Test: Machine Boot
 *
 * Tests that the Apple2Machine boots correctly and executes instructions.
 */

import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { ErrorPolicy } from '../../src/emulator/types.js';
import { loadRoms } from '../../src/rom/rom-manager.js';

async function testMachineBoot() {
    console.log('=== Apple2Machine Boot Test ===\n');

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

    // Check initial state
    console.log('Initial state:');
    console.log(`  PC: $${machine.pc.toString(16).toUpperCase().padStart(4, '0')}`);
    console.log(`  Cycles: ${machine.cycles}`);
    console.log(`  Video state:`, machine.videoState);
    console.log();

    // Execute one instruction
    console.log('Executing one instruction...');
    const initialPC = machine.pc;
    machine.step();
    console.log('✅ Instruction executed\n');

    // Check state after execution
    console.log('State after step:');
    console.log(
        `  PC: $${machine.pc.toString(16).toUpperCase().padStart(4, '0')} (was $${initialPC.toString(16).toUpperCase().padStart(4, '0')})`,
    );
    console.log(`  Cycles: ${machine.cycles}`);
    console.log();

    // Execute 100 cycles
    console.log('Executing 100 cycles...');
    const cyclesExecuted = machine.runCycles(100);
    console.log(`✅ Executed ${cyclesExecuted} cycles\n`);

    // Final state
    console.log('Final state:');
    console.log(`  PC: $${machine.pc.toString(16).toUpperCase().padStart(4, '0')}`);
    console.log(`  Total cycles: ${machine.cycles}`);
    console.log();

    // Test keyboard
    console.log('Testing keyboard...');
    machine.keyPress(0x41); // 'A'
    console.log('✅ Key press sent\n');

    // Test video buffer
    console.log('Testing video buffer...');
    const buffer = machine.getVideoBuffer();
    console.log(`✅ Video buffer: ${buffer.length}×${buffer[0].length} cells\n`);

    console.log('=== All Tests Passed ===');
}

// Run test
testMachineBoot().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
