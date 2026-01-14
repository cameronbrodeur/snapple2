#!/usr/bin/env tsx
/**
 * Debug Script - Check Screen Memory
 *
 * This script starts the emulator and prints what's in screen memory
 * to help diagnose why the Applesoft prompt isn't appearing.
 */

import { loadRoms } from '../../src/rom/rom-manager.js';
import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { ErrorPolicy } from '../../src/emulator/types.js';

async function main() {
    console.log('Loading ROMs...');
    const roms = await loadRoms();

    console.log('Creating machine...');
    const machine = new Apple2Machine(roms, ErrorPolicy.LOG_CONTINUE);

    console.log('Resetting machine...');
    machine.reset();

    console.log('Running for 1,000,000 cycles...');
    machine.runCycles(1_000_000);

    console.log(`\nTotal cycles executed: ${machine.cycles}`);
    console.log(`PC: $${machine.pc.toString(16).toUpperCase().padStart(4, '0')}`);

    // Access bus to check screen memory
    const cpu = machine.cpu;

    console.log('\n=== Screen Memory ($0400-$0427, first row) ===');
    let firstRow = '';
    for (let i = 0; i < 40; i++) {
        const addr = 0x0400 + i;
        const value = cpu.bus.read(addr);
        firstRow += `${value.toString(16).toUpperCase().padStart(2, '0')} `;
    }
    console.log(firstRow);

    console.log('\n=== Last Row ($0750-$0777) ===');
    let lastRow = '';
    const lastRowBase = 0x0750; // Row 23
    for (let i = 0; i < 40; i++) {
        const addr = lastRowBase + i;
        const value = cpu.bus.read(addr);
        lastRow += `${value.toString(16).toUpperCase().padStart(2, '0')} `;
    }
    console.log(lastRow);

    // Check for any non-zero values in screen memory
    console.log('\n=== Checking for non-zero values in screen memory ===');
    let nonZeroCount = 0;
    let nonZeroAddresses = [];
    for (let addr = 0x0400; addr < 0x0800; addr++) {
        const value = cpu.bus.read(addr);
        if (value !== 0) {
            nonZeroCount++;
            if (nonZeroAddresses.length < 20) {
                nonZeroAddresses.push({
                    addr: addr,
                    value: value,
                });
            }
        }
    }

    console.log(`Found ${nonZeroCount} non-zero bytes in screen memory`);
    if (nonZeroAddresses.length > 0) {
        console.log('First few non-zero values:');
        for (const { addr, value } of nonZeroAddresses) {
            console.log(
                `  $${addr.toString(16).toUpperCase().padStart(4, '0')}: $${value.toString(16).toUpperCase().padStart(2, '0')} (${value})`,
            );
        }
    } else {
        console.log('Screen memory is still all zeros!');
        console.log('This means the ROM is not writing to screen memory.');
        console.log('Possible causes:');
        console.log('  1. ROM is stuck in a loop');
        console.log('  2. ROM is waiting for input');
        console.log('  3. ROM execution path is wrong');
    }

    // Check reset vector
    console.log('\n=== Reset Vector Check ===');
    const resetLow = cpu.bus.read(0xfffc);
    const resetHigh = cpu.bus.read(0xfffd);
    const resetAddr = resetLow | (resetHigh << 8);
    console.log(
        `Reset vector at $FFFC-$FFFD: $${resetAddr.toString(16).toUpperCase().padStart(4, '0')}`,
    );

    // Sample some ROM memory
    console.log('\n=== Sample Monitor ROM (first 16 bytes at $F800) ===');
    let romSample = '';
    for (let i = 0; i < 16; i++) {
        const value = cpu.bus.read(0xf800 + i);
        romSample += `${value.toString(16).toUpperCase().padStart(2, '0')} `;
    }
    console.log(romSample);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
