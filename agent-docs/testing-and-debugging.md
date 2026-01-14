# Testing and Debugging

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/video/text-renderer.test.ts
```

## Manual Testing

The emulator boots to Applesoft BASIC. Test basic functionality:

```basic
]PRINT "HELLO WORLD"
]FOR I=1 TO 10: PRINT I: NEXT
]POKE 1024,193: REM Write 'A' to top-left of screen
```

## Keyboard Controls

### Emulator Controls (Function Keys)

| Key | Action |
|-----|--------|
| F1 | Toggle help dialog |
| F2 | Cycle status bar mode |
| F3 | Pause/Resume |
| F4 | Open disk dialog |
| F5 | Save disk changes |
| F6 | Save emulator state (snapshot) |
| F7 | Load emulator state (restore) |
| F9 | Reboot (with confirmation) |
| F10 | Quit (with confirmation if unsaved) |

### Apple II Keys

All other keys pass through to the Apple II:

| Key | Apple II Equivalent |
|-----|---------------------|
| A-Z, 0-9 | Converted to uppercase with high bit set |
| Return | $8D (Ctrl+M) |
| Escape | $9B (Ctrl+[) |
| Arrows | Ctrl+H/J/K/U |
| Ctrl+@ | BREAK signal ($83) |

**IMPORTANT**: Ctrl+C kills the terminal process and cannot be remapped. Use Ctrl+@ for Apple II BREAK.

## Performance Profiling

Press F2 to cycle through status bar modes until you reach the Profiler view.
Shows frame timing, cycle execution stats, CPU speed, and detects timing drift.

For detailed logging to `/tmp/`:
```bash
npm start -- --log-profile
```

## Debugging Disk Issues

See [disk-ii-controller.md](./disk-ii-controller.md#debugging-disk-issues) for disk-specific debugging.

## Common Debug Scenarios

### Emulator Won't Start

1. Check ROM files exist and are correct size (2KB each)
2. Run `npm start -- --verify-roms` to validate
3. Check console for error messages

### Keyboard Input Not Working

1. Verify terminal is in raw mode
2. Check if a dialog is open (dialogs block input)
3. Test with simple keys (letters, numbers)

### Video Display Issues

1. Check terminal size (minimum 102x33 for text mode, 285x104 for hi-res)
2. Verify terminal supports Unicode and 256 colors
3. Try different themes (`--theme amber`)

### Performance Issues

1. Enable profiling (F2 to cycle to Profiler mode)
2. Check for timing drift in profiler output
3. Monitor CPU usage during execution

## Test Structure

Tests mirror the source structure:

```
tests/
  diagnostic/     # Integration tests (boot, video, UI, keyboard)
  disk/           # Disk controller and format tests
  hooks/          # React hook tests
  memory/         # Memory device tests (language card, paddle)
  shared/         # Shared utility tests
  ui/             # UI component tests
  utils/          # Utility function tests
  video/          # Video renderer tests
```

## Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
    it('should do something specific', () => {
        // Arrange
        const input = createTestInput();

        // Act
        const result = componentFunction(input);

        // Assert
        expect(result).toBe(expectedValue);
    });
});
```

## Integration Testing

See [integration-testing-checklist.md](./integration-testing-checklist.md) for comprehensive manual testing procedures.
