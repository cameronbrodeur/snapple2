import { describe, it, expect, beforeEach } from 'vitest';
import { Apple2Machine } from '../../src/emulator/apple2-machine.js';
import { loadRoms } from '../../src/rom/rom-manager.js';
import { RomConfig } from '../../src/rom/types.js';

describe('Language Card Integration', () => {
    let machine: Apple2Machine;
    let roms: RomConfig;

    beforeEach(async () => {
        roms = await loadRoms();
        machine = new Apple2Machine(roms);
    });

    it('should boot normally with Language Card enabled', () => {
        // Run some cycles
        machine.runCycles(1000);

        // Machine should be running (PC in valid ROM range)
        expect(machine.pc).toBeGreaterThanOrEqual(0xd000);
    });

    it('should default to reading from ROM', () => {
        const state = machine.languageCardState;
        expect(state.readFromRam).toBe(false);
    });

    it('should allow writing to Language Card RAM via soft switches', () => {
        const bus = machine.cpuMachine.bus;

        // Enable RAM read/write via soft switch ($C083 twice)
        bus.read(0xc083 as any);
        bus.read(0xc083 as any); // Second access enables write

        // Verify state changed
        const state = machine.languageCardState;
        expect(state.readFromRam).toBe(true);
        expect(state.writeEnabled).toBe(true);

        // Write to Language Card RAM at $D000
        bus.write(0xd000 as any, 0x42 as any);

        // Read back
        const value = bus.read(0xd000 as any);
        expect(value).toBe(0x42);
    });

    it('should switch between bank 1 and bank 2', () => {
        const bus = machine.cpuMachine.bus;

        // Enable RAM read/write for bank 2
        bus.read(0xc083 as any);
        bus.read(0xc083 as any);
        bus.write(0xd000 as any, 0xaa as any);

        // Switch to bank 1 and enable read/write
        bus.read(0xc08b as any);
        bus.read(0xc08b as any);
        bus.write(0xd000 as any, 0xbb as any);

        // Verify bank 1 value
        expect(bus.read(0xd000 as any)).toBe(0xbb);

        // Switch back to bank 2 and verify its value
        bus.read(0xc083 as any);
        bus.read(0xc083 as any);
        expect(bus.read(0xd000 as any)).toBe(0xaa);
    });

    it('should read from ROM when RAM read is disabled', () => {
        const bus = machine.cpuMachine.bus;

        // Default: read from ROM
        // ROM at $D000 should have Applesoft BASIC code (not 0x00)
        const romValue = bus.read(0xd000 as any);
        expect(romValue).not.toBe(0x00);

        // Enable RAM read
        bus.read(0xc080 as any);

        // RAM at $D000 should be 0x00 (uninitialized)
        const ramValue = bus.read(0xd000 as any);
        expect(ramValue).toBe(0x00);

        // Switch back to ROM ($C082)
        bus.read(0xc082 as any);

        // Should read ROM value again
        expect(bus.read(0xd000 as any)).toBe(romValue);
    });
});
