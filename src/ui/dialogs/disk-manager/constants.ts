/**
 * Shared constants for disk dialog components.
 *
 * Centralized values used across DiskDialog, CreateDiskView, LoadDiskView,
 * and other disk dialog sub-components.
 */

import { Palette } from '../../../shared/colors.js';

/** Width of the half-block separator lines (▄/▀) */
export const SEPARATOR_WIDTH = 68;

/** Max characters for status message before truncation */
export const STATUS_MESSAGE_MAX_LENGTH = 52;

/** Background color for focused section (inverse video effect) */
export const FOCUS_BACKGROUND = Palette.black.dim;

/** Background color for unfocused/blurred section */
export const BLUR_BACKGROUND = Palette.black.bright;

/** Max visible rows in directory browser */
export const BROWSER_MAX_ROWS = 10;
