/**
 * Video System
 *
 * Manages video rendering and mode switching for Apple II.
 * Uses double-buffered pools to eliminate per-frame allocations.
 */

import { RamDevice } from 'cpu6502/bus';
import { TerminalBuffer, TextPage } from '../emulator/types.js';
import { VIDEO } from '../emulator/constants.js';
import { VideoRenderer } from './video-renderer.js';
import { TextModeRenderer } from './text-renderer.js';
import { LoResRenderer } from './lores-renderer.js';
import { HiResRenderer } from './hires-renderer.js';
import { CharacterRom } from './character-rom.js';

/**
 * Video system for Apple II.
 *
 * Manages video state and delegates rendering to appropriate renderer.
 * Uses pre-allocated double buffer pools to avoid GC pressure.
 */
export class VideoSystem {
    private textMode = true;
    private hiresMode = false;
    private mixedMode = false;
    private page2 = false;
    private showFlash = true;

    private renderer: VideoRenderer | null = null;
    private ram: RamDevice | null = null;
    private characterRom: CharacterRom;

    /** Text and Lo-res share same pool (both 40x24). */
    private textBuffers: [TerminalBuffer, TerminalBuffer];

    /** Hi-res has larger buffers (280x96). */
    private hiresBuffers: [TerminalBuffer, TerminalBuffer];

    /** Current buffer index (0 or 1) - swaps each frame. */
    private bufferIndex = 0;

    constructor(characterRomData: Uint8Array) {
        this.characterRom = new CharacterRom(characterRomData);

        // Pre-allocate buffer pools
        this.textBuffers = [
            this.createBuffer(VIDEO.TEXT_COLS, VIDEO.TEXT_ROWS),
            this.createBuffer(VIDEO.TEXT_COLS, VIDEO.TEXT_ROWS),
        ];
        this.hiresBuffers = [
            this.createBuffer(VIDEO.HIRES_OUTPUT_WIDTH, VIDEO.HIRES_OUTPUT_HEIGHT),
            this.createBuffer(VIDEO.HIRES_OUTPUT_WIDTH, VIDEO.HIRES_OUTPUT_HEIGHT),
        ];
    }

    /**
     * Create a pre-allocated terminal buffer.
     *
     * @param width - Buffer width in columns
     * @param height - Buffer height in rows
     * @returns Pre-allocated buffer filled with empty strings
     */
    private createBuffer(width: number, height: number): TerminalBuffer {
        const buffer: TerminalBuffer = [];
        for (let row = 0; row < height; row++) {
            buffer.push(new Array(width).fill(''));
        }
        return buffer;
    }

    /**
     * Check if currently in lo-res graphics mode.
     */
    get isLoResMode(): boolean {
        return !this.textMode && !this.hiresMode;
    }

    /**
     * Connect RAM device for reading video memory.
     *
     * @param ram - RAM device
     */
    connectMemory(ram: RamDevice): void {
        this.ram = ram;
        // Initialize renderer now that we have RAM
        this.updateRenderer();
    }

    /**
     * Set text mode.
     *
     * @param enabled - true for text mode, false for graphics
     */
    setTextMode(enabled: boolean): void {
        this.textMode = enabled;
        this.updateRenderer();
    }

    /**
     * Set hi-res mode.
     *
     * @param enabled - true for hi-res mode, false for lo-res
     */
    setHiresMode(enabled: boolean): void {
        this.hiresMode = enabled;
        this.updateRenderer();
    }

    /**
     * Set mixed mode.
     *
     * @param enabled - true for mixed mode (graphics + text)
     */
    setMixedMode(enabled: boolean): void {
        this.mixedMode = enabled;
        this.updateRenderer();
    }

    /**
     * Set active page.
     *
     * @param page - Page number (1 or 2)
     */
    setPage(page: TextPage): void {
        this.page2 = page === 2;
        this.updateRenderer();
    }

    /**
     * Get current video buffer.
     *
     * Uses double-buffered pools to eliminate per-frame allocations.
     * Returns alternate buffers each frame so React detects reference changes.
     *
     * @returns Terminal buffer (40x24 for text/lores, 280x96 for hires)
     */
    getBuffer(): TerminalBuffer {
        if (!this.renderer) {
            return this.textBuffers[0];
        }

        const pool = this.hiresMode ? this.hiresBuffers : this.textBuffers;
        const target = pool[this.bufferIndex];

        this.renderer.render(target, this.showFlash);
        this.bufferIndex = 1 - this.bufferIndex;

        return target;
    }

    /**
     * Toggle flash state for blinking cursor.
     *
     * Flash state is owned by VideoSystem (not renderers) so it persists
     * across renderer recreation during mode switches.
     */
    toggleFlash(): void {
        this.showFlash = !this.showFlash;
    }

    /**
     * Get current video state.
     */
    getState() {
        return {
            textMode: this.textMode,
            hiresMode: this.hiresMode,
            mixedMode: this.mixedMode,
            page2: this.page2,
        };
    }

    /**
     * Update renderer based on current video mode.
     */
    private updateRenderer(): void {
        if (!this.ram) {
            // Can't create renderer without RAM
            return;
        }

        const page: TextPage = this.page2 ? 2 : 1;

        if (this.textMode) {
            // Text mode
            this.renderer = new TextModeRenderer(this.ram, this.characterRom, page);
        } else if (this.hiresMode) {
            // Hi-res graphics mode (280x192 using half-blocks)
            this.renderer = new HiResRenderer(this.ram, this.characterRom, page, this.mixedMode);
        } else {
            // Lo-res graphics mode
            this.renderer = new LoResRenderer(this.ram, this.characterRom, page, this.mixedMode);
        }
    }
}
