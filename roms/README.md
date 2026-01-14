# Apple II ROM Files

This directory contains the Apple II Plus ROM files required by the Snapple ][ emulator.

---

## Quick Start

You need **7 ROM files** (all 2KB each):

```
applesoft-d000.bin  applesoft-d800.bin  applesoft-e000.bin
applesoft-e800.bin  applesoft-f000.bin  monitor-f800.bin
character-rom.bin
```

**Optional** - For Disk II support (256 bytes):
```
disk-controller.bin
```

Place them in this directory, or specify a custom location with `--roms-dir` or `$SNAPPLE_ROMS_DIR`.

---

## Required Files

All files are exactly **2,048 bytes (2KB)**:

### Applesoft BASIC ROMs (5 files = 10KB total)

| Filename | Address Range | Part # | SHA-256 |
|----------|---------------|--------|---------|
| `applesoft-d000.bin` | $D000-$D7FF | 341-0011 | `b45168834f01e11ae2cc35fc6bef153e5a13c180503c6533dff111558099df4d` |
| `applesoft-d800.bin` | $D800-$DFFF | 341-0012 | `468d36201974ecbe22efd9164f0ead1abab00b33f1a480da525502964641f444` |
| `applesoft-e000.bin` | $E000-$E7FF | 341-0013 | `2814de134e79213eddb6d7d7a18cba105e120a08e77c9767c46d6fc3cfcc593d` |
| `applesoft-e800.bin` | $E800-$EFFF | 341-0014 | `6848707531d7a8934a58e743483e4ebc74bf2ded0229b42533fa20cb89ed1a23` |
| `applesoft-f000.bin` | $F000-$F7FF | 341-0015 | `220fb70bac6839c98901cd542c3c1fbd7145d0bb9423ea8fcc8af0f16ec47d75` |

### System ROMs

| Filename | Address Range | Part # | SHA-256 |
|----------|---------------|--------|---------|
| `monitor-f800.bin` | $F800-$FFFF | 341-0020 | `29465303e7844fa56a8c846d0565e45f5ee082f98f2ccf1b261de4a7e902201b` |
| `character-rom.bin` | N/A (video only) | 7341-0036 | `08f5d22230481019844492dde0a29a018cb193712a9e4a43770a3870608f28de` |

**Note**: ROMs are split to match the physical Apple II+ ROM chip organization (2716 EPROMs).

### Disk II Controller ROM (Optional)

| Filename | Address Range | Part # | Size | SHA-256 |
|----------|---------------|--------|------|---------|
| `disk-controller.bin` | $C600-$C6FF (Slot 6) | 341-0027 (P5A) | 256 bytes | `[TBD - add when ROM obtained]` |

**Optional**: The emulator runs without this ROM, but Disk II will be disabled.

#### Description

The Disk II controller ROM contains the boot code that loads DOS/ProDOS from disk. This is the standard P5A ROM used in Apple Disk II controller cards.

#### Acquisition

The Disk II controller ROM can be obtained from:
- Dumped from original Disk II controller card
- Extracted from Apple II system disk images
- Various Apple II preservation archives

**Part Number:** 341-0027 (P5A ROM)

#### Verification

Correct file size:
```bash
ls -l disk-controller.bin
# Should show: 256 bytes
```

Expected SHA-256 (P5A ROM):
```
[TBD - add checksum when ROM is obtained]
```

#### Without Disk Controller ROM

If `disk-controller.bin` is not present:
- Emulator will start normally
- Disk II will be disabled
- Console will show: "Disk II controller ROM not found - Disk II disabled"
- All other features work normally

---

## Getting ROMs

**Important**: These ROM files are copyrighted by Apple Inc. We do not provide or distribute ROM files.

### How to Obtain

**Option 1: Extract from Original Hardware**
- If you own an Apple II, you can legally extract ROMs using an EPROM reader

**Option 2: Internet Archive / Preservation Projects**
- Search for: "Apple II Plus ROM dump", "Applesoft BASIC ROM", "Apple II Monitor ROM"
- Always ensure you have legal rights to use any ROM files

**Option 3: Open Source Alternatives**
- Check [OpenApple](https://github.com/topics/apple-ii) projects
- Homebrew Apple II ROMs (if available)

### Legal Notice

Apple II ROM files are copyrighted by Apple Inc. Users are responsible for ensuring they have legal rights to use any ROM files with this emulator. The Snapple ][ developers do not provide, distribute, or endorse the distribution of copyrighted ROM files.

This emulator is provided for educational and preservation purposes. Please respect intellectual property rights.

---

## Verification

### Check File Sizes

```bash
ls -lh *.bin

# Expected output (all files 2.0K):
# -rw-r--r--  2.0K  applesoft-d000.bin
# -rw-r--r--  2.0K  applesoft-d800.bin
# -rw-r--r--  2.0K  applesoft-e000.bin
# -rw-r--r--  2.0K  applesoft-e800.bin
# -rw-r--r--  2.0K  applesoft-f000.bin
# -rw-r--r--  2.0K  monitor-f800.bin
# -rw-r--r--  2.0K  character-rom.bin
```

### Verify Checksums

**Automated verification** (recommended):
```bash
shasum -a 256 -c SHA256SUMS
```

**Manual verification**:
```bash
shasum -a 256 *.bin
# Compare output with table above - all checksums should match
```

---

## ROM Search Locations

Snapple searches for ROMs in this order:

1. **Environment variable**: `$SNAPPLE_ROMS_DIR`
   ```bash
   export SNAPPLE_ROMS_DIR=~/my-apple-roms
   snapple
   ```

2. **CLI argument**: `--roms-dir`
   ```bash
   snapple --roms-dir ~/my-apple-roms/
   ```

3. **Project directory**: `./roms/` (current working directory)

4. **User home**: `~/.snapple2/roms/`

---

## Troubleshooting

### "ROM file not found" Error

**Check**:
1. All 7 files are named correctly (no spaces):
   - `applesoft-d000.bin`, `applesoft-d800.bin`, `applesoft-e000.bin`
   - `applesoft-e800.bin`, `applesoft-f000.bin`
   - `monitor-f800.bin`, `character-rom.bin`
2. Files are in one of the search locations above
3. Files are readable: `ls -l *.bin`

### "Invalid ROM size" Error

**Verify** all ROMs are exactly **2,048 bytes**:
```bash
ls -l *.bin | awk '{print $5, $9}'

# All should show: 2048
```

### Getting Help

- Check the main [README.md](../README.md) for usage instructions
- Open an issue on GitHub (don't share ROM files)
- See Technical Details section below for more info

---

## Technical Details

### Why 7 Separate ROM Files?

**Historical Accuracy**: The Apple II+ motherboard has physical sockets for each ROM chip (2716 EPROMs, 2KB each).

**Authenticity**: ROM dumps from real hardware are 2KB per chip, matching physical EPROM size.

**Flexibility**:
- Verify each ROM independently
- Swap individual ROMs for custom versions
- Patch specific ROMs without affecting others

### Physical ROM Organization

The Apple II+ uses seven 2716 EPROM chips:

**Applesoft BASIC** (5 chips):
- ROM 1 (341-0011): $D000-$D7FF - `applesoft-d000.bin`
- ROM 2 (341-0012): $D800-$DFFF - `applesoft-d800.bin`
- ROM 3 (341-0013): $E000-$E7FF - `applesoft-e000.bin`
- ROM 4 (341-0014): $E800-$EFFF - `applesoft-e800.bin`
- ROM 5 (341-0015): $F000-$F7FF - `applesoft-f000.bin`

**System Monitor** (1 chip):
- Monitor (341-0020): $F800-$FFFF - `monitor-f800.bin`

**Character Generator** (1 chip):
- Character ROM (7341-0036): Not memory-mapped - `character-rom.bin`

### Memory Map

```
$D000 ┌─────────────────────┐
      │ Applesoft ROM 1     │  applesoft-d000.bin (2KB)
$D800 ├─────────────────────┤
      │ Applesoft ROM 2     │  applesoft-d800.bin (2KB)
$E000 ├─────────────────────┤
      │ Applesoft ROM 3     │  applesoft-e000.bin (2KB)
$E800 ├─────────────────────┤
      │ Applesoft ROM 4     │  applesoft-e800.bin (2KB)
$F000 ├─────────────────────┤
      │ Applesoft ROM 5     │  applesoft-f000.bin (2KB)
$F800 ├─────────────────────┤
      │ Monitor ROM         │  monitor-f800.bin (2KB)
$FFFF └─────────────────────┘

      Character Generator ROM (not memory-mapped)
      Used by video system for text display
```

### How Snapple Loads ROMs

The emulator loads each ROM file individually and maps it to the correct address range:

```typescript
// Load individual Applesoft ROM files
const appleSoftRoms = [
    { file: 'applesoft-d000.bin', base: 0xD000 },
    { file: 'applesoft-d800.bin', base: 0xD800 },
    { file: 'applesoft-e000.bin', base: 0xE000 },
    { file: 'applesoft-e800.bin', base: 0xE800 },
    { file: 'applesoft-f000.bin', base: 0xF000 },
];

// Map each ROM to its address range
for (const rom of appleSoftRoms) {
    const data = loadRomFile(rom.file);
    const romDevice = new RomDevice(data);
    bus.mapDevice(romDevice, rom.base, { length: 0x0800 }); // 2KB
}

// Map Monitor ROM
const monitorRom = new RomDevice(loadRomFile('monitor-f800.bin'));
bus.mapDevice(monitorRom, 0xF800, { length: 0x0800 });

// Character ROM (used by video system, not mapped to CPU bus)
const characterRom = loadRomFile('character-rom.bin');
videoSystem.setCharacterRom(characterRom);
```

---

## Advanced

### Splitting a Combined ROM

Some emulators use a single combined `applesoft.rom` (10KB). If you have one, split it:

```bash
# Split 10KB applesoft.rom into 5 separate 2KB files
dd if=applesoft.rom of=applesoft-d000.bin bs=2048 count=1 skip=0
dd if=applesoft.rom of=applesoft-d800.bin bs=2048 count=1 skip=1
dd if=applesoft.rom of=applesoft-e000.bin bs=2048 count=1 skip=2
dd if=applesoft.rom of=applesoft-e800.bin bs=2048 count=1 skip=3
dd if=applesoft.rom of=applesoft-f000.bin bs=2048 count=1 skip=4

# Verify the split worked
ls -l applesoft-*.bin
# Each file should be exactly 2048 bytes
```

### References

- [Apple II Reference Manual](https://archive.org/details/apple-ii-reference-manual-1979)
- [Understanding the Apple II](https://archive.org/details/understanding_the_apple_ii) by Jim Sather (Chapter 8: ROMs)
- [Visual 6502](http://www.visual6502.org/)

---

**Total**: 7 files × 2KB each = 14KB of ROM files required
