import { Display } from 'phaser';
import { paletteHex } from '../data/palette';

/** A palette colour as a Phaser colour number. */
export const colorOf = (id: string): number => Display.Color.HexStringToColor(paletteHex(id)).color;
