import { describe, it, expect, beforeEach } from 'vitest';
import { VideoSystem } from '../../src/video/video-system.js';
import { RamDevice } from 'cpu6502/bus';

describe('VideoSystem - Lo-Res Mode', () => {
    let videoSystem: VideoSystem;
    let ram: RamDevice;

    beforeEach(() => {
        ram = new RamDevice(0x10000);
        const characterRom = new Uint8Array(2048);
        videoSystem = new VideoSystem(characterRom);
        videoSystem.connectMemory(ram);
    });

    it('should have isLoResMode getter', () => {
        expect(typeof videoSystem.isLoResMode).toBe('boolean');
    });

    it('should return false for isLoResMode when in text mode', () => {
        videoSystem.setTextMode(true);
        expect(videoSystem.isLoResMode).toBe(false);
    });

    it('should return true for isLoResMode when graphics + not hires', () => {
        videoSystem.setTextMode(false);
        videoSystem.setHiresMode(false);
        expect(videoSystem.isLoResMode).toBe(true);
    });

    it('should return false for isLoResMode when in hires mode', () => {
        videoSystem.setTextMode(false);
        videoSystem.setHiresMode(true);
        expect(videoSystem.isLoResMode).toBe(false);
    });

    it('should render lo-res when in lo-res mode', () => {
        videoSystem.setTextMode(false);
        videoSystem.setHiresMode(false);

        // Write a color to verify lo-res rendering
        ram.write(0x0400, 0x1f); // White/Magenta

        const buffer = videoSystem.getBuffer();
        expect(buffer).toHaveLength(24);
        // Should contain ANSI color codes (lo-res), not plain ASCII (text)
        expect(buffer[0][0]).toContain('\x1b[');
    });
});
