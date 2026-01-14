# Integration Testing Checklist

This document provides a comprehensive integration testing checklist for Snapple ][, ensuring all components work together correctly before release.

## Pre-Test Setup

- [ ] Clean build environment
  ```bash
  npm run clean
  npm run build
  ```
- [ ] ROM files present in default location
- [ ] Terminal size at least 102×33 (text mode) or 285×104 (hi-res mode)
- [ ] Node.js version >= 18.0.0

## 1. Boot and Initialization

### 1.1 ROM Loading

- [ ] **Default location** (`./roms/`)
  - [ ] All 7 ROM files load successfully
  - [ ] Applesoft BASIC starts correctly
  - [ ] Monitor ROM accessible (CALL -151)

- [ ] **Environment variable** (`SNAPPLE_ROMS_DIR`)
  ```bash
  export SNAPPLE_ROMS_DIR=~/custom-roms
  npm start
  ```
  - [ ] ROMs load from custom directory
  - [ ] Emulator boots correctly

- [ ] **CLI argument** (`--roms-dir`)
  ```bash
  npm start -- --roms-dir ~/custom-roms
  ```
  - [ ] ROMs load from specified directory
  - [ ] Emulator boots correctly

- [ ] **Error handling**
  - [ ] Missing ROMs: Clear error with search paths
  - [ ] Wrong size ROMs: Size validation error
  - [ ] Empty directory: Helpful error message

### 1.2 Machine Initialization

- [ ] CPU boots to correct address (Monitor ROM)
- [ ] Applesoft BASIC prompt `]` appears
- [ ] Memory map correct:
  - [ ] RAM at $0000-$BFFF (48KB)
  - [ ] Soft switches at $C000-$C0FF
  - [ ] Applesoft ROM at $D000-$F7FF
  - [ ] Monitor ROM at $F800-$FFFF

- [ ] Video system initializes:
  - [ ] Text mode active
  - [ ] Page 1 selected
  - [ ] 40×24 display ready

## 2. CPU Execution

### 2.1 Basic Execution

- [ ] **Simple BASIC program**
  ```basic
  PRINT "HELLO"
  ```
  - [ ] "HELLO" appears on screen
  - [ ] Prompt returns correctly

- [ ] **Loop execution**
  ```basic
  10 FOR I = 1 TO 5
  20 PRINT I
  30 NEXT I
  ```
  - [ ] Numbers 1-5 print correctly
  - [ ] Loop completes without hanging

- [ ] **Subroutine calls**
  ```basic
  10 GOSUB 100
  20 PRINT "BACK"
  30 END
  100 PRINT "SUB"
  110 RETURN
  ```
  - [ ] "SUB" prints first
  - [ ] "BACK" prints second
  - [ ] Program ends cleanly

### 2.2 Timing and Performance

- [ ] **CPU speed**
  - [ ] Runs at ~1.023 MHz (verify with F2 profiler mode)
  - [ ] Speed stable over time
  - [ ] No excessive drift (< 5% variance)

- [ ] **Frame rate**
  - [ ] Display updates at ~60fps
  - [ ] No visible stuttering
  - [ ] Smooth animation (if any)

- [ ] **Long-term stability**
  - [ ] Run for 10+ minutes
  - [ ] No crashes or freezes
  - [ ] Memory usage stable
  - [ ] CPU usage reasonable

## 3. Video System

### 3.1 Text Mode Display

- [ ] **Character rendering**
  - [ ] All uppercase letters A-Z display
  - [ ] All numbers 0-9 display
  - [ ] Special characters display correctly
  - [ ] Space character works

- [ ] **Screen layout**
  - [ ] 40 columns wide
  - [ ] 24 rows tall
  - [ ] Text wraps correctly at column 40
  - [ ] Screen scrolls when full

- [ ] **Test pattern**
  ```basic
  10 FOR I = 0 TO 23
  20 HTAB 1: VTAB I+1
  30 PRINT "LINE "; I
  40 NEXT I
  ```
  - [ ] All 24 lines fill correctly
  - [ ] No corruption or artifacts

### 3.2 Lo-Res Graphics Mode

- [ ] **Enter lo-res mode**
  ```basic
  GR
  ```
  - [ ] Screen clears to black
  - [ ] Mixed mode footer visible (4 text lines)

- [ ] **Plot colors**
  ```basic
  10 GR
  20 FOR C = 0 TO 15
  30 COLOR = C
  40 PLOT C * 2, 10
  50 NEXT C
  ```
  - [ ] All 16 colors render distinctly
  - [ ] Half-block rendering looks correct

- [ ] **Draw lines and shapes**
  ```basic
  10 GR
  20 COLOR = 1
  30 HLIN 0, 39 AT 20
  40 VLIN 0, 39 AT 20
  ```
  - [ ] Horizontal line draws correctly
  - [ ] Vertical line draws correctly

### 3.3 Hi-Res Graphics Mode

- [ ] **Enter hi-res mode**
  ```basic
  HGR
  ```
  - [ ] Screen clears
  - [ ] Mixed mode footer visible

- [ ] **Draw lines**
  ```basic
  10 HGR
  20 HCOLOR = 3
  30 HPLOT 0, 0 TO 279, 191
  ```
  - [ ] Diagonal line renders
  - [ ] NTSC artifact colors visible

- [ ] **NTSC artifact coloring**
  - [ ] Purple/green on odd/even pixels
  - [ ] Blue/orange on shifted patterns
  - [ ] White where adjacent bits set
  - [ ] Cross-byte adjacency works

### 3.4 Video State

- [ ] **Mode switching**
  - [ ] TEXT command works
  - [ ] GR enters lo-res mode
  - [ ] HGR enters hi-res mode
  - [ ] Soft switches respond correctly

- [ ] **Page switching**
  - [ ] PAGE1 and PAGE2 work
  - [ ] Content preserved on each page

- [ ] **Mixed mode**
  - [ ] Graphics + 4-row text footer
  - [ ] Text footer updates correctly

## 4. Keyboard Input

### 4.1 Character Input

- [ ] **Alphanumeric**
  - [ ] Type A-Z → appears as uppercase in Apple II
  - [ ] Type 0-9 → numbers appear correctly
  - [ ] Type special chars → correct Apple II ASCII

- [ ] **Input to BASIC**
  ```basic
  INPUT "NAME: "; N$
  PRINT "HELLO "; N$
  ```
  - [ ] Prompt appears
  - [ ] Typed text echoes correctly
  - [ ] Return submits input
  - [ ] Variable contains correct value

### 4.2 Special Keys

- [ ] **Return** → $8D
  - [ ] Submits BASIC commands
  - [ ] Works in INPUT statements

- [ ] **Escape** → $9B
  - [ ] Interrupts INPUT
  - [ ] Works in Monitor

- [ ] **Arrow keys**
  - [ ] Left → $88 (also backspace)
  - [ ] Right → $95
  - [ ] Up → $8B
  - [ ] Down → $8A
  - [ ] Work in BASIC line editor

- [ ] **Ctrl+@** (Ctrl+Shift+2) → $83 (BREAK)
  - [ ] Sends BREAK to Apple II
  - [ ] Interrupts running programs
  - [ ] Note: Ctrl+C kills terminal process and cannot be remapped

### 4.3 Emulator Control Keys (Function Keys)

- [ ] **F1** - Toggle help dialog
  - [ ] First press shows help
  - [ ] Second press hides help
  - [ ] Help centers correctly
  - [ ] All controls listed

- [ ] **F2** - Cycle status bar mode
  - [ ] Cycles through: Minimal → Full → Profiler → Hidden
  - [ ] State persists across toggles
  - [ ] Shows correct info in each mode

- [ ] **F3** - Pause/Resume
  - [ ] First press pauses execution
  - [ ] Second press resumes
  - [ ] CPU state preserved
  - [ ] Status bar shows PAUSED

- [ ] **F4** - Disk dialog
  - [ ] Opens disk manager popup
  - [ ] Can navigate with arrow keys
  - [ ] ESC closes dialog

- [ ] **F5** - Save disk changes
  - [ ] Saves modified disk to file
  - [ ] Status message confirms save

- [ ] **F6** - Save emulator state (snapshot)
  - [ ] State saved without errors
  - [ ] Status message confirms save

- [ ] **F7** - Load emulator state (restore)
  - [ ] Restores previously saved state
  - [ ] Warning if no state exists

- [ ] **F9** - Reboot
  - [ ] Shows confirmation dialog
  - [ ] Y confirms reboot
  - [ ] N/ESC cancels
  - [ ] Cold boot resets machine

- [ ] **F10** - Quit
  - [ ] Shows confirmation if unsaved changes
  - [ ] Y confirms quit
  - [ ] N/ESC cancels
  - [ ] Emulator exits cleanly
  - [ ] Terminal restored

## 5. Save States

### 5.1 Save State (F6)

- [ ] **Basic save**
  ```basic
  10 A = 42
  [Press F6]
  20 A = 100
  PRINT A
  ```
  - [ ] State saved without errors
  - [ ] Execution continues normally

- [ ] **Save during execution**
  - [ ] Can save while program running
  - [ ] State captures correctly

### 5.2 Load State (F7)

- [ ] **Basic load**
  ```basic
  [Continuing from above]
  [Press F7]
  PRINT A
  ```
  - [ ] A equals 42 (not 100)
  - [ ] State restored correctly

- [ ] **No save state**
  - [ ] Press F7 without F6 first
  - [ ] Warning logged (no crash)
  - [ ] Emulator continues

- [ ] **Save/Load cycle**
  - [ ] Save → Change state → Load → Verify restored
  - [ ] Multiple save/load cycles work
  - [ ] No memory leaks

### 5.3 State Integrity

- [ ] **CPU registers preserved**
  - [ ] A, X, Y registers
  - [ ] Stack pointer
  - [ ] Program counter
  - [ ] Status flags

- [ ] **RAM preserved**
  - [ ] All 48KB saved
  - [ ] Content identical after load
  - [ ] Zero page preserved
  - [ ] Stack preserved

- [ ] **Video state preserved**
  - [ ] Text mode setting
  - [ ] Current page
  - [ ] Screen content

## 6. Disk II Controller

### 6.1 Loading Disks via CLI

- [ ] **Load disk at startup**
  ```bash
  npm start -- --disk1 ~/disks/dos33.woz
  ```
  - [ ] Disk boots automatically
  - [ ] DOS prompt appears

- [ ] **Load multiple disks**
  ```bash
  npm start -- --disk1 dos33.woz --disk2 games.dsk
  ```
  - [ ] Both drives accessible
  - [ ] Can switch active drive via Disk Dialog (F4)

- [ ] **Write protection options**
  ```bash
  npm start -- --disk1 master.woz --write-protect
  npm start -- --disk1 work.woz --writable
  ```
  - [ ] --write-protect prevents writes
  - [ ] --writable overrides WOZ protection flag

### 6.2 Disk Dialog (F4)

- [ ] **Open dialog**
  - [ ] F4 opens disk manager
  - [ ] Shows both drives
  - [ ] Active drive highlighted

- [ ] **Load disk from file browser**
  - [ ] Select "File Browser" option
  - [ ] Navigate directories with arrows
  - [ ] Enter selects directory
  - [ ] Enter on disk file loads it
  - [ ] ESC cancels

- [ ] **Create blank disk**
  - [ ] Select "New Blank Disk" option
  - [ ] Enter filename
  - [ ] Tab to browse save location
  - [ ] Enter creates disk
  - [ ] New disk loaded into drive

- [ ] **Eject disk**
  - [ ] E key ejects current drive
  - [ ] Confirmation if unsaved changes
  - [ ] Drive shows "(empty)" after eject

- [ ] **Toggle write protection**
  - [ ] W key toggles protection
  - [ ] Status changes (WP ↔ RW)
  - [ ] Protected disks reject writes

- [ ] **Save disk changes (F5)**
  - [ ] Saves modified tracks to file
  - [ ] Status message confirms save
  - [ ] Dirty indicator (*) clears

### 6.3 Supported Formats

- [ ] **WOZ format** (.woz)
  - [ ] WOZ1 files load correctly
  - [ ] WOZ2 files load correctly
  - [ ] Write-protect flag respected

- [ ] **DSK format** (.dsk, .do)
  - [ ] Auto-converts to WOZ
  - [ ] DOS 3.3 sector order works
  - [ ] Disk boots correctly

- [ ] **ProDOS format** (.po)
  - [ ] Auto-converts to WOZ
  - [ ] ProDOS sector order works

### 6.4 Disk Operations

- [ ] **Read operations**
  - [ ] CATALOG command works
  - [ ] LOAD/BLOAD commands work
  - [ ] Files read correctly

- [ ] **Write operations** (writable disk)
  - [ ] SAVE/BSAVE commands work
  - [ ] DELETE command works
  - [ ] Changes persist after save (F5)

## 7. Language Card

### 7.1 Bank Switching

- [ ] **Enable Language Card RAM**
  - [ ] Access $C083 twice for read/write
  - [ ] RAM at $D000-$FFFF accessible

- [ ] **Integer BASIC loading**
  - [ ] Load Integer BASIC into Language Card
  - [ ] Switch between Applesoft and Integer

### 7.2 Memory Regions

- [ ] **Bank 1 and Bank 2**
  - [ ] $D000-$DFFF bankable (4KB each)
  - [ ] Both banks independently accessible

- [ ] **Upper RAM**
  - [ ] $E000-$FFFF shared (8KB)
  - [ ] Survives bank switches

## 8. Paddle/Joystick Input

- [ ] **Keyboard paddle simulation**
  - [ ] PDL0 (horizontal): A/D keys or Left/Right arrows
  - [ ] PDL1 (vertical): W/S keys or Up/Down arrows
  - [ ] Paddle values read correctly from $C064-$C067
  - [ ] Paddle trigger ($C070) works

- [ ] **Button inputs**
  - [ ] Open Apple key → PB0 ($C061)
  - [ ] Solid Apple key → PB1 ($C062)
  - [ ] Buttons read correctly

## 9. Alternate Screen Buffer

- [ ] **Enter alternate screen**
  - [ ] Original terminal hidden
  - [ ] Emulator in clean screen

- [ ] **Exit alternate screen**
  - [ ] F10 (quit) restores terminal
  - [ ] Original content visible
  - [ ] Prompt at correct location

- [ ] **Crash handling**
  - [ ] Even on error, screen restored
  - [ ] Terminal not left in bad state

## 10. Performance Profiling

### 10.1 Profiler Status Bar Mode (F2)

- [ ] **Access profiler**
  - [ ] Press F2 to cycle: Minimal → Full → Profiler → Hidden
  - [ ] Profiler mode shows 5-row metrics display
  - [ ] No impact on normal operation

- [ ] **Metrics accuracy**
  - [ ] CPU speed ~1.023 MHz (95-110%)
  - [ ] Frame time ~16.67ms
  - [ ] Frame rate ~60fps
  - [ ] Cycle execution < 1ms

- [ ] **Long-term profiling**
  - [ ] Run for 30+ minutes in Profiler mode
  - [ ] Metrics stay stable
  - [ ] No performance degradation
  - [ ] Warnings appear if issues

### 10.2 Profiler Logging (--log-profile)

- [ ] **Enable logging**
  ```bash
  npm start -- --log-profile
  ```
  - [ ] Creates JSONL file in /tmp/
  - [ ] Logs metrics at 1-second intervals
  - [ ] Status bar shows logging indicator

## 11. Error Handling

### 11.1 ROM Errors

- [ ] **Missing ROMs**
  - [ ] Clear error message
  - [ ] Search paths listed
  - [ ] Instructions provided
  - [ ] Exit code non-zero

- [ ] **Invalid ROM size**
  - [ ] Size validation works
  - [ ] Error shows expected vs actual size
  - [ ] File name shown
  - [ ] Exit code non-zero

### 11.2 Runtime Errors

- [ ] **Execution errors**
  - [ ] Logged appropriately
  - [ ] Emulator doesn't crash
  - [ ] User can recover or quit

- [ ] **Terminal restore**
  - [ ] On crash, terminal restored
  - [ ] Alternate screen cleared
  - [ ] User not stuck

## 12. Command-Line Interface

### 12.1 Help (--help)

- [ ] **Display help**
  ```bash
  npm start -- --help
  ```
  - [ ] Usage information shown
  - [ ] All options documented
  - [ ] Examples provided
  - [ ] Exit code zero

### 12.2 Version (--version)

- [ ] **Display version**
  ```bash
  npm start -- --version
  ```
  - [ ] Version number shown
  - [ ] Matches package.json
  - [ ] Exit code zero

### 12.3 Verify ROMs (--verify-roms)

- [ ] **Verify command**
  ```bash
  npm start -- --verify-roms
  ```
  - [ ] All ROMs checked
  - [ ] Success message if valid
  - [ ] Error if invalid
  - [ ] Exit without running emulator

## 13. Real-World Scenarios

### 13.1 Applesoft BASIC Programs

- [ ] **Hello World**
  ```basic
  PRINT "HELLO, WORLD!"
  ```

- [ ] **Loop Program**
  ```basic
  10 FOR I = 1 TO 10
  20 PRINT "COUNT: "; I
  30 NEXT I
  ```

- [ ] **Array Operations**
  ```basic
  10 DIM A(10)
  20 FOR I = 1 TO 10
  30 A(I) = I * 2
  40 NEXT I
  50 FOR I = 1 TO 10
  60 PRINT A(I)
  70 NEXT I
  ```

- [ ] **String Manipulation**
  ```basic
  10 A$ = "HELLO"
  20 B$ = "WORLD"
  30 C$ = A$ + " " + B$
  40 PRINT C$
  ```

### 13.2 Monitor Commands

- [ ] **Enter Monitor**
  ```basic
  CALL -151
  ```
  - [ ] Monitor prompt `*` appears

- [ ] **Examine memory**
  ```
  D000
  ```
  - [ ] Applesoft ROM visible

- [ ] **Exit Monitor**
  ```
  3D0G
  ```
  - [ ] Returns to BASIC (3D0G calls warm start vector)

### 13.3 Long-Running Programs

- [ ] **Infinite loop** (use with pause)
  ```basic
  10 PRINT "LOOP"
  20 GOTO 10
  ```
  - [ ] Runs continuously
  - [ ] Can pause with F3
  - [ ] Can save state with F6

## 14. Edge Cases

### 14.1 Boundary Conditions

- [ ] Empty program
- [ ] Program with just END
- [ ] Maximum line number (63999)
- [ ] Very long lines
- [ ] Nested loops (deep nesting)
- [ ] Large arrays

### 14.2 Stress Tests

- [ ] Rapid keyboard input
- [ ] Rapid pause/resume
- [ ] Rapid save/load cycles
- [ ] Multiple programs run sequentially
- [ ] Long programs (many lines)

## Success Criteria

All tests in this checklist must pass for integration testing to be considered successful.

### Critical Tests (Must Pass)

- [ ] Emulator boots to Applesoft BASIC
- [ ] Basic BASIC programs run correctly
- [ ] Keyboard input works
- [ ] Display renders correctly (text, lo-res, hi-res)
- [ ] Mode switching works
- [ ] Save/load state works (F6/F7)
- [ ] Disk operations work (load, save, create)
- [ ] Clean exit (F10)
- [ ] Error handling graceful

### Important Tests (Should Pass)

- [ ] Profiling works
- [ ] Long-term stability (10+ min)
- [ ] All CLI flags work
- [ ] Help and version display
- [ ] ROM error messages clear

### Nice-to-Have Tests (May Have Known Issues)

- [ ] Perfect timing (1.023 MHz ± 1%)
- [ ] All edge cases handled
- [ ] All stress tests pass

## Test Results

**Date**: ___________
**Tester**: ___________
**Platform**: ___________
**Terminal**: ___________

### Summary

- [ ] All critical tests passed
- [ ] All important tests passed
- [ ] Known issues documented
- [ ] Ready for release

### Issues Found

1. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Reproducible: [Always/Sometimes/Rare]
   - Workaround: [If any]

2. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Reproducible: [Always/Sometimes/Rare]
   - Workaround: [If any]

### Notes

[Additional observations, comments, or context]
