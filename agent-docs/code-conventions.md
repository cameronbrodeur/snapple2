# Code Conventions

## TypeScript Configuration

- **Strict mode enabled** - all code must pass strict type checking
- **ES2022 target** with Node16 modules
- **JSX**: React (for Ink components)
- All `.ts` files use `.js` extensions in imports (ES modules)

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `Apple2Machine`, `VideoSystem` |
| Files | kebab-case | `apple2-machine.ts`, `soft-switches.ts` |
| Constants | SCREAMING_SNAKE_CASE (grouped) | `MEMORY.TEXT_PAGE_1` |
| Interfaces | PascalCase | `MemoryDevice`, `VideoRenderer` |

## Code Organization

For project structure, see [architecture.md](./architecture.md#project-structure).

### Import Order

1. Node.js built-ins (`node:fs`, `node:path`)
2. External packages (`react`, `ink`)
3. Internal absolute imports
4. Relative imports

## Commenting Standards

See [commenting-standards.md](./commenting-standards.md) for detailed guidelines.

**Key points:**
- Avoid section separators (no `// ========` dividers)
- Use JSDoc for public APIs
- Focus comments on "why" not "what"
- Avoid magic numbers - use named constants

## Constants and Magic Numbers

Always extract magic numbers to named constants in `src/emulator/constants.ts`:

```typescript
// Bad
this.ram.write(0x03f4, 0x00);

// Good
this.ram.write(MEMORY.POWER_UP_BYTE, 0x00);
```

Group related constants:

```typescript
export const MEMORY = {
    RAM_SIZE: 0xc000,
    TEXT_PAGE_1: 0x0400,
    TEXT_PAGE_2: 0x0800,
    POWER_UP_BYTE: 0x03f4,
} as const;
```

## Error Handling

- Use descriptive error messages
- Prefer early returns for validation
- Log errors with context (file, function, relevant state)

## Testing

- Tests live in `tests/` directory mirroring `src/` structure
- Use vitest for unit tests
- Test file naming: `*.test.ts`

## React/Ink Patterns

### Hooks

- Custom hooks in `src/hooks/`
- Prefix with `use` (e.g., `useEmulator`, `useKeyboard`)
- Single responsibility per hook

### Components

- Functional components only
- Props interface defined above component
- Export named (not default)

```typescript
export interface StatusBarProps {
    running: boolean;
    theme: Theme;
}

export function StatusBar({ running, theme }: StatusBarProps) {
    // ...
}
```

## Terminology

Use consistent terminology throughout the codebase:

| Preferred | Avoid |
|-----------|-------|
| dialog | overlay, modal, popup |
| reboot | reset (for full machine restart) |
| theme | color scheme |
