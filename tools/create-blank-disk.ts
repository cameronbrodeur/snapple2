#!/usr/bin/env tsx
/**
 * Create Blank DOS 3.3 Disk Tool
 *
 * Creates a blank, bootable DOS 3.3 disk image that can be used for saving
 * programs. The disk has an initialized VTOC and catalog structure.
 *
 * Usage:
 *   npx tsx tools/create-blank-disk.ts output.dsk          # Create DSK file
 *   npx tsx tools/create-blank-disk.ts output.woz          # Create WOZ file
 *   npx tsx tools/create-blank-disk.ts output.woz --volume 1
 */

import { writeFileSync } from 'fs';
import { basename } from 'path';
import { convertDskToWoz } from '../src/disk/index.js';
import { buildBlankDos33Dsk } from '../src/disk/blank-dos33-data.js';

/**
 * Set the disk volume number in the VTOC.
 *
 * DOS 3.3 uses a volume number (1-254) stored in VTOC track 17, sector 0, byte 0x06.
 * This is displayed when you CATALOG the disk.
 *
 * @param dskData - DSK image buffer (modified in place)
 * @param volumeNumber - Volume number (1-254, default 254)
 */
function setVolumeNumber(dskData: Uint8Array, volumeNumber: number): void {
    // VTOC is at track 17, sector 0
    const vtocOffset = 17 * 16 * 256;
    dskData[vtocOffset + 0x06] = volumeNumber;
}

function printUsage(): void {
    console.log('Create Blank DOS 3.3 Disk Tool');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx tools/create-blank-disk.ts <output-file> [options]');
    console.log('');
    console.log('Output formats (determined by extension):');
    console.log('  .dsk      DOS 3.3 sector format (143,360 bytes)');
    console.log('  .do       DOS 3.3 sector format (same as .dsk)');
    console.log('  .woz      WOZ1 nibble format (233,216 bytes)');
    console.log('');
    console.log('Options:');
    console.log('  --volume <num>  Set volume number (1-254, default 254)');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx tools/create-blank-disk.ts blank.dsk');
    console.log('  npx tsx tools/create-blank-disk.ts work.woz --volume 1');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
    }

    const outputPath = args[0];
    let volumeNumber = 254;

    // Parse options
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--volume' && args[i + 1]) {
            volumeNumber = parseInt(args[++i], 10);
            if (isNaN(volumeNumber) || volumeNumber < 1 || volumeNumber > 254) {
                console.error('Error: Volume number must be 1-254');
                process.exit(1);
            }
        }
    }

    console.log('\n=== Create Blank DOS 3.3 Disk ===\n');
    console.log(`Output: ${outputPath}`);
    console.log(`Volume: ${volumeNumber}`);
    console.log('');

    try {
        // Build blank DOS 3.3 disk from embedded template
        console.log('Building blank DOS 3.3 disk from embedded template...');
        const dskData = buildBlankDos33Dsk();
        console.log(`  Size: ${dskData.length} bytes (35 tracks x 16 sectors x 256 bytes)`);

        // Set volume number
        setVolumeNumber(dskData, volumeNumber);
        console.log(`  Volume number: ${volumeNumber}`);

        // Determine output format
        const extension = outputPath.toLowerCase().split('.').pop();
        let outputData: Uint8Array;
        let formatName: string;

        switch (extension) {
            case 'dsk':
            case 'do':
                outputData = dskData;
                formatName = 'DSK (DOS 3.3 sector format)';
                break;

            case 'woz':
                console.log('\nConverting to WOZ1 format...');
                const startTime = performance.now();
                outputData = convertDskToWoz(dskData, false);
                const elapsed = performance.now() - startTime;
                console.log(`  Conversion time: ${elapsed.toFixed(2)}ms`);
                formatName = 'WOZ1 (nibble format)';
                break;

            default:
                console.error(`Error: Unsupported output format '.${extension}'`);
                console.error('Supported: .dsk, .do, .woz');
                process.exit(1);
        }

        // Write output file
        console.log(`\nWriting ${formatName}...`);
        writeFileSync(outputPath, outputData);
        console.log(`  Size: ${outputData.length} bytes`);
        console.log('  Done!');

        console.log('\n=== Disk Created Successfully ===');
        console.log(`\nYou can use this disk with:`);
        console.log(`  npm start -- --disk1 ${basename(outputPath)} --writable`);
        console.log('');
    } catch (error) {
        console.error(`\nError: ${error}`);
        process.exit(1);
    }
}

main();
