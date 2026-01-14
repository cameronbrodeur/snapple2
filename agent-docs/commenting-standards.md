# Commenting Standards

This document defines the consistent commenting style used throughout the codebase.

## Guiding Principle

**Public APIs get full JSDoc (for tooling), internals get concise comments (for clarity).**

The goal is to provide excellent developer experience through IntelliSense and hover documentation for public APIs, while keeping internal implementation code clean and self-documenting.

## File-Level Comments

**Every file** must start with a JSDoc block comment explaining its purpose:

```typescript
/**
 * Brief description of the module's purpose.
 *
 * Optional: Additional context about what this module does,
 * what problems it solves, or how it fits into the larger system.
 */
```

### Examples

**Utilities:**
```typescript
/**
 * Hexadecimal formatting utilities.
 * Convert numeric values to uppercase hex strings with consistent padding.
 */
```

**Disk I/O:**
```typescript
/**
 * Disk II controller implementation.
 *
 * Maps to $C0E0-$C0EF in slot 6, handles soft switches for motor control,
 * drive selection, stepper motor, and data read/write. Manages two drives
 * and coordinates with Logic State Sequencer for bit-level I/O.
 */
```

**Hooks:**
```typescript
/**
 * Emulator state management hook.
 *
 * Manages emulator state (running/paused, help/status visibility) and provides
 * control actions (reset, save/load state, disk operations). Does NOT manage
 * execution loop timing - that's handled by useExecution.
 */
```

## Function Comments

### Exported/Public Functions → Full JSDoc

**Use JSDoc format** for all exported functions, public class methods, and hooks:

```typescript
/**
 * Load a disk image with automatic format conversion.
 *
 * Detects format (.woz, .dsk, .do, .po) and converts DSK/DO/PO to WOZ
 * before loading into the specified drive. Supports write protection
 * control via optional flags.
 *
 * @param machine - Apple2Machine instance
 * @param driveNumber - Drive 1 or 2
 * @param diskPath - Path to disk image file
 * @param writeProtect - Force write protection (overrides file flag)
 * @param writable - Force writable (overrides protection)
 */
export async function loadDiskImage(
    machine: Apple2Machine,
    driveNumber: 1 | 2,
    diskPath: string,
    writeProtect?: boolean,
    writable?: boolean
): Promise<void> {
    // Implementation...
}
```

**Benefits:**
- VSCode IntelliSense shows full documentation on hover
- Parameter tooltips appear when calling the function
- `@param` tags document constraints and valid values
- Return values are documented with `@returns`
- Examples can be included with `@example`

**Use for:**
- Exported functions (`export function ...`)
- Public class methods (methods called from outside the class)
- React hooks (`use*` functions)
- Functions with complex parameters or behavior
- Functions that are part of a public API

### Internal/Private Functions → Single-Line Comments

**Use single-line comments** for internal helpers and private methods:

```typescript
// Get disk status string for display (e.g., ">D1:* WP")
function getDiskStatus(machine: Apple2Machine, driveNum: 1 | 2): string {
    // Implementation...
}

// Convert ASCII to Apple II format (high bit set, uppercase)
function toAppleAscii(char: string): number {
    const code = char.toUpperCase().charCodeAt(0);
    return code | 0x80;
}
```

**Use for:**
- Internal helper functions (not exported)
- Private class methods
- Functions obvious from name and type signature
- Functions only used within the same file

### Public Class Methods → JSDoc

Public methods should have full JSDoc since they're called from other files:

```typescript
export class DiskDrive {
    /**
     * Write a byte to the current track position.
     *
     * Uses copy-on-write buffer to track modifications. Only writes
     * if drive is not write-protected and motor is running.
     *
     * @param value - Byte value to write (0-255)
     * @returns true if write succeeded, false if blocked by protection
     */
    writeByte(value: number): boolean {
        // Implementation...
    }

    // Private helper - single line is fine
    // Advance head position by one bit
    private advanceHead(): void {
        // Implementation...
    }
}
```

## Internal Comments

**Inline comments** should be used sparingly and only when:
- The code is non-obvious
- There's important context that isn't clear from the code itself
- You're explaining a workaround or constraint

```typescript
// Read reset vector from $FFFC/$FFFD (little-endian)
const vectorLo = bus.read(toWord(VECTOR_RESET));
const vectorHi = bus.read(toWord(VECTOR_RESET + 1));

// WOZ1 and WOZ2 both have write-protect at byte 22
wozData[22] = newValue;

// Motor doesn't stop immediately - 1 second timeout matches real hardware
this.motorTimeout = totalCycles + MOTOR_TIMEOUT_CYCLES;
```

## Section Separators

**DO NOT use section separators** in implementation files.

❌ **Avoid:**
```typescript
// === Section Name ===
// ──────────────────────────────────────────────
```

The code structure itself should be clear enough without visual separators.

**Exception:** `constants.ts` uses section separators because it's a large collection of related constants:

```typescript
// ──────────────────────────────────────────────────────────
// 6502 Architecture Constants
// ──────────────────────────────────────────────────────────
```

## Type Definitions

**Type definitions** don't need individual comments unless they're complex or non-obvious:

```typescript
// This is clear from the name and structure - no comment needed
export type RegisterSnapshot = {
    A: number;
    X: number;
    Y: number;
    PC: number;
    S: number;
    P: number;
};

// This needs explanation - add a comment
export type EditModeState = {
    pane: 'memory' | 'registers';
    // For memory editing
    address?: number; // The memory address being edited
    column?: number; // The byte column (0-15) within the row
    // For register editing
    register?: RegisterKey; // Which register is selected
    // Common
    input: string; // The hex value being typed
    error?: string;
};
```

## Constants

**Exported constants** should have JSDoc comments explaining their purpose:

```typescript
/**
 * Number of bytes displayed per row in memory view.
 */
export const MEMORY_BYTES_PER_ROW = 16;

/**
 * 6-and-2 nibble lookup table for encoding sector data.
 * Maps 6-bit values (0-63) to valid disk nibbles.
 */
const NIBBLE_6_AND_2: ReadonlyArray<number> = [
    0x96, 0x97, 0x9a, 0x9b, // ...
];
```

## React Components

**React components** should have file-level comments like any other file.

Component functions themselves don't need separate comments - the props interface serves as documentation:

```typescript
/**
 * Status bar component.
 *
 * Displays emulator status (running/paused), video mode, disk status,
 * keyboard shortcuts, and status messages.
 */

import { Box, Text } from 'ink';

export interface StatusBarProps {
    running: boolean;
    videoMode: VideoMode;
    visible: boolean;
    // ... props document the component API
}

// Component function - props interface is self-documenting
export function StatusBar({ running, videoMode, visible }: StatusBarProps) {
    // ...
}
```

## What NOT to Comment

Don't add comments for things that are obvious from the code:

❌ **Avoid:**
```typescript
// Set the mode to paused
setMode('paused');

// Add 1 to the counter
setCount(count + 1);

// Return true
return true;
```

✅ **Good:**
```typescript
// Only clear state if we're actually in edit mode
if (editMode) {
    setEditMode(null);
}

// Quarter-track precision (160 positions = 40 tracks × 4)
const quarterTrackPosition = Math.floor(this.headPosition / 2);
```

## Summary

**Consistent commenting rules:**

1. ✅ Every file has a JSDoc header explaining its purpose
2. ✅ **Exported functions** have **full JSDoc** with `@param` tags (for IntelliSense)
3. ✅ **Internal helpers** have **single-line comments** (concise)
4. ✅ **Public class methods** have **full JSDoc** (for API documentation)
5. ✅ **Private class methods** have **single-line comments** (or none if obvious)
6. ✅ Internal comments only when necessary (non-obvious logic)
7. ❌ No section separator comments (except constants.ts)
8. ❌ No obvious/redundant comments

**The distinction:**
- **Public API** (exported, called from other files) → Full JSDoc with `@param` tags
- **Internal implementation** (private, same-file helpers) → Single-line or no comment

**The goal:** Excellent developer experience for public APIs through tooling, while keeping implementation code clean and self-documenting. Comments explain *why* and *what* (for APIs), not *how* (code shows that).
