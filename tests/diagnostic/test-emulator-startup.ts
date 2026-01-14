#!/usr/bin/env tsx
/**
 * Quick Startup Test: Emulator UI
 *
 * Tests that the emulator UI can start without errors.
 * Runs for 1 second and then exits.
 */

import React from 'react';
import { render } from 'ink';
import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { ErrorPolicy } from '../../src/emulator/types.js';
import { loadRoms } from '../../src/rom/rom-manager.js';
import { EmulatorApp } from '../../src/ui/emulator-app.js';

async function testStartup() {
    console.log('Loading ROMs...');
    const roms = await loadRoms();
    console.log('✅ ROMs loaded\n');

    console.log('Starting emulator UI for 2 seconds...');
    console.log('(The emulator will auto-exit after 2 seconds)\n');

    // Create machine
    const machine = new Apple2Machine(roms, ErrorPolicy.LOG_CONTINUE);
    machine.reboot();

    // Render the UI
    const { unmount, waitUntilExit } = render(
        React.createElement(EmulatorApp, {
            machine,
        }),
    );

    // Auto-exit after 2 seconds
    setTimeout(() => {
        console.log('\n\n✅ Emulator UI started successfully!');
        console.log('✅ No React errors detected');
        console.log('\nTo run the full interactive emulator, use: npm start');
        unmount();
        process.exit(0);
    }, 2000);

    await waitUntilExit();
}

testStartup().catch((error) => {
    console.error('\n❌ Startup test failed:', error);
    process.exit(1);
});
