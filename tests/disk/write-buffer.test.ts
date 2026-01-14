import { describe, it, expect } from 'vitest';
import { WriteBuffer } from '../../src/disk/write-buffer.js';

describe('WriteBuffer', () => {
    it('should start with no dirty tracks', () => {
        const buffer = new WriteBuffer();
        expect(buffer.isDirty()).toBe(false);
        expect(buffer.getDirtyTrackCount()).toBe(0);
    });

    it('should mark track as dirty after first write', () => {
        const buffer = new WriteBuffer();
        const trackBits = new Uint8Array(6656);

        buffer.writeBit(0, 100, 1);

        expect(buffer.isDirty()).toBe(true);
        expect(buffer.hasDirtyTrack(0)).toBe(true);
    });

    it('should use copy-on-write for first modification', () => {
        const buffer = new WriteBuffer();
        const originalTrack = new Uint8Array(6656);
        originalTrack.fill(0xaa);

        buffer.setOriginalTrack(0, originalTrack);
        buffer.writeBit(0, 0, 1);

        const modifiedTrack = buffer.getTrack(0);
        expect(modifiedTrack).not.toBe(originalTrack); // Different instance
        expect(modifiedTrack[0]).toBe(0xaa | 0x80); // Bit set
    });

    it('should write bit at correct position', () => {
        const buffer = new WriteBuffer();
        const trackBits = new Uint8Array(6656);
        buffer.setOriginalTrack(0, trackBits);

        // Write bit 1 to position 15 (byte 1, bit 7)
        buffer.writeBit(0, 15, 1);

        const track = buffer.getTrack(0);
        expect(track[1]).toBe(0x01); // Bit 7 of byte 1
    });

    it('should clear bit at position', () => {
        const buffer = new WriteBuffer();
        const trackBits = new Uint8Array(6656);
        trackBits.fill(0xff);
        buffer.setOriginalTrack(0, trackBits);

        buffer.writeBit(0, 0, 0);

        const track = buffer.getTrack(0);
        expect(track[0]).toBe(0x7f); // Cleared bit 0
    });

    it('should throw error for bitPos out of bounds (negative)', () => {
        const buffer = new WriteBuffer();
        expect(() => buffer.writeBit(0, -1, 1)).toThrow('bitPos -1 out of bounds');
    });

    it('should throw error for bitPos out of bounds (too large)', () => {
        const buffer = new WriteBuffer();
        expect(() => buffer.writeBit(0, 53248, 1)).toThrow('bitPos 53248 out of bounds');
    });

    it('should accept bitPos at max boundary (53247)', () => {
        const buffer = new WriteBuffer();
        const trackBits = new Uint8Array(6656);
        buffer.setOriginalTrack(0, trackBits);

        // Should not throw - 53247 is the last valid bit (6656 * 8 - 1)
        buffer.writeBit(0, 53247, 1);

        const track = buffer.getTrack(0);
        // bitPos 53247 = byte 6655 (53247 >> 3), bit 7 (53247 & 7)
        expect(track[6655]).toBe(0x01); // Last bit (bit 7) of last byte
    });

    it('should reset all modifications and dirty flags', () => {
        const buffer = new WriteBuffer();
        const trackBits = new Uint8Array(6656);
        trackBits.fill(0xaa);
        buffer.setOriginalTrack(0, trackBits);

        // Make some modifications
        buffer.writeBit(0, 0, 1);
        buffer.writeBit(1, 0, 1);

        expect(buffer.isDirty()).toBe(true);
        expect(buffer.getDirtyTrackCount()).toBe(2);

        // Reset should clear everything
        buffer.reset();

        expect(buffer.isDirty()).toBe(false);
        expect(buffer.getDirtyTrackCount()).toBe(0);

        // Should return original data (not modified)
        const track = buffer.getTrack(0);
        expect(track[0]).toBe(0xaa); // Original value, not modified
    });

    it('should return modified tracks via getModifiedTracks()', () => {
        const buffer = new WriteBuffer();

        buffer.writeBit(0, 0, 1);
        buffer.writeBit(2, 100, 1);

        const modified = buffer.getModifiedTracks();
        expect(modified.size).toBe(2);
        expect(modified.has(0)).toBe(true);
        expect(modified.has(2)).toBe(true);
        expect(modified.has(1)).toBe(false);
    });

    it('should handle multiple track modifications', () => {
        const buffer = new WriteBuffer();
        const track0 = new Uint8Array(6656);
        const track1 = new Uint8Array(6656);
        track0.fill(0x00);
        track1.fill(0xff);

        buffer.setOriginalTrack(0, track0);
        buffer.setOriginalTrack(1, track1);

        // Modify both tracks
        buffer.writeBit(0, 0, 1); // Set bit in track 0
        buffer.writeBit(1, 0, 0); // Clear bit in track 1

        expect(buffer.getDirtyTrackCount()).toBe(2);
        expect(buffer.hasDirtyTrack(0)).toBe(true);
        expect(buffer.hasDirtyTrack(1)).toBe(true);

        const track0Data = buffer.getTrack(0);
        const track1Data = buffer.getTrack(1);

        expect(track0Data[0]).toBe(0x80); // Bit set
        expect(track1Data[0]).toBe(0x7f); // Bit cleared
    });

    it('should preserve data but clear dirty flags after clearDirty()', () => {
        const buffer = new WriteBuffer();
        const trackBits = new Uint8Array(6656);
        buffer.setOriginalTrack(0, trackBits);

        // Modify track
        buffer.writeBit(0, 0, 1);

        expect(buffer.isDirty()).toBe(true);
        expect(buffer.hasDirtyTrack(0)).toBe(true);

        // Clear dirty flags (simulating save)
        buffer.clearDirty();

        // Dirty flags should be cleared
        expect(buffer.isDirty()).toBe(false);
        expect(buffer.hasDirtyTrack(0)).toBe(false);

        // But data should be preserved
        const track = buffer.getTrack(0);
        expect(track[0]).toBe(0x80); // Modified bit still set

        // After clearDirty, modified data becomes the new baseline
        // Further modifications should mark as dirty again
        buffer.writeBit(0, 8, 1);
        expect(buffer.isDirty()).toBe(true);

        // After clearDirty, modifiedTracks should be empty (moved to originals)
        // But the second write should create a new modified track
        const modified = buffer.getModifiedTracks();
        expect(modified.size).toBe(1); // Only track 0 (from the second write)

        // The modified track should have both bits set (baseline + new mod)
        const modifiedTrack = modified.get(0)!;
        expect(modifiedTrack[0]).toBe(0x80); // First bit (from baseline)
        expect(modifiedTrack[1]).toBe(0x80); // Second bit (new modification)
    });

    it('should move modified tracks to originals when clearDirty is called', () => {
        const buffer = new WriteBuffer();
        const originalTrack = new Uint8Array(6656);
        originalTrack.fill(0x00);
        buffer.setOriginalTrack(0, originalTrack);

        // Modify track
        buffer.writeBit(0, 0, 1);

        // Before clearDirty, modifiedTracks should have track 0
        expect(buffer.getModifiedTracks().size).toBe(1);

        // Clear dirty (simulate save)
        buffer.clearDirty();

        // After clearDirty, modifiedTracks should be empty
        expect(buffer.getModifiedTracks().size).toBe(0);

        // But getTrack should still return the modified data
        const track = buffer.getTrack(0);
        expect(track[0]).toBe(0x80);

        // Make another modification - should create new entry in modifiedTracks
        buffer.writeBit(0, 8, 1);
        expect(buffer.getModifiedTracks().size).toBe(1);

        // Clear again
        buffer.clearDirty();
        expect(buffer.getModifiedTracks().size).toBe(0);

        // Should still have both modifications
        const finalTrack = buffer.getTrack(0);
        expect(finalTrack[0]).toBe(0x80);
        expect(finalTrack[1]).toBe(0x80);
    });
});
