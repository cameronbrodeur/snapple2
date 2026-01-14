#!/usr/bin/env node
/**
 * Debug Key Input Tool
 *
 * Shows exactly what escape sequences your terminal sends for each key.
 * Press function keys (F1-F12) to see their escape sequences.
 * Press Ctrl+C to exit.
 */

import readline from 'readline';

// Set up raw mode to capture individual key presses
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

console.log('Debug Key Input Tool');
console.log('===================');
console.log('');
console.log('Press any key to see its escape sequence.');
console.log('Press Ctrl+C to exit.');
console.log('');
console.log('Try pressing: F1, F2, F3, F4, F5, F9');
console.log('');

process.stdin.on('keypress', (str, key) => {
    // Exit on Ctrl+C
    if (key && key.ctrl && key.name === 'c') {
        console.log('\nExiting...');
        process.exit(0);
    }

    // Show raw input
    const hexBytes = str
        ? Array.from(str)
              .map((c) => {
                  const code = c.charCodeAt(0);
                  return '0x' + code.toString(16).padStart(2, '0');
              })
              .join(' ')
        : 'none';

    const escapedStr = str ? JSON.stringify(str) : 'none';

    console.log('Key pressed:');
    console.log('  Raw input:   ', escapedStr);
    console.log('  Hex bytes:   ', hexBytes);
    console.log('  Key object:  ', JSON.stringify(key));
    console.log('');
});
