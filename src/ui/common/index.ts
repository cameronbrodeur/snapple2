/**
 * Common UI components barrel export.
 *
 * Shared components used across multiple UI modules.
 */

// Theme
export type { Theme } from './theme.js';
export { GreenTheme, AmberTheme, WhiteTheme, BlueTheme, DefaultTheme } from './theme.js';

// Hotkey button
export { HotkeyButton } from './hotkey-button.js';
export type { HotkeyButtonProps } from './hotkey-button.js';

// Status pills
export {
    StatusPill,
    DiskStatusPill,
    ExampleStatusPill,
    ExampleDiskStatusPill,
} from './status-pill.js';
export type {
    StatusPillProps,
    DiskStatusPillProps,
    ExampleStatusPillProps,
    ExampleDiskStatusPillProps,
} from './status-pill.js';

// Disk drive visualization
export { DiskDrive } from './disk-drive.js';
export type { DiskDriveProps } from './disk-drive.js';

// File browser
export { FileBrowser } from './file-browser.js';
export type { FileBrowserProps, FileBrowserMode } from './file-browser.js';
