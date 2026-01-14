#!/usr/bin/env node
/**
 * WOZ Dumper Tool
 *
 * Dumps WOZ file structure for inspection and validation.
 *
 * Usage: npx tsx tools/dump-woz.ts <disk.woz>
 */

import { readFile } from 'fs/promises';
import { WozImage } from '../src/disk/woz-image.js';

async function dumpWoz(filename: string): Promise<void> {
    console.log(`\n=== WOZ Dumper ===`);
    console.log(`File: ${filename}\n`);

    try {
        // Load file
        const data = await readFile(filename);
        console.log(`Size: ${data.length} bytes`);

        // Check signature
        const signature = String.fromCharCode(...data.slice(0, 4));
        console.log(`Signature: ${signature}`);

        if (signature !== 'WOZ1' && signature !== 'WOZ2') {
            console.error('Invalid WOZ file!');
            process.exit(1);
        }

        // Parse with WozImage
        const image = new WozImage(data);

        console.log(`\n--- Metadata ---`);
        console.log(`Write Protected: ${image.isWriteProtected ? 'Yes' : 'No'}`);
        console.log(
            `Optimal Timing: ${image.optimalTiming} (${image.optimalTiming * 125}ns per bit)`,
        );
        console.log(
            `Max Quarter-Track: ${image.maxQuarterTrack} (Track ${image.maxQuarterTrack / 4})`,
        );

        console.log(`\n--- Track Map ---`);
        let trackCount = 0;
        for (let qtrack = 0; qtrack <= image.maxQuarterTrack; qtrack++) {
            if (image.hasTrack(qtrack)) {
                trackCount++;
                const track = qtrack / 4;
                const bits = image.getTrackBitCount(qtrack);
                const bytes = Math.ceil(bits / 8);

                // Only show whole tracks (not quarter-tracks)
                if (qtrack % 4 === 0) {
                    console.log(`  Track ${track.toFixed(2)}: ${bits} bits (${bytes} bytes)`);
                }
            }
        }
        console.log(`\nTotal tracks with data: ${trackCount}`);

        // Dump first 100 bytes of track 0
        if (image.hasTrack(0)) {
            console.log(`\n--- Track 0 Sample (first 100 bytes) ---`);
            const bytes: number[] = [];
            for (let i = 0; i < 800; i += 8) {
                let byte = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const b = image.readBit(0, i + bit);
                    byte = (byte << 1) | b;
                }
                bytes.push(byte);

                if (bytes.length >= 100) break;
            }

            // Print hex dump
            for (let i = 0; i < bytes.length; i += 16) {
                const offset = i.toString(16).padStart(4, '0');
                const hex = bytes
                    .slice(i, i + 16)
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join(' ');
                console.log(`  ${offset}: ${hex}`);
            }
        }

        console.log(`\n=== Dump Complete ===\n`);
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
}

// Main
const filename = process.argv[2];

if (!filename) {
    console.error('Usage: npx tsx tools/dump-woz.ts <disk.woz>');
    process.exit(1);
}

dumpWoz(filename);
