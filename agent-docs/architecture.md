# Architecture

## Core Design Pattern: Layered Separation

The emulator uses a clean separation between the emulator core and UI:

```
UI Layer (React Ink)
  | calls
Apple2Machine (emulator core)
  | uses
cpu6502.Machine (6502 CPU with memory bus)
  | manages
MemoryDevices (RAM, ROM, soft switches, video, disk)
```

**Design Benefits:**
- **Emulator core is UI-agnostic** - Apple2Machine can be used in any environment
- **UI is swappable** - React Ink components can be replaced with browser Canvas
- **Memory devices are modular** - Easy to add peripherals (Disk II, Language Card, etc.)

## Project Structure

```
src/
  cli.tsx                 # Main CLI entry point
  emulator/               # Core emulator (Apple2Machine, constants, types)
  memory/                 # Memory devices (soft switches, keyboard, language card, paddles)
  video/                  # Video system and renderers (text, lores, hires)
  disk/                   # Disk II controller and WOZ handling
  rom/                    # ROM loading and management
  hooks/                  # React hooks for UI state management
  ui/                     # React Ink UI components
  shared/                 # Shared utilities (colors, key sequences)
  utils/                  # General utilities (format, ascii, profiler)
```

## Key Components

### Apple2Machine (`src/emulator/apple2-machine.ts`)

Central emulator class that integrates cpu6502 with Apple II hardware:

**State Management:**
- 48KB RAM, ROMs (Applesoft BASIC + Monitor), soft switches
- VideoSystem, KeyboardLatch, LanguageCard, PaddleDevice
- Optional DiskIIController (enabled if ROM present)

**Key Methods:**
- `step()` - Execute one instruction
- `runCycles(count)` - Execute specified cycles, returns actual executed
- `reboot()` - Cold boot (clears power-up byte, resets CPU)
- `getVideoBuffer()` - Get current video output (TerminalBuffer)
- `keyPress(ascii)` - Send key to keyboard latch

**Accessors:**
- `cycles` - Total cycles executed
- `pc` - Current program counter
- `videoState` - Current video mode/page state
- `hasDiskController` - Whether Disk II is enabled
- `paddle` - PaddleDevice for game controller input

### VideoSystem (`src/video/video-system.ts`)

Manages video modes and generates display buffer:

**Modes:**
- Text mode (40x24 characters)
- Lo-res graphics (40x48 pixels, 16 colors)
- Hi-res graphics (280x192 pixels, 6 colors)
- Mixed mode (graphics + 4-row text footer)

**Architecture:** Uses Strategy pattern with mode-specific renderers:
- `TextRenderer` - Pre-computes all 960 text cell addresses
- `LoResRenderer` - Unicode half-block rendering
- `HiResRenderer` - NTSC artifact color simulation

### SoftSwitchDevice (`src/memory/soft-switches.ts`)

Implements memory-mapped I/O at $C000-$C0FF using dispatcher pattern:

**Handlers:**
- `KeyboardSwitch` - Keyboard data ($C000-$C00F) and strobe ($C010)
- `VideoModeSwitch` - Video mode switches ($C050-$C057)
- `SpeakerSwitch` - Speaker toggle ($C030) - **stubbed, not yet implemented**
- `LanguageCardSwitch` - Bank switching ($C080-$C08F)
- `PaddleSwitch` - Game controller input ($C061-$C070)

### KeyboardLatch (`src/memory/keyboard-device.ts`)

Apple II keyboard with strobe bit (bit 7):
- `setKey(ascii)` - Store key with high bit set
- `read()` - Get current key data
- `clearStrobe()` - Clear bit 7 (accessed via $C010)
- `clear()` - Full reset (used during reboot)

### DiskIIController (`src/disk/disk-ii-controller.ts`)

Disk II floppy controller for slot 6:
- Two disk drives with independent state
- WOZ format support (WOZ1/WOZ2)
- Write support with dirty tracking
- Motor timeout simulation (1 second)

### LanguageCard (`src/memory/language-card.ts`)

16KB RAM expansion enabling Integer BASIC and other software:
- Bank 1 and Bank 2 RAM (4KB each at $D000-$DFFF)
- Upper RAM (8KB at $E000-$FFFF)
- Configurable read/write modes via soft switches

### PaddleDevice (`src/memory/paddle-device.ts`)

Game controller (joystick/paddle) emulation:
- 4 paddle inputs (PDL0-PDL3)
- 3 pushbuttons (PB0-PB2, including Open/Solid Apple)
- Keyboard-based paddle simulation:
  - PDL0 (horizontal): A/D keys or Left/Right arrows
  - PDL1 (vertical): W/S keys or Up/Down arrows

## Memory Map Reference

### Full Apple II Plus Memory Map

```
$0000-$00FF   Zero Page (256 bytes)
$0100-$01FF   Stack (256 bytes)
$0200-$03FF   Input buffer, system storage
$0400-$07FF   Text/Lo-res Page 1 (1KB, non-sequential layout!)
$0800-$0BFF   Text/Lo-res Page 2 (1KB)
$0C00-$1FFF   General RAM (5KB)
$2000-$3FFF   Hi-res Page 1 (8KB)
$4000-$5FFF   Hi-res Page 2 (8KB)
$6000-$BFFF   General RAM (24KB)
$C000-$C0FF   Soft Switches (256 bytes)
$C100-$C7FF   Peripheral Card ROM slots 1-7 (256 bytes each)
$C600-$C6FF   Disk II ROM (slot 6)
$C800-$CFFF   Expansion ROM (2KB)
$D000-$F7FF   Applesoft BASIC ROM / Language Card RAM (10KB)
$F800-$FFFF   Monitor ROM / Language Card RAM (2KB)
```

**Total RAM**: 48KB ($0000-$BFFF) + 16KB Language Card

### Soft Switch Addresses

| Address | Function |
|---------|----------|
| $C000-$C00F | Keyboard data (read returns last key with strobe) |
| $C010 | Clear keyboard strobe |
| $C030 | Speaker toggle (not implemented) |
| $C050-$C051 | Graphics/Text mode |
| $C052-$C053 | Full/Mixed mode |
| $C054-$C055 | Page 1/2 select |
| $C056-$C057 | Lo-res/Hi-res mode |
| $C061-$C063 | Pushbuttons 0-2 |
| $C064-$C067 | Paddle timers 0-3 |
| $C070 | Paddle trigger strobe |
| $C080-$C08F | Language Card bank switching |
| $C0E0-$C0EF | Disk II controller (slot 6) |

### Text Page Memory Layout

**IMPORTANT**: Text page memory is NOT sequential! Rows are organized in 3 groups of 8:

```
Rows  0-7:  Base + $000, $080, $100, $180, $200, $280, $300, $380
Rows  8-15: Base + $028, $0A8, $128, $1A8, $228, $2A8, $328, $3A8
Rows 16-23: Base + $050, $0D0, $150, $1D0, $250, $2D0, $350, $3D0
```

This is why TextRenderer pre-computes all 960 addresses.

### Character Encoding

| Range | Display |
|-------|---------|
| $00-$3F | Inverse characters (white on black) |
| $40-$7F | Flashing characters |
| $80-$FF | Normal characters |

### Interrupt Vectors

| Vector | Address | Function |
|--------|---------|----------|
| NMI | $FFFA-$FFFB | Non-maskable interrupt |
| RESET | $FFFC-$FFFD | Power-on/reset (points to Monitor) |
| IRQ/BRK | $FFFE-$FFFF | Interrupt request / break |

## Language Card

The emulator includes a 16KB Language Card.

### Soft Switches ($C080-$C08F)

| Address | Effect |
|---------|--------|
| $C080 | Read RAM bank 2, no write |
| $C081 | Read ROM, write RAM bank 2 (2 accesses required) |
| $C082 | Read ROM, no write |
| $C083 | Read/write RAM bank 2 (2 accesses required) |
| $C088-$C08B | Same as above but for bank 1 |

### Memory Regions

- $D000-$DFFF: 4KB bankable (Bank 1 or Bank 2 RAM, or ROM)
- $E000-$FFFF: 8KB (RAM or ROM, shared between banks)

**Note:** Two consecutive accesses to odd-numbered switches ($C081, $C083, $C089, $C08B) are required to enable writes. This prevents accidental writes during normal program execution.

## Timing and Execution

### Critical Timing Constants (`src/emulator/constants.ts`)

- CPU: 1.023 MHz (1,023,000 Hz)
- Target: 60 fps
- Cycles per frame: ~17,050 (`Math.floor(1_023_000 / 60)`)

### Run Loop (`src/hooks/use-execution.ts`)

The execution loop maintains cycle-accurate timing:
- Uses `performance.now()` for high-resolution timing
- Drift compensation via `cycleDebt` variable
- Calls `machine.runCycles(targetCycles)` each frame
- Updates paddle positions once per frame

## React Hooks Architecture

The UI uses custom hooks organized by responsibility:

### Core Hooks

**useEmulator** (`src/hooks/use-emulator.ts`)
- Coordinator hook that composes sub-hooks
- Manages running/paused state and cycle count
- **Note:** Receives machine instance, does not create it

**useExecution** (`src/hooks/use-execution.ts`)
- High-precision CPU run loop at 1.023 MHz
- Drift compensation for long-term accuracy
- **Note:** Receives running state, does not manage it

**useKeyboard** (`src/hooks/use-keyboard.ts`)
- Captures terminal keyboard input
- Converts to Apple II ASCII (uppercase, high bit set)
- Handles paddle key simulation

**useFunctionKeys** (`src/hooks/use-function-keys.ts`)
- Handles F1-F10 for emulator controls
- Separate from Apple II keyboard to avoid conflicts

### Dialog Hooks

**useDialogPause** (`src/hooks/use-dialog-pause.ts`)
- Manages dialog visibility (help, exit confirm, disk dialog)
- Automatic pause/resume when dialogs open/close
- Supports nested dialogs

**useDialogKeys** (`src/hooks/use-dialog-keys.ts`)
- Keyboard handling for dialogs (Esc, Y/N)
- Bypasses Ink's useInput for reliable dialog control

### State Hooks

**useDiskState** (`src/hooks/use-disk-state.ts`)
- Drive selection (active drive 1 or 2)
- Disk save, write protection toggle

**useDiskDialog** (`src/hooks/use-disk-dialog.ts`)
- Disk dialog operations (load, eject, create)

**useSaveState** (`src/hooks/use-save-state.ts`)
- Emulator state save/load (F6/F7)

**useStatusMessage** (`src/hooks/use-status-message.ts`)
- Transient status messages with auto-dismiss

### Utility Hooks

**useTerminalSize** - Terminal dimensions tracking
**useCursorBlink** - 1Hz cursor flash toggle
**useInputBlock** - Input blocking during dialogs

## cpu6502 Library

The emulator is built on the [cpu6502](https://github.com/cameronbrodeur/cpu6502) library which provides the 6502 CPU core.

### Key APIs

- `Machine` - CPU with memory bus
- `RamDevice` - RAM with read/write
- `RomDevice` - Read-only memory
- `MemoryDevice` interface - Implement for custom I/O devices
- `bus.mapDevice(device, address, options)` - Map device to address space

### Adding Memory-Mapped Devices

1. Implement `MemoryDevice` interface (`read()` and `write()` methods)
2. Map device in `apple2-machine.ts` constructor via `configureBus` callback
3. Use constants from `constants.ts` for addresses

## Adding New Features

### Adding Soft Switches

1. Create handler class implementing `SoftSwitchHandler`
2. Register in `SoftSwitchDevice` constructor
3. Add constant to `SOFT_SWITCH` or appropriate group in `constants.ts`

### Adding Video Modes

1. Create renderer implementing `VideoRenderer`
2. Update `VideoSystem.updateRenderer()` to instantiate it
3. Add mode to `VideoMode` enum in `emulator/types.ts`

### Adding Peripherals

1. Implement `MemoryDevice` interface from cpu6502
2. Map to appropriate address in `Apple2Machine` constructor
3. Add state to save/load system if needed

## Architecture Principles

1. **Separation of Concerns** - Emulator core has no UI dependencies
2. **Modularity** - Each device is a separate `MemoryDevice` implementation
3. **Testability** - Core components can be tested without UI
4. **Extensibility** - Video system supports multiple modes, peripheral slots are mappable
5. **Performance** - Cycle-accurate without sacrificing speed, 60fps UI independent of CPU
6. **Error Handling** - Configurable error policies (HALT, LOG_CONTINUE, IGNORE)
