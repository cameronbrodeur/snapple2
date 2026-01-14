# Building and Running

## Build Commands

```bash
# Development (with tsx, no build needed)
npm start

# Build TypeScript to dist/
npm run build

# Clean build artifacts
npm run clean

# Format code
npm run format
npm run format:check
```

## ROM Management

The emulator requires 7 ROM files (not included in repo):
- `applesoft-d000.bin`, `applesoft-d800.bin`, `applesoft-e000.bin`
- `applesoft-e800.bin`, `applesoft-f000.bin`
- `monitor-f800.bin`, `character-rom.bin`

Each ROM must be exactly 2048 bytes (2KB).

### ROM Search Order

1. `--roms-dir <path>` CLI argument
2. `$SNAPPLE_ROMS_DIR` environment variable
3. `./roms/` directory
4. `~/.snapple2/roms/` directory

### ROM Commands

```bash
# Verify ROMs are properly loaded
npm start -- --verify-roms

# Run with custom ROM directory
npm start -- --roms-dir ~/my-roms
```

## Running the Emulator

```bash
# Basic usage
npm start

# With detailed profiler logging to /tmp/
npm start -- --log-profile

# With specific theme (green, amber, white, blue)
npm start -- --theme amber

# With disk images
npm start -- --disk1 dos33.dsk
npm start -- --disk1 work.woz --writable
npm start -- --disk1 ~/disks/dos33.woz --disk2 ~/disks/games.dsk
```

## CLI Options

| Option | Description |
|--------|-------------|
| `-r, --roms-dir <path>` | Directory containing ROM files |
| `--verify-roms` | Verify ROM files and exit |
| `--disk1 <path>` | Disk image for drive 1 (.woz, .dsk, .do, .po) |
| `--disk2 <path>` | Disk image for drive 2 |
| `--write-protect` | Force write-protect on loaded disks |
| `--writable` | Force disks writable (override protection) |
| `-t, --theme <name>` | Color theme: green (default), amber, white, blue |
| `--log-profile` | Enable detailed profiler logging to /tmp/ |
| `-h, --help` | Show help message |
| `-v, --version` | Show version number |

## Developing cpu6502 Locally

The `cpu6502` library is installed via git URL from GitHub. For active co-development:

```bash
# Clone cpu6502
git clone https://github.com/cameronbrodeur/cpu6502.git
cd cpu6502
npm install
npm run build

# In snapple2/package.json, temporarily change to file path:
# "cpu6502": "file:../cpu6502"

# When done, commit cpu6502 changes, push, and update snapple2 to use git URL
```

For cpu6502 APIs and extending the emulator, see [architecture.md](./architecture.md#cpu6502-library).
