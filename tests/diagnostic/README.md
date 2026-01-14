# Diagnostic Tests

This directory contains diagnostic and integration tests for Snapple ][. These are manual tests that help verify functionality and debug issues during development.

## Running Tests

All tests can be run directly with tsx:

```bash
npx tsx tests/diagnostic/<test-name>.ts
```

Or make them executable and run directly:

```bash
chmod +x tests/diagnostic/<test-name>.ts
./tests/diagnostic/<test-name>.ts
```

---

## Integration Tests

### test-boot.ts

**Purpose:** Validates that Apple2Machine boots correctly and can execute instructions.

**What it tests:**
- ROM loading
- Machine creation and reset
- Instruction execution (step and runCycles)
- Keyboard input
- Video buffer access

**Expected output:**
```
=== Apple2Machine Boot Test ===
✅ ROMs loaded successfully
✅ Machine created successfully
✅ Machine reset complete
...
=== All Tests Passed ===
```

**Run:**
```bash
npx tsx tests/diagnostic/test-boot.ts
```

---

### test-video.ts

**Purpose:** Tests that the video system correctly renders text from memory.

**What it tests:**
- Empty buffer rendering
- Writing to text page 1 memory ($0400)
- Character rendering (Apple II ASCII codes)
- Row addressing (rows 0, 1, 23)
- Performance benchmarks

**Expected output:**
- Renders "HELLO WORLD" on row 0
- Renders "APPLE ][" on row 1
- Renders "ROW 23" on row 23
- Performance metrics (should be < 1ms per render)

**Known issues:**
- Row 0 may show ANSI escape codes for inverse video characters (e.g., `[7mH[27m`)
- This is normal - the first character ($C8 = 'H') triggers inverse video rendering

**Run:**
```bash
npx tsx tests/diagnostic/test-video.ts
```

---

### test-emulator-ui.ts

**Purpose:** Tests that the emulator UI components work correctly.

**What it tests:**
- Machine creation and initialization
- Cycle execution
- Video buffer retrieval
- Video state flags
- Screen rendering (first 5 rows)

**Expected output:**
```
=== Emulator UI Test ===
✅ Execution working
✅ Video buffer working
✅ Video state working
=== All Tests Passed ===
```

**Run:**
```bash
npx tsx tests/diagnostic/test-emulator-ui.ts
```

---

### test-emulator-startup.ts

**Purpose:** Tests that the full EmulatorApp UI can start without errors.

**What it tests:**
- ROM loading
- EmulatorApp component rendering
- React hooks initialization
- Auto-exit after 2 seconds

**Known issues:**
- Requires terminal size ≥ 44×27 characters
- May fail if stdin is not a TTY (e.g., when run in some CI environments)
- "Raw mode not supported" error is expected in non-interactive terminals

**Run:**
```bash
# Requires interactive terminal with sufficient size
npx tsx tests/diagnostic/test-emulator-startup.ts
```

---

## Debug Utilities

### debug-keys.js

**Purpose:** Shows exactly what escape sequences your terminal sends for each key press.

**Use cases:**
- Debugging function key support (F1-F12)
- Understanding terminal keyboard behavior
- Diagnosing why certain keys don't work
- Terminal compatibility testing

**How to use:**
```bash
node tests/diagnostic/debug-keys.js
```

Then press keys to see their raw escape sequences:
- Press F1, F2, F3, etc. to see function key sequences
- Press Ctrl+letter to see control codes
- Press Ctrl+C to exit

**Example output:**
```
Key pressed:
  Raw input:    "\u001bOP"
  Hex bytes:    0x1b 0x4f 0x50
  Key object:   {"sequence":"\u001bOP","name":"f1","ctrl":false}
```

---

### debug-screen.js

**Purpose:** Dumps screen memory contents to help diagnose display issues.

**Use cases:**
- Debugging why Applesoft prompt doesn't appear
- Checking if ROM is writing to screen memory
- Verifying reset vector
- Inspecting ROM contents

**What it does:**
1. Creates machine and runs for 1,000,000 cycles
2. Dumps first row of text memory ($0400-$0427)
3. Dumps last row of text memory ($0750-$0777)
4. Lists all non-zero bytes in screen memory
5. Checks reset vector at $FFFC
6. Samples Monitor ROM at $F800

**Run:**
```bash
npx tsx tests/diagnostic/debug-screen.js
```

**Expected output:**
```
Loading ROMs...
Creating machine...
Running for 1,000,000 cycles...
Total cycles executed: 1000001
PC: $XXXX

=== Screen Memory ($0400-$0427, first row) ===
A0 A0 A0 A0 C1 D0 D0 CC C5 ... (hex bytes)

=== Checking for non-zero values in screen memory ===
Found XX non-zero bytes in screen memory
...
```

---

### test-fkeys.tsx

**Purpose:** Interactive test for function key detection in Ink.

**Use cases:**
- Debugging function key handling
- Testing useFunctionKeys hook
- Terminal keyboard debugging

**How to use:**
```bash
npx tsx tests/diagnostic/test-fkeys.tsx
```

Press F1-F6 and check stderr for detailed key event information.
Press Ctrl+Q to quit.

**What it shows:**
- Raw input bytes
- Input hex codes
- Key object properties
- All key flags

---

### test-ctrl-bracket.tsx

**Purpose:** Tests detection of Ctrl+] in Ink's useInput.

**Use cases:**
- Testing control key combinations
- Debugging Ctrl+@ alternative (originally considered for BREAK)

**Note:** This test may be obsolete since Ctrl+@ is now used for BREAK.

**Run:**
```bash
npx tsx tests/diagnostic/test-ctrl-bracket.tsx
```

---

## Test Status

| Test | Status | Notes |
|------|--------|-------|
| test-boot.ts | ✅ Working | All tests pass |
| test-video.ts | ⚠️ Mostly working | Row 0 shows ANSI codes (expected) |
| test-emulator-ui.ts | ✅ Working | Updated keyboard shortcuts |
| test-emulator-startup.ts | ⚠️ Requires TTY | Terminal size/raw mode issues |
| debug-keys.js | ✅ Working | Useful debug utility |
| debug-screen.js | ✅ Working | Useful debug utility |
| test-fkeys.tsx | ✅ Working | Interactive test |
| test-ctrl-bracket.tsx | ❓ Obsolete? | May not be needed |

---

## When to Use These Tests

### During Development

**Adding new video features:**
- Run `test-video.ts` to verify rendering still works
- Use `debug-screen.js` to inspect memory contents

**Debugging boot issues:**
- Run `test-boot.ts` to verify basic execution
- Use `debug-screen.js` to check if ROM is writing to screen

**Testing keyboard changes:**
- Use `debug-keys.js` to see raw terminal input
- Use `test-fkeys.tsx` to test Ink integration

**Before releasing:**
- Run all integration tests (test-boot, test-video, test-emulator-ui)
- Verify no regressions in core functionality

### Troubleshooting

**"Applesoft prompt doesn't appear":**
1. Run `test-boot.ts` - does basic execution work?
2. Run `debug-screen.js` - is ROM writing to memory?
3. Run `test-video.ts` - does video rendering work?

**"Function keys don't work":**
1. Run `debug-keys.js` - what sequences does terminal send?
2. Run `test-fkeys.tsx` - does Ink receive them?
3. Check terminal keyboard settings

**"Screen shows garbage":**
1. Run `test-video.ts` - does rendering work correctly?
2. Run `debug-screen.js` - what's in screen memory?
3. Check character ROM loading

---

## Maintenance Notes

These tests are **not automated** (not run by `npm test`). They are manual diagnostic tools for development and debugging.

**To keep tests current:**
- Update keyboard shortcuts when UI changes
- Update expected output when video system changes
- Add new tests when adding major features
- Remove obsolete tests (like test-ctrl-bracket.tsx if no longer useful)

**Test dependencies:**
- All tests require ROMs in `roms/` directory
- test-emulator-startup.ts requires interactive terminal ≥ 44×27

---

*Last updated: December 12, 2025*
