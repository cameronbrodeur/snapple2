# Disk II Controller

**Status:** Phase 3 complete - Write support with format preservation

For CLI usage (loading disks, write protection options), see [building-and-running.md](./building-and-running.md#cli-options).

## Keyboard Controls

- **F4**: Open disk dialog (load, eject, create disks)
- **F5**: Save disk changes to original file
- **In Disk Dialog**: W toggles write protection

## Status Indicators

- `D1 WP ●` - Drive 1, write-protected, unsaved changes
- `D1 RW` - Drive 1, writable, no changes

## ROM Requirements

Disk II requires `disk-controller.bin` (256 bytes) in the ROM directory. Without this ROM, the emulator runs but Disk II is disabled.

## Supported Formats

| Extension | Format | Notes |
|-----------|--------|-------|
| `.woz` | WOZ1/WOZ2 | Native format, best compatibility |
| `.dsk`, `.do` | DOS 3.3 sector order | Auto-converted to WOZ |
| `.po` | ProDOS sector order | Auto-converted to WOZ |

## DSK Conversion Tool

```bash
# Convert DSK to WOZ
npx tsx tools/convert-dsk.ts input.dsk output.woz

# Test converted disk boots
npx tsx tools/test-dsk-boot.ts input.dsk
```

## Architecture

### Components

- `DiskIIController` - Soft switch handler at $C0E0-$C0EF
- `DiskDrive` - Drive state (motor, head, rotation)
- `WozImage` - Format parser and bit-level reader

### Memory Map

- `$C600-$C6FF`: Controller ROM (slot 6)
- `$C0E0-$C0EF`: Controller I/O (16 soft switches)

### Cycle Timing

- Uses `Apple2Machine.totalCycles` for disk rotation
- Tracks cycle remainder for fractional bits
- Cross-track synchronization (Applesauce formula)

## Debugging Disk Issues

### WOZ Structure Inspection

```bash
npx tsx tools/dump-woz.ts disk.woz
```

Shows:
- Format version (WOZ1/WOZ2)
- Write protection status
- Optimal timing
- Track map and sizes
- Sample data from track 0

### Common Issues

**Disk won't boot:**
- Verify ROM file: `disk-controller.bin` must be exactly 256 bytes
- Check WOZ format: Use dump-woz tool to verify structure
- Check file path: Use absolute path or path relative to CWD

**Controller not responding:**
- Verify ROM loaded: Check console output on startup
- Verify disk loaded: Check console for "Loaded disk" message

## Implementation Details

### Stepper Motor

- 4-phase motor controlled by $C0E0-$C0E7
- Position lookup tables from apple2ts
- Quarter-track precision (160 positions = 40 tracks x 4)

### Logic State Sequencer (LSS)

- Hardware state machine that assembles bits into bytes
- Self-clocking encoding: all valid bytes have bit 7 set
- Special sync handling: don't shift on 0 bit after complete byte

### Motor Timeout

- Motor doesn't stop immediately on MOTOR_OFF
- 1 second timeout (matches real hardware)
- Preserves state if MOTOR_ON accessed within timeout

### Conservative Read Approach

- Only $C0E8 (MOTOR_OFF) and $C0EC (LATCH_OFF) return data
- Matches apple2ts proven approach
- Works with widest variety of disk images
