/**
 * Terminal Graphics Capability Detection
 *
 * Currently only supports Unicode quarter-block rendering.
 *
 * NOTE: Sixel graphics support was explored but paused due to performance
 * issues. Terminal-based Sixel rendering at 60fps caused significant
 * flickering and frame tearing, especially at higher scale factors.
 * The Sixel implementation is preserved on the 'sixel-mode' branch.
 *
 * Unicode quarter-blocks provide smooth animation and work in all terminals.
 */

/**
 * Graphics output mode.
 * Currently only UNICODE is supported.
 */
export enum GraphicsMode {
    UNICODE = 'unicode',
}
