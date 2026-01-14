# Project Overview

**Snapple ][** is a cycle-accurate Apple II Plus emulator built in TypeScript for the terminal using React Ink. It's built on top of the [cpu6502](https://github.com/cameronbrodeur/cpu6502) library, which provides the 6502 CPU core.

## Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Text Mode MVP | Complete |
| 2 | Graphics Modes | Complete |
| 3 | Disk II Controller | Complete |
| 4 | Speaker Audio | Designed |
| 5 | Browser Port | Future |

## Completed Features

### Graphics Modes

**Lo-res graphics** (40x48, 16 colors):
- Unicode half-block rendering
- ANSI 256-color palette
- Mixed mode support (graphics + 4-row text footer)

**Hi-res graphics** (280x192, 6 colors):
- Wide mode with half-block rendering (280x96 terminal cells, square pixels)
- NTSC artifact coloring (purple, green, blue, orange, white, black)
- Cross-byte adjacency for accurate color transitions
- Mixed mode support

### Language Card

16KB Language Card for Integer BASIC support. See [architecture.md](./architecture.md#language-card) for details.

### Disk II Controller

Full read/write support with multiple formats. See [disk-ii-controller.md](./disk-ii-controller.md) for details.

### Paddle/Joystick Support

Keyboard-based paddle simulation for game controller input. See [architecture.md](./architecture.md#paddledevice-srcmemorypaddle-devicets) for details.

### UI Features

- **Help Dialog** (F1): Keyboard shortcuts and emulator info
- **Status Bar** (F2): Cycle through Minimal → Full → Profiler → Hidden modes
- **Pause/Resume** (F3): Pause and resume emulation
- **Disk Dialog** (F4): Load, eject, create blank disks, toggle write protection
- **Save Disk** (F5): Save modified disk tracks to file
- **Snapshot/Restore** (F6/F7): Persist and restore emulator state
- **Reboot** (F9): Cold boot with confirmation
- **Quit** (F10): Exit emulator with confirmation if unsaved changes

## Planned Features

| Feature | Design | Implementation |
|---------|--------|----------------|
| Speaker Audio | Complete | Pending |
| Browser Port | Not started | Future |

## External Resources

- **Apple II Reference Manual**: https://archive.org/details/apple-ii-reference-manual-1979
- **Understanding the Apple II** (Jim Sather): https://archive.org/details/understanding_the_apple_ii
- **cpu6502 Documentation**: https://github.com/cameronbrodeur/cpu6502
- **6502.org**: http://www.6502.org/ (6502 instruction reference)
- **AppleWin Source**: https://github.com/AppleWin/AppleWin (reference implementation)
