#!/usr/bin/env npx tsx
/**
 * Check and modify disk image information including write-protect status
 *
 * Usage:
 *   npx tsx tools/check-disk-info.ts <disk-file>
 *   npx tsx tools/check-disk-info.ts <disk-file> --set-protect
 *   npx tsx tools/check-disk-info.ts <disk-file> --clear-protect
 */

import { readFile, writeFile } from 'fs/promises';
import { WozImage } from '../src/disk/woz-image.js';

async function main() {
    const diskPath = process.argv[2];
    const command = process.argv[3];

    if (!diskPath) {
        console.error(
            'Usage: npx tsx tools/check-disk-info.ts <disk-file> [--set-protect|--clear-protect]',
        );
        console.error('');
        console.error('Commands:');
        console.error('  (no command)       Show disk information');
        console.error('  --set-protect      Set write-protect flag (WOZ only)');
        console.error('  --clear-protect    Clear write-protect flag (WOZ only)');
        process.exit(1);
    }

    try {
        const data = await readFile(diskPath);

        // Check if it's WOZ format
        const isWoz = data[0] === 0x57 && data[1] === 0x4f && data[2] === 0x5a;

        // Handle write-protect modification commands
        if (command === '--set-protect' || command === '--clear-protect') {
            if (!isWoz) {
                console.error('Error: Write-protect flag can only be modified on WOZ files');
                console.error('DSK/DO/PO files have no write-protect flag in the file format');
                process.exit(1);
            }

            const newValue = command === '--set-protect' ? 1 : 0;
            const wozData = new Uint8Array(data);

            // WOZ1 and WOZ2 both have write-protect at byte 22
            wozData[22] = newValue;

            await writeFile(diskPath, wozData);
            console.log(
                `✅ Write-protect flag ${command === '--set-protect' ? 'SET' : 'CLEARED'} on ${diskPath}`,
            );
            console.log(`  Byte 22: 0x${newValue.toString(16).padStart(2, '0')}`);
            return;
        }

        // Show disk information
        console.log(`File: ${diskPath}`);
        console.log(`Size: ${data.length} bytes`);
        console.log();

        if (isWoz) {
            const version = String.fromCharCode(data[3]);
            console.log(`Format: WOZ${version}`);

            // Parse with WozImage
            const woz = new WozImage(data);

            console.log(`Write Protected: ${woz.isWriteProtected ? 'YES' : 'NO'}`);
            console.log(
                `Optimal Timing: ${woz.optimalTiming} (4.0 MHz / ${woz.optimalTiming} = ${(4000000 / woz.optimalTiming / 1000).toFixed(1)} kHz)`,
            );
            console.log();

            // Show write-protect byte location
            console.log('Raw Header:');
            console.log(
                `  Byte 22 (write-protect): 0x${data[22].toString(16).padStart(2, '0')} (${data[22] === 1 ? 'protected' : 'writable'})`,
            );
            console.log(`  Byte 59 (optimal timing): ${data[59]}`);
            console.log();

            // Show how to modify
            console.log('To modify write-protect flag:');
            console.log(`  npx tsx tools/check-disk-info.ts "${diskPath}" --set-protect`);
            console.log(`  npx tsx tools/check-disk-info.ts "${diskPath}" --clear-protect`);
        } else if (data.length === 143360) {
            // Standard DSK/DO/PO format (35 tracks × 16 sectors × 256 bytes)
            console.log('Format: DSK/DO/PO (sector-based, 143,360 bytes)');
            console.log('Write Protected: N/A (sector files have no write-protect flag)');
            console.log();
            console.log(
                'Note: Use --write-protect CLI flag when starting emulator to prevent writes',
            );
        } else {
            console.log('Format: UNKNOWN');
            console.log('Not a recognized Apple II disk format');
            console.log();
            console.log('Recognized formats:');
            console.log('  - WOZ1/WOZ2: Starts with "WOZ1" or "WOZ2"');
            console.log(
                '  - DSK/DO/PO: Exactly 143,360 bytes (35 tracks × 16 sectors × 256 bytes)',
            );
        }
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
