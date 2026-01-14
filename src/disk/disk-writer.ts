/**
 * Serializes disk modifications back to files.
 *
 * Handles saving to both WOZ (native format) and DSK/DO/PO (sector-based formats).
 * Preserves original file format when saving.
 */

import { writeFile } from 'fs/promises';
import { WozImage } from './woz-image.js';
import { WriteBuffer } from './write-buffer.js';
import { decodeTrackBits, DOS_33_INTERLEAVE, PRODOS_INTERLEAVE } from './disk-formats.js';

export class DiskWriter {
    /**
     * Save modifications to WOZ format by updating modified tracks in place.
     *
     * This implementation assumes WOZ1 format (fixed 6656-byte track blocks).
     * Only writes tracks that have been modified, avoiding unnecessary I/O
     * for unchanged data.
     *
     * Why 831 bytes? WOZ1 allocates 6656 bytes per track, but only the first
     * 6646 bytes are track data. The last 10 bytes are metadata. To be safe,
     * we limit writes to ceil(50000 bits / 8) = 6250 bytes, but the current
     * implementation caps at 831 bytes (a bit conservative, likely needs fixing).
     *
     * Track offset calculation: 256-byte header + (trackIndex × 6656 bytes/track)
     *
     * @param originalWoz - Original WOZ image (provides pristine file data)
     * @param writeBuffer - Write buffer containing modifications
     * @param filepath - Path to save the WOZ file
     */
    async saveToWOZ(
        originalWoz: WozImage,
        writeBuffer: WriteBuffer,
        filepath: string,
    ): Promise<void> {
        // Clone original WOZ data (we'll modify it in place)
        const wozData = new Uint8Array(originalWoz['data']);
        const modifiedTracks = writeBuffer.getModifiedTracks();

        // Update only modified tracks
        for (const [quarterTrack, trackBits] of modifiedTracks) {
            // Convert quarter-track to track index (0-34)
            const trackIndex = Math.floor(quarterTrack / 4);

            if (trackIndex >= 0 && trackIndex < 35) {
                // WOZ1 format: 256-byte header + (trackIndex × 6656 bytes per track)
                const trackOffset = 256 + trackIndex * 6656;

                // Copy modified track data (6646 bytes max, leaving 10 bytes for metadata)
                const bytesToCopy = Math.min(6646, trackBits.length);
                wozData.set(trackBits.slice(0, bytesToCopy), trackOffset);

                // Update track metadata (last 10 bytes of 6656-byte track block)
                const metadataOffset = trackOffset + 6646;
                const bitCount = trackBits.length * 8; // Convert bytes to bits

                // Bytes 0-1: Bytes used
                wozData[metadataOffset + 0] = bytesToCopy & 0xff;
                wozData[metadataOffset + 1] = (bytesToCopy >> 8) & 0xff;

                // Bytes 2-3: Bit count
                wozData[metadataOffset + 2] = bitCount & 0xff;
                wozData[metadataOffset + 3] = (bitCount >> 8) & 0xff;

                // Bytes 4-5: Splice point (0xFFFF = no splice)
                wozData[metadataOffset + 4] = 0xff;
                wozData[metadataOffset + 5] = 0xff;

                // Update TMAP to map this quarter-track to its track block
                // TMAP starts at byte 88, maps quarter-track number to track block number
                wozData[88 + quarterTrack] = trackIndex;
            }
        }

        await writeFile(filepath, wozData);
    }

    /**
     * Save modifications to DSK format by decoding tracks to sectors.
     *
     * Converts WOZ bit-level format back to sector-based DSK format. This involves:
     * 1. Decoding nibble-encoded track data to raw sectors (6-and-2 encoding)
     * 2. Applying sector interleaving (DOS 3.3 vs ProDOS)
     * 3. Writing to 143360-byte file (35 tracks × 16 sectors × 256 bytes)
     *
     * Why interleaving? DOS 3.3 and ProDOS use different physical→logical sector
     * mappings. Physical sector N on disk maps to different logical sectors depending
     * on the OS. This affects how sectors are laid out in the file.
     *
     * Physical vs Logical: Physical sectors (0-15) are the order sectors appear
     * on the physical track. Logical sectors (0-15) are how the OS numbers them.
     * The interleave table maps physical → logical.
     *
     * @param wozImage - WOZ image (for reading unmodified tracks)
     * @param writeBuffer - Write buffer containing modifications
     * @param filepath - Path to save the DSK/DO/PO file
     * @param isProDOS - true for ProDOS (.po), false for DOS 3.3 (.dsk/.do)
     */
    async saveToDSK(
        wozImage: WozImage,
        writeBuffer: WriteBuffer,
        filepath: string,
        isProDOS: boolean,
    ): Promise<void> {
        // Allocate DSK file buffer (35 tracks × 16 sectors × 256 bytes = 143360 bytes)
        const diskData = new Uint8Array(143360);

        // Select interleave table based on format
        const interleave = isProDOS ? PRODOS_INTERLEAVE : DOS_33_INTERLEAVE;

        // Process all 35 tracks
        for (let track = 0; track < 35; track++) {
            // Convert track number to quarter-track (standard disks use every 4th)
            const quarterTrack = track * 4;

            // Get track bits (modified from WriteBuffer, or original from WOZ)
            let trackBits: Uint8Array;
            if (writeBuffer.hasDirtyTrack(quarterTrack)) {
                trackBits = writeBuffer.getTrack(quarterTrack);
            } else {
                trackBits = wozImage.getTrackBits(quarterTrack);
            }

            // Decode 6-and-2 nibble format to 16 × 256-byte sectors
            const sectors = decodeTrackBits(trackBits);

            // Write sectors to DSK with interleaving
            for (let physicalSector = 0; physicalSector < 16; physicalSector++) {
                const sectorData = sectors.get(physicalSector);
                if (!sectorData) {
                    console.warn(`Track ${track}, Sector ${physicalSector} not found`);
                    continue;
                }

                // Map physical sector to logical sector via interleave table
                const logicalSector = interleave[physicalSector];

                // Calculate byte offset in DSK file
                const diskOffset = (track * 16 + logicalSector) * 256;

                // Write sector data
                diskData.set(sectorData, diskOffset);
            }
        }

        await writeFile(filepath, diskData);
    }

    /**
     * Detect disk format from file extension and save appropriately.
     *
     * Preserves original file format (.woz, .dsk, .do, or .po) by dispatching
     * to the appropriate save method based on extension.
     *
     * Why preserve format? Users expect F5 save to update the original file in
     * its native format. Converting formats could break compatibility with other
     * emulators or tools.
     *
     * Extension mapping:
     * - .woz → saveToWOZ (bit-level format)
     * - .dsk, .do → saveToDSK with DOS 3.3 interleave
     * - .po → saveToDSK with ProDOS interleave
     *
     * @param wozImage - WOZ image (provides original data)
     * @param writeBuffer - Write buffer containing modifications
     * @param filepath - Path to save the file (extension determines format)
     * @throws Error if file extension is not supported
     */
    async save(wozImage: WozImage, writeBuffer: WriteBuffer, filepath: string): Promise<void> {
        // Extract file extension (case-insensitive)
        const extension = filepath.toLowerCase().split('.').pop();

        // Dispatch to appropriate save method based on extension
        switch (extension) {
            case 'woz':
                await this.saveToWOZ(wozImage, writeBuffer, filepath);
                break;
            case 'dsk':
            case 'do':
                // DOS 3.3 format (.dsk/.do use same interleaving)
                await this.saveToDSK(wozImage, writeBuffer, filepath, false);
                break;
            case 'po':
                // ProDOS format
                await this.saveToDSK(wozImage, writeBuffer, filepath, true);
                break;
            default:
                throw new Error(`Unsupported format: ${extension}`);
        }
    }
}
