#!/usr/bin/env tsx
/**
 * DSK to WOZ Converter Tool
 *
 * Converts DSK/DO/PO disk images to WOZ2 format.
 *
 * Usage:
 *   npx tsx tools/convert-dsk.ts input.dsk [output.woz]
 *   npx tsx tools/convert-dsk.ts input.po output.woz  # ProDOS format
 */

import { readFile, writeFile } from 'fs/promises';
import { basename } from 'path';
import { convertDskToWoz, isProDOSFormat, detectDiskFormat } from '../src/disk/index.js';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: npx tsx tools/convert-dsk.ts input.dsk [output.woz]');
        console.error('');
        console.error('Formats:');
        console.error('  .dsk, .do  - DOS 3.3 sector order');
        console.error('  .po        - ProDOS sector order');
        process.exit(1);
    }

    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.(dsk|do|po)$/i, '.woz');

    console.log('\n=== DSK to WOZ Converter ===\n');
    console.log(`Input:  ${inputPath}`);
    console.log(`Output: ${outputPath}\n`);

    try {
        // Detect format
        const format = detectDiskFormat(inputPath);
        if (!format || format === 'woz') {
            console.error(`Error: Input must be .dsk, .do, or .po format`);
            process.exit(1);
        }

        // Read input file
        console.log('Reading input file...');
        const dskData = await readFile(inputPath);
        console.log(`  Size: ${dskData.length} bytes`);

        // Validate size
        if (dskData.length !== 143360) {
            console.error(
                `Error: Invalid DSK size. Expected 143360 bytes (35 tracks × 16 sectors × 256 bytes)`,
            );
            console.error(`  Got: ${dskData.length} bytes`);
            process.exit(1);
        }

        // Detect ProDOS vs DOS 3.3
        const isProDOS = isProDOSFormat(inputPath);
        console.log(`  Format: ${isProDOS ? 'ProDOS (.po)' : 'DOS 3.3 (.dsk/.do)'}`);
        console.log(`  Sector order: ${isProDOS ? 'ProDOS' : 'DOS 3.3'}`);

        // Convert to WOZ
        console.log('\nConverting to WOZ1 format...');
        const startTime = performance.now();
        const wozData = convertDskToWoz(dskData, isProDOS);
        const elapsed = performance.now() - startTime;

        console.log(`  Output size: ${wozData.length} bytes`);
        console.log(`  Conversion time: ${elapsed.toFixed(2)}ms`);

        // Write output file
        console.log('\nWriting output file...');
        await writeFile(outputPath, wozData);
        console.log('  ✅ Written successfully');

        console.log('\n=== Conversion Complete ===');
        console.log(`\nYou can now use this disk with:`);
        console.log(`  npm start -- --disk1 ${basename(outputPath)}`);
        console.log('');
    } catch (error) {
        console.error(`\nError: ${error}`);
        process.exit(1);
    }
}

main();
