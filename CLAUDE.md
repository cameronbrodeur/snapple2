# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Development Workflow

Use these plugins and agents for structured development work on Snapple ][.

### 1. Exploration & Understanding

Before making changes, understand the relevant codebase areas:

| Tool | When to Use |
|------|-------------|
| `Explore` agent | Quick codebase exploration ("where is X?", "how does Y work?") |
| `feature-dev:code-explorer` | Deep analysis of execution paths and architecture |

### 2. Planning & Architecture

For non-trivial features, design before implementing:

| Tool | When to Use |
|------|-------------|
| `Plan` agent | Create implementation plans with file/component decisions |
| `feature-dev:code-architect` | Detailed blueprints matching existing patterns |
| `EnterPlanMode` | Interactive planning with user approval (for complex features) |

**Plan Documentation Requirements:**

All plans and architecture designs MUST be documented to files:

```
docs/plans/<feature-area>/YYYY-MM-DD-<feature-name>.md
```

**Feature areas:** `audio/`, `disk-ii/`, `memory/`, `ui/`, `video/`, `input/`, `core/`, `infrastructure/`

**Plan document structure:**
```markdown
# <Feature Name>

## Overview
Brief description of the feature and its purpose.

## Problem Statement
What problem does this solve? Why is it needed?

## Architecture
- Component design
- Data flow
- Integration points with existing code

## Implementation Plan
1. Step-by-step implementation sequence
2. Files to create/modify
3. Dependencies between steps

## Key Decisions
- Decision 1: Rationale
- Decision 2: Rationale

## Testing Strategy
How will this be tested?

## References
- Related Apple II documentation
- Existing code patterns used
```

### 3. Implementation

| Tool | When to Use |
|------|-------------|
| `/feature-dev` | Guided feature development with automatic code exploration |
| Direct implementation | For small, well-understood changes |

### 4. Review & Quality

| Tool | When to Use |
|------|-------------|
| `feature-dev:code-reviewer` | Review for bugs, security, conventions |
| `/review-pr` | Comprehensive PR review before merge |
| `code-simplifier` | Refine code for clarity and maintainability |

### 5. Git Operations

Features are developed using **git worktrees** for isolation.

| Command | Purpose |
|---------|---------|
| `/commit` | Create a git commit with auto-generated message |
| `/commit-push-pr` | Commit, push, and open a PR in one step |
| `/clean_gone` | Clean up worktrees and branches after PR merge |

## Project Overview

**Snapple ][** is a cycle-accurate Apple II Plus emulator built in TypeScript for the terminal using React Ink. It's built on top of the [cpu6502](https://github.com/cameronbrodeur/cpu6502) library, which provides the 6502 CPU core.

**Status**: Text mode, graphics modes (lo-res/hi-res), and Disk II controller complete. Boots to Applesoft BASIC and runs disk-based software.

## Quick Reference

```bash
npm start                    # Run emulator
npm run build                # Build TypeScript
npm test                     # Run tests
npm start -- --disk1 dos.dsk # Load disk image
npm start -- --verify-roms   # Verify ROM files
```

## Documentation

Detailed documentation is organized in `agent-docs/`:

| Document | Description |
|----------|-------------|
| [project-overview.md](./agent-docs/project-overview.md) | Project status, completed features, roadmap |
| [building-and-running.md](./agent-docs/building-and-running.md) | Build commands, CLI options, ROM setup |
| [architecture.md](./agent-docs/architecture.md) | Core design, components, memory map, hooks |
| [disk-ii-controller.md](./agent-docs/disk-ii-controller.md) | Disk operations, formats, debugging |
| [code-conventions.md](./agent-docs/code-conventions.md) | TypeScript config, naming, patterns |
| [testing-and-debugging.md](./agent-docs/testing-and-debugging.md) | Running tests, keyboard controls, debugging |
| [common-pitfalls.md](./agent-docs/common-pitfalls.md) | Gotchas and solutions |

## Standards and Checklists

| Document | Description |
|----------|-------------|
| [commenting-standards.md](./agent-docs/commenting-standards.md) | Code commenting guidelines |
| [integration-testing-checklist.md](./agent-docs/integration-testing-checklist.md) | Manual testing procedures |

## Key Files

| Path | Purpose |
|------|---------|
| `src/emulator/apple2-machine.ts` | Central emulator class |
| `src/emulator/constants.ts` | Memory addresses, timing constants |
| `src/hooks/use-emulator.ts` | Emulator state management |
| `src/ui/emulator-app.tsx` | Main UI composition |
| `src/cli.tsx` | CLI entry point |

## Essential Guidelines

1. **Read before modifying** - Always read files before suggesting changes
2. **Use constants** - No magic numbers; add to `constants.ts`
3. **Follow conventions** - See [code-conventions.md](./agent-docs/code-conventions.md)
4. **Avoid pitfalls** - Review [common-pitfalls.md](./agent-docs/common-pitfalls.md) for Apple II specifics
