/**
 * Video System Type Definitions
 *
 * Types specific to video rendering.
 */

/**
 * Character glyph data.
 *
 * Represents an 8×8 pixel character from the character ROM.
 * Each byte represents one row of 8 pixels.
 */
export type CharacterGlyph = number[];

/**
 * RGB color type.
 *
 * Used for color rendering in graphics modes.
 */
export interface RGB {
    r: number;
    g: number;
    b: number;
}
