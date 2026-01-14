/**
 * Apple II Plus emulator.
 *
 * Integrates cpu6502 Machine with Apple II-specific hardware including 48KB RAM,
 * Applesoft BASIC ROMs, Monitor ROM, video system, keyboard, soft switches, and
 * optional Disk II controller.
 */

// Node modules
// (none after refactor - path moved to path-utils.ts)

// External dependencies
import { Machine } from 'cpu6502';
import { CPU } from 'cpu6502/cpu';
import { RamDevice, RomDevice } from 'cpu6502/bus';

// Local modules
import { RomConfig } from '../rom/types.js';
import { ErrorPolicy, TerminalBuffer } from './types.js';
import { VideoSystem } from '../video/video-system.js';
import { KeyboardLatch } from '../memory/keyboard-device.js';
import { SoftSwitchDevice } from '../memory/soft-switches.js';
import { LanguageCard, PaddleDevice } from '../memory/soft-switch-handler.js';
import { SIZE, MEMORY } from './constants.js';
import { DiskIIController, WozImage, DiskDrive } from '../disk/index.js';
import { loadDiskImageFromPath } from './disk-loader.js';
import { extractBasename } from '../utils/path-utils.js';

export class Apple2Machine {
    private machine: Machine;
    private videoSystem: VideoSystem;
    private keyboard: KeyboardLatch;
    private softSwitches: SoftSwitchDevice;
    private languageCard: LanguageCard;
    private paddleDevice: PaddleDevice;
    private errorPolicy: ErrorPolicy;
    private totalCycles = 0;
    private ram!: RamDevice;
    private diskController?: DiskIIController;

    constructor(roms: RomConfig, errorPolicy: ErrorPolicy = ErrorPolicy.HALT) {
        this.errorPolicy = errorPolicy;

        // Create keyboard and video system
        this.keyboard = new KeyboardLatch();
        this.videoSystem = new VideoSystem(roms.character);

        // Create Language Card with ROM references
        // ROMs are organized as 6 x 2KB buffers covering $D000-$FFFF
        const romBuffers = [
            roms.appleSoftD000,
            roms.appleSoftD800,
            roms.appleSoftE000,
            roms.appleSoftE800,
            roms.appleSoftF000,
            roms.monitor,
        ];
        this.languageCard = new LanguageCard(romBuffers);

        // Create paddle device for game controller input
        this.paddleDevice = new PaddleDevice();

        // Create soft switches device (with Language Card and Paddle)
        this.softSwitches = new SoftSwitchDevice(
            this.keyboard,
            this.videoSystem,
            this.languageCard,
            this.paddleDevice,
            () => this.totalCycles,
        );

        // Create cpu6502 Machine with bus configuration
        this.machine = new Machine({
            ram: { size: SIZE.RAM, start: 0 }, // 48KB RAM ($0000-$BFFF)
            vectors: false, // Disable auto-vectors - Monitor ROM provides its own
            configureBus: (bus, ram) => {
                // Store RAM reference and connect to video
                this.ram = ram;
                this.videoSystem.connectMemory(this.ram);

                // Map soft switches at $C000 (256 bytes)
                bus.mapDevice(this.softSwitches, 0xc000 as any, {
                    length: SIZE.SOFT_SWITCHES,
                });

                // Map Language Card at $D000-$FFFF (12KB)
                // The Language Card handles ROM/RAM switching internally
                bus.mapDevice(this.languageCard as any, 0xd000 as any, {
                    length: 0x3000, // 12KB ($D000-$FFFF)
                });
            },
        });

        // Enable Disk II if ROM is available
        if (roms.diskController) {
            this.enableDiskII(roms.diskController);
        }
    }

    /**
     * Reboot the machine (cold boot).
     *
     * Clears the power-up byte to force cold boot, then resets CPU,
     * keyboard, and cycle counter. This causes the Monitor ROM to check
     * for auto-start ROMs (like Disk II) and boot from disk if present.
     */
    reboot(): void {
        this.ram.write(MEMORY.POWER_UP_BYTE as any, 0x00 as any);
        this.machine.reset();
        this.keyboard.clear();
        this.totalCycles = 0;
    }

    /** Execute one instruction (throws on error if policy is HALT) */
    step(): void {
        try {
            const result = this.machine.step();
            this.totalCycles += result.cycles;
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Execute a specified number of cycles.
     * IMPORTANT: totalCycles is updated incrementally (not batched) because
     * soft switches like paddle timers read getCycles() mid-execution.
     *
     * @returns Actual cycles executed
     */
    runCycles(count: number): number {
        let cyclesExecuted = 0;

        try {
            while (cyclesExecuted < count) {
                const result = this.machine.step();
                cyclesExecuted += result.cycles;
                this.totalCycles += result.cycles;
            }
            return cyclesExecuted;
        } catch (error) {
            this.handleError(error as Error);
            return cyclesExecuted;
        }
    }

    private handleError(error: Error): void {
        switch (this.errorPolicy) {
            case ErrorPolicy.HALT:
                throw error;
            case ErrorPolicy.LOG_CONTINUE:
                console.error('Emulator error:', error.message);
                break;
            case ErrorPolicy.IGNORE:
                break;
        }
    }

    /** Get current video buffer (40×24 string array) */
    getVideoBuffer(): TerminalBuffer {
        return this.videoSystem.getBuffer();
    }

    /** Toggle flash state for blinking cursor */
    toggleFlash(): void {
        this.videoSystem.toggleFlash();
    }

    /** Get video system state */
    get videoState() {
        return this.videoSystem.getState();
    }

    /** Send a key press to the keyboard (high bit set automatically) */
    keyPress(ascii: number): void {
        this.keyboard.setKey(ascii);
    }

    /** Get paddle device for input handling */
    get paddle(): PaddleDevice {
        return this.paddleDevice;
    }

    /** Update paddle positions based on held keys (call once per frame) */
    updatePaddles(): void {
        this.paddleDevice.update();
    }

    /**
     * Get the underlying cpu6502 Machine wrapper.
     *
     * Use this for bus access, reset, or other Machine-level operations.
     * For CPU register access (A, X, Y, PC, etc.), use the `cpu` getter instead.
     */
    get cpuMachine(): Machine {
        return this.machine;
    }

    /**
     * Get the 6502 CPU (with registers A, X, Y, PC, P, S).
     *
     * Use this for direct CPU register access. For Machine-level operations
     * (bus, reset, step), use the `cpuMachine` getter instead.
     */
    get cpu(): CPU {
        return this.machine.cpu;
    }

    /** Get total cycles executed */
    get cycles(): number {
        return this.totalCycles;
    }

    /** Get current program counter */
    get pc(): number {
        return this.cpu.PC;
    }

    /** Get RAM device (for direct memory access in tests) */
    get memory(): RamDevice {
        return this.ram;
    }

    /** Get Language Card state (bank selection, read/write modes, RAM contents) */
    get languageCardState() {
        return this.languageCard.getState();
    }

    /** Check if Disk II controller is enabled */
    get hasDiskController(): boolean {
        return this.diskController !== undefined;
    }

    /**
     * Load a disk image into a drive (parses WOZ format).
     *
     * @param driveNumber - Drive to load into (1 or 2)
     * @param diskData - Raw WOZ disk data
     * @param filepath - Optional path for display name
     */
    loadDisk(driveNumber: 1 | 2, diskData: Uint8Array, filepath = ''): void {
        if (!this.diskController) {
            throw new Error('Disk II not enabled - disk-controller.bin ROM not loaded');
        }
        const image = new WozImage(diskData);
        this.diskController.loadDisk(driveNumber, image, filepath);
    }

    /**
     * Load a disk image from a file path.
     * Automatically detects format and converts DSK/DO/PO to WOZ.
     *
     * @param driveNumber - Drive to load into (1 or 2)
     * @param filePath - Absolute path to disk image file
     */
    async loadDiskFromPath(driveNumber: 1 | 2, filePath: string): Promise<void> {
        const wozData = await loadDiskImageFromPath(filePath);
        this.loadDisk(driveNumber, wozData, filePath);
    }

    /**
     * Get a disk drive by number.
     * Returns undefined if Disk II controller is not enabled.
     */
    getDrive(driveNumber: 1 | 2): DiskDrive | undefined {
        return this.diskController?.getDrive(driveNumber);
    }

    /**
     * Eject disk from a drive.
     * Removes the disk image, leaving the drive empty.
     */
    ejectDisk(driveNumber: 1 | 2): void {
        this.diskController?.ejectDisk(driveNumber);
    }

    /**
     * Get the display name of the disk in a drive.
     * Returns the filename without extension, or null if empty.
     */
    getDiskName(driveNumber: 1 | 2): string | null {
        const drive = this.getDrive(driveNumber);
        if (!drive?.image) {
            return null;
        }
        const filepath = drive.getDiskPath();
        if (!filepath) {
            return 'Unknown';
        }
        return extractBasename(filepath);
    }

    /**
     * Prepare the machine for state restoration.
     *
     * Cancels any pending async operations (like motor timeouts) that would
     * corrupt the restored state if they fire after the restore.
     */
    prepareForStateRestore(): void {
        this.diskController?.cancelMotorTimeout();
    }

    /**
     * Get disk controller state for save state.
     * Returns null if disk controller is not enabled.
     */
    getDiskControllerState(): import('../disk/index.js').DiskControllerState | null {
        return this.diskController?.getState() ?? null;
    }

    /**
     * Set disk controller state from save state.
     * Does nothing if disk controller is not enabled.
     */
    setDiskControllerState(state: import('../disk/index.js').DiskControllerState): void {
        this.diskController?.setState(state);
    }

    private enableDiskII(controllerRom: Uint8Array): void {
        // Create controller with cycle getter
        this.diskController = new DiskIIController(() => this.totalCycles);

        // Map controller ROM at $C600 (slot 6)
        this.machine.bus.mapDevice(new RomDevice(controllerRom), 0xc600 as any, {
            length: 0x100,
        });

        // Map controller I/O at $C0E0 (slot 6, offset $E0)
        this.machine.bus.mapDevice(this.diskController as any, 0xc0e0 as any, {
            length: 0x10,
        });
    }
}
