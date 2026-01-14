/**
 * Language Card Device
 *
 * 16KB RAM expansion for Apple II that overlays $D000-$FFFF.
 * Provides bank-switching between ROM and RAM.
 */

import { MemoryDevice } from 'cpu6502/bus';
import { toByte, type Byte, type Word } from 'cpu6502/types';
import { SIZE } from '../emulator/constants.js';
import { LanguageCardState, createInitialLanguageCardState } from './language-card-types.js';

/**
 * Language Card memory device.
 *
 * Implements bank-switching for the $D000-$FFFF region.
 * - $D000-$DFFF: 4KB bank (Bank 1 or Bank 2 RAM, or ROM)
 * - $E000-$FFFF: 8KB region (RAM or ROM)
 */
export class LanguageCard implements MemoryDevice {
    readonly size = 0x3000; // 12KB ($D000-$FFFF)

    private state: LanguageCardState;
    private roms: Uint8Array[]; // 6 x 2KB ROMs for $D000-$FFFF
    private lastSwitchAddress: number = 0;

    /**
     * Create a Language Card device.
     *
     * @param roms - Array of 6 ROM buffers (2KB each) for $D000-$FFFF
     */
    constructor(roms: Uint8Array[]) {
        if (roms.length !== 6) {
            throw new Error(`Expected 6 ROM buffers, got ${roms.length}`);
        }
        this.roms = roms;
        this.state = createInitialLanguageCardState();
    }

    /**
     * Read from Language Card address space.
     *
     * @param offset - Offset from $D000 (0x0000 = $D000, 0x2FFF = $FFFF)
     */
    read(offset: Word): Byte {
        const address = 0xd000 + offset;

        if (this.state.readFromRam) {
            return toByte(this.readRam(address));
        } else {
            return toByte(this.readRom(address));
        }
    }

    /**
     * Write to Language Card address space.
     *
     * @param offset - Offset from $D000
     * @param value - Byte to write
     */
    write(offset: Word, value: Byte): void {
        if (!this.state.writeEnabled) {
            return; // Writes disabled
        }

        const address = 0xd000 + offset;
        this.writeRam(address, value);
    }

    /**
     * Get current Language Card state.
     */
    getState(): LanguageCardState {
        return { ...this.state };
    }

    /**
     * Handle a soft switch access ($C080-$C08F).
     *
     * @param address - Soft switch address
     */
    handleSoftSwitch(address: number): void {
        // Normalize echoed addresses
        const normalizedAddr = this.normalizeAddress(address);

        // Check for two-access write enable sequence
        const requiresTwoAccess = (normalizedAddr & 0x01) !== 0; // Odd addresses
        if (requiresTwoAccess) {
            if (this.state.preWriteFlag && this.lastSwitchAddress === address) {
                this.state.writeEnabled = true;
                this.state.preWriteFlag = false;
            } else {
                this.state.preWriteFlag = true;
                this.state.writeEnabled = false;
            }
        } else {
            this.state.preWriteFlag = false;
            this.state.writeEnabled = false;
        }

        this.lastSwitchAddress = address;

        // Determine bank selection (bit 3: 0 = bank 2, 1 = bank 1)
        this.state.selectedBank = normalizedAddr & 0x08 ? 1 : 2;

        // Determine read source (bit 0: 0 = RAM, 1 = ROM for non-write modes)
        // $C080/$C088: Read RAM, no write (bit 0 = 0, bit 1 = 0)
        // $C081/$C089: Read ROM, write RAM (bit 0 = 1, bit 1 = 0)
        // $C082/$C08A: Read ROM, no write (bit 0 = 0, bit 1 = 1)
        // $C083/$C08B: Read/write RAM (bit 0 = 1, bit 1 = 1)
        const bit0 = normalizedAddr & 0x01;
        const bit1 = (normalizedAddr >> 1) & 0x01;

        if (bit1 === 0) {
            // $C080/$C081/$C088/$C089
            this.state.readFromRam = bit0 === 0; // 0=RAM, 1=ROM
        } else {
            // $C082/$C083/$C08A/$C08B
            this.state.readFromRam = bit0 === 1; // 0=ROM, 1=RAM
        }
    }

    // Normalize echoed addresses ($C084-$C087 → $C080-$C083, $C08C-$C08F → $C088-$C08B)
    private normalizeAddress(address: number): number {
        const offset = address - 0xc080;
        if (offset >= 4 && offset < 8) {
            return address - 4; // $C084-$C087 → $C080-$C083
        }
        if (offset >= 12 && offset < 16) {
            return address - 4; // $C08C-$C08F → $C088-$C08B
        }
        return address;
    }

    // Read from ROM at given address ($D000-$FFFF → 6 x 2KB ROM buffers)
    private readRom(address: number): number {
        // Map address to ROM index and offset
        // $D000-$D7FF = ROM 0, $D800-$DFFF = ROM 1, etc.
        const romIndex = Math.floor((address - 0xd000) / 0x800);
        const romOffset = (address - 0xd000) % 0x800;
        return this.roms[romIndex][romOffset];
    }

    // Read from RAM at given address (bank1/bank2 for $D000-$DFFF, upper for $E000-$FFFF)
    private readRam(address: number): number {
        if (address < 0xe000) {
            // $D000-$DFFF: Bank 1 or Bank 2
            const offset = address - 0xd000;
            const bank = this.state.selectedBank === 1 ? this.state.bank1Ram : this.state.bank2Ram;
            return bank[offset];
        } else {
            // $E000-$FFFF: Upper RAM (shared)
            const offset = address - 0xe000;
            return this.state.upperRam[offset];
        }
    }

    // Write to RAM at given address (bank1/bank2 for $D000-$DFFF, upper for $E000-$FFFF)
    private writeRam(address: number, value: number): void {
        if (address < 0xe000) {
            // $D000-$DFFF: Bank 1 or Bank 2
            const offset = address - 0xd000;
            const bank = this.state.selectedBank === 1 ? this.state.bank1Ram : this.state.bank2Ram;
            bank[offset] = value;
        } else {
            // $E000-$FFFF: Upper RAM (shared)
            const offset = address - 0xe000;
            this.state.upperRam[offset] = value;
        }
    }
}
