import { describe, it, expect } from 'vitest';
import { computeHiResAddresses, getHiResScanlineAddress } from '../../src/video/hires-memory.js';

describe('Hi-Res Memory Addresses', () => {
    describe('computeHiResAddresses', () => {
        it('should compute 192 scanlines × 40 bytes for page 1', () => {
            const addresses = computeHiResAddresses(1);
            expect(addresses.length).toBe(192 * 40);
        });

        it('should start page 1 at $2000', () => {
            const addresses = computeHiResAddresses(1);
            expect(addresses[0]).toBe(0x2000);
        });

        it('should start page 2 at $4000', () => {
            const addresses = computeHiResAddresses(2);
            expect(addresses[0]).toBe(0x4000);
        });
    });

    describe('getHiResScanlineAddress', () => {
        it('should return $2000 for scanline 0, byte 0, page 1', () => {
            expect(getHiResScanlineAddress(1, 0, 0)).toBe(0x2000);
        });

        it('should return $2028 for scanline 64, byte 0, page 1', () => {
            // Group 1 starts at base + $0028
            expect(getHiResScanlineAddress(1, 64, 0)).toBe(0x2028);
        });

        it('should return $2080 for scanline 8, byte 0, page 1', () => {
            // Scanline 8 is second line in group 0, section 1
            expect(getHiResScanlineAddress(1, 8, 0)).toBe(0x2080);
        });

        it('should return $2400 for scanline 1, byte 0, page 1', () => {
            // Scanline 1 is in section 0, line 1 (offset $0400)
            expect(getHiResScanlineAddress(1, 1, 0)).toBe(0x2400);
        });

        it('should handle byte offsets correctly', () => {
            // Scanline 0, byte 39 should be $2000 + 39 = $2027
            expect(getHiResScanlineAddress(1, 0, 39)).toBe(0x2027);
        });

        it('should compute page 2 addresses correctly', () => {
            // Page 2 scanline 0, byte 0 = $4000
            expect(getHiResScanlineAddress(2, 0, 0)).toBe(0x4000);
            // Page 2 scanline 64 = $4028
            expect(getHiResScanlineAddress(2, 64, 0)).toBe(0x4028);
        });
    });
});
