# Common Pitfalls

## Text Page Memory Layout

**Problem**: Don't iterate sequentially through $0400-$07FF expecting to get row-by-row text.

**Why**: Apple II text page memory is NOT sequential - rows are organized in 3 groups of 8 with interleaved offsets. See [architecture.md](./architecture.md#text-page-memory-layout) for the full layout.

**Solution**: Use the pre-computed addresses in `TextRenderer` or calculate using the proper offset formula.

## High Bit on Characters

**Problem**: Apple II characters have bit 7 set (high bit). Terminal ASCII does not.

**Solution**: Convert between formats:
```typescript
// Terminal → Apple II (input)
const appleChar = terminalChar | 0x80;

// Apple II → Terminal (output)
const terminalChar = appleChar & 0x7F;
```

See `src/utils/ascii.ts` for conversion utilities.

## Keyboard Strobe

**Problem**: Reading $C000 returns the last key with strobe bit (bit 7). If you don't clear it, the Apple II thinks the key is still held.

**Solution**: Always read $C010 to clear the strobe after reading the key.

## CPU Timing Drift

**Problem**: Using `setInterval()` alone causes timing drift over time.

**Solution**: Always:
1. Use `performance.now()` for actual elapsed time
2. Calculate target cycles from elapsed time
3. Track cycle debt across frames

See `src/hooks/use-execution.ts` for the correct implementation.

## ROM File Sizes

**Problem**: Each ROM must be exactly 2048 bytes (2KB). The Monitor ROM at $F800-$FFFF is 2KB, not 2049 bytes.

**Solution**: Watch for off-by-one errors when extracting ROM files. Verify sizes with `--verify-roms`.

## cpu6502 Branded Types

**Problem**: The cpu6502 library uses branded types (`Word`, `Byte`) for type safety. Direct numeric literals fail type checking.

**Solution**: Cast when necessary:
```typescript
// This fails type checking
this.ram.write(0x03f4, 0x00);

// Cast when needed
this.ram.write(0x03f4 as any, 0x00 as any);

// Or use constants with proper typing
this.ram.write(MEMORY.POWER_UP_BYTE as any, 0x00 as any);
```

## Warm vs Cold Boot

**Problem**: Apple II Monitor ROM checks power-up byte at $03F4. If `($03F4 EOR #$A5) == $03F3`, it performs a warm start (BASIC prompt) instead of cold boot (disk boot).

**Solution**: Clear $03F4 before reset to force cold boot:
```typescript
this.ram.write(MEMORY.POWER_UP_BYTE as any, 0x00 as any);
this.machine.reset();
```

## Ctrl+C in Terminal

**Problem**: Ctrl+C kills the terminal process and cannot be remapped to Apple II BREAK.

**Solution**: Use Ctrl+@ (Ctrl+Shift+2) to send BREAK ($83) to the Apple II instead.

## Dialog Input Blocking

**Problem**: When a dialog is open, input should be blocked from reaching the emulator but dialogs still need to handle their own keys.

**Solution**: Use the two-level input blocking system:
- `useInputBlock()` for regular Apple II input
- Direct `process.stdin` listeners for dialog keys (bypasses Ink's useInput)

## ES Module Imports

**Problem**: TypeScript with ES modules requires `.js` extensions in imports, even for `.ts` files.

**Solution**: Always use `.js` extension:
```typescript
// Correct
import { Apple2Machine } from './emulator/apple2-machine.js';

// Wrong (will fail at runtime)
import { Apple2Machine } from './emulator/apple2-machine';
```

## React Hook Dependencies

**Problem**: Missing dependencies in React hooks cause stale closures.

**Solution**: Always include all referenced values in dependency arrays:
```typescript
// Include 'running' in dependencies
const handleDialogOpen = useCallback(() => {
    wasRunningBeforeDialog.current = running;
}, [running]);  // <- Don't forget this!
```

## Disk II Boot Order

**Problem**: Expecting Apple II to auto-boot from drive 2 if drive 1 is empty.

**Reality**: Standard Disk II boot ROM at $C600 only attempts to boot from drive 1. There is no automatic fallback to drive 2.
