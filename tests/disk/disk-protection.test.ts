/**
 * Integration tests for disk write protection.
 *
 * Tests the write protection system:
 * 1. WOZ write-protect flag (metadata bit)
 * 2. CLI overrides (--write-protect, --writable)
 * 3. Runtime toggle (F8 key simulation)
 * 4. Protection enforcement during writes
 *
 * Why test write protection separately? It involves coordination between
 * DiskImage metadata, DiskDrive state, CLI args, and runtime toggles. This
 * integration test ensures all these layers work together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiskIIController } from '../../src/disk/disk-controller.js';
import { WozImage } from '../../src/disk/woz-image.js';
import { toWord, toByte } from 'cpu6502/types';
import { createWoz1 } from './test-helpers.js';

// Use shared helper with simplified API for write protection tests
function createWoz2WithProtection(writeProtected: boolean): Uint8Array {
    return createWoz1({ writeProtected });
}

describe('Disk Write Protection Integration', () => {
    let controller: DiskIIController;

    beforeEach(() => {
        controller = new DiskIIController(() => 0);
    });

    it('should respect WOZ write-protect flag by default', () => {
        // Create WOZ with write protection enabled
        const protectedWozData = createWoz2WithProtection(true);
        const protectedWoz = new WozImage(protectedWozData);

        // Verify metadata flag
        expect(protectedWoz.isWriteProtected).toBe(true);

        // Load into controller
        controller.loadDisk(1, protectedWoz);
        const drive = controller.getDrive(1);

        // Verify drive inherits protection flag
        expect(drive.isWriteAllowed()).toBe(false); // Protected = not writable
    });

    it('should allow writes to unprotected disks', () => {
        // Create WOZ without write protection
        const writableWozData = createWoz2WithProtection(false);
        const writableWoz = new WozImage(writableWozData);

        expect(writableWoz.isWriteProtected).toBe(false);

        controller.loadDisk(1, writableWoz);
        const drive = controller.getDrive(1);

        expect(drive.isWriteAllowed()).toBe(true); // Not protected = writable

        // Enable write mode and write data
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        // Verify write succeeded
        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true);
    });

    it('should block writes to protected disks', () => {
        // Create protected WOZ
        const protectedWozData = createWoz2WithProtection(true);
        const protectedWoz = new WozImage(protectedWozData);

        controller.loadDisk(1, protectedWoz);
        const drive = controller.getDrive(1);

        // Try to write
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Try to write byte

        // Verify write was blocked
        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(false); // Should remain clean
    });

    it('should toggle protection with setWriteProtectOverride', () => {
        // Create protected WOZ
        const protectedWozData = createWoz2WithProtection(true);
        const protectedWoz = new WozImage(protectedWozData);

        controller.loadDisk(1, protectedWoz);
        const drive = controller.getDrive(1);

        // Initially protected
        expect(drive.isWriteAllowed()).toBe(false); // Protected = not writable

        // Override to writable (F8 key with protected disk)
        drive.setWriteProtectOverride(true); // true = allow writes
        expect(drive.isWriteAllowed()).toBe(true); // Now writable

        // Can now write
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true); // Write succeeded

        // Toggle back to protected
        drive.setWriteProtectOverride(false); // false = respect original protection
        expect(drive.isWriteAllowed()).toBe(false); // Protected again
    });

    it('should handle CLI --writable flag (force writable)', () => {
        // Simulate loading with --writable flag
        const protectedWozData = createWoz2WithProtection(true);
        const protectedWoz = new WozImage(protectedWozData);

        controller.loadDisk(1, protectedWoz);
        const drive = controller.getDrive(1);

        // Initially protected
        expect(drive.isWriteAllowed()).toBe(false); // Protected = not writable

        // Apply --writable override
        drive.setWriteProtectOverride(true); // true = allow writes

        // Now writable despite WOZ flag
        expect(drive.isWriteAllowed()).toBe(true); // Now writable

        // Can write
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true);
    });

    it('should handle CLI --write-protect flag (force protected)', () => {
        // Simulate loading with --write-protect flag
        const writableWozData = createWoz2WithProtection(false);
        const writableWoz = new WozImage(writableWozData);

        controller.loadDisk(1, writableWoz);
        const drive = controller.getDrive(1);

        // Initially writable
        expect(drive.isWriteAllowed()).toBe(true); // Writable

        // Apply --write-protect override (force protect)
        drive.setForceWriteProtect(true); // Use forceWriteProtect, not override

        // Now protected despite WOZ flag
        expect(drive.isWriteAllowed()).toBe(false); // Now protected

        // Cannot write
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Try to write byte

        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(false); // Write blocked
    });

    it('should allow F8 toggle on protected disk (override to writable)', () => {
        // Load protected disk
        const protectedWozData = createWoz2WithProtection(true);
        const protectedWoz = new WozImage(protectedWozData);

        controller.loadDisk(1, protectedWoz);
        const drive = controller.getDrive(1);

        expect(drive.isWriteAllowed()).toBe(false); // Protected

        // Simulate F8 key press (toggle protection)
        drive.setWriteProtectOverride(true); // Enable override = allow writes

        // Now writable
        expect(drive.isWriteAllowed()).toBe(true); // Writable

        // Second F8 press toggles back
        drive.setWriteProtectOverride(false); // Disable override = respect protection
        expect(drive.isWriteAllowed()).toBe(false); // Protected again
    });

    it('should allow F8 toggle on writable disk (force protect)', () => {
        // Load writable disk
        const writableWozData = createWoz2WithProtection(false);
        const writableWoz = new WozImage(writableWozData);

        controller.loadDisk(1, writableWoz);
        const drive = controller.getDrive(1);

        expect(drive.isWriteAllowed()).toBe(true); // Writable

        // Simulate F8 key press to force protect
        drive.setForceWriteProtect(true); // Force protect = prevent writes

        // Now protected
        expect(drive.isWriteAllowed()).toBe(false); // Protected

        // Second F8 press toggles back
        drive.setForceWriteProtect(false); // Disable force protect
        expect(drive.isWriteAllowed()).toBe(true); // Writable again
    });

    it('should maintain protection state across multiple writes', () => {
        // Create writable disk
        const writableWozData = createWoz2WithProtection(false);
        const writableWoz = new WozImage(writableWozData);

        controller.loadDisk(1, writableWoz);
        const drive = controller.getDrive(1);

        // Write some data
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true);

        // Force protect (F8 on writable disk)
        drive.setForceWriteProtect(true); // Force protect = prevent writes
        expect(drive.isWriteAllowed()).toBe(false); // Now protected

        // Try to write more data
        controller.write(toWord(0xc0ed), toByte(0xef)); // Try to write another byte

        // Dirty count should not increase (write blocked)
        expect(buffer.getDirtyTrackCount()).toBe(1); // Still just 1 track
    });

    it('should show correct protection status for both drives', () => {
        // Load different disks in both drives
        const protectedWoz = new WozImage(createWoz2WithProtection(true));
        const writableWoz = new WozImage(createWoz2WithProtection(false));

        controller.loadDisk(1, protectedWoz);
        controller.loadDisk(2, writableWoz);

        // Verify both drives have correct protection
        const drive1 = controller.getDrive(1);
        const drive2 = controller.getDrive(2);

        expect(drive1.isWriteAllowed()).toBe(false); // Protected
        expect(drive2.isWriteAllowed()).toBe(true); // Writable

        // Toggle drive 1 to writable
        drive1.setWriteProtectOverride(true); // Override = allow writes
        expect(drive1.isWriteAllowed()).toBe(true); // Now writable

        // Drive 2 should be unaffected
        expect(drive2.isWriteAllowed()).toBe(true);
    });

    it('should preserve dirty state when toggling protection', () => {
        // Create writable disk and write data
        const writableWozData = createWoz2WithProtection(false);
        const writableWoz = new WozImage(writableWozData);

        controller.loadDisk(1, writableWoz);
        const drive = controller.getDrive(1);

        // Write data
        controller.write(toWord(0xc0e9), toByte(0)); // MOTOR_ON
        drive.motorRunning = true;
        controller.write(toWord(0xc0ef), toByte(0xab)); // WRITE_ON
        controller.write(toWord(0xc0ed), toByte(0xcd)); // Write byte

        const buffer = drive.getWriteBuffer();
        expect(buffer.isDirty()).toBe(true);

        // Force protection (this shouldn't clear dirty flag)
        drive.setForceWriteProtect(true); // Force protect = prevent future writes

        // Dirty state should be preserved (past writes remain)
        expect(buffer.isDirty()).toBe(true);
        expect(buffer.getDirtyTrackCount()).toBe(1);
    });
});
