import { BIND_ACTIONS, DEFAULT_BINDINGS, KEY_LABELS, type BindAction } from '../data/settings';
import { settings } from './flow/settingsStore';

// Key hints show the bound key (042), not a fixed letter: the data's texts name today's default keys ("Craft arrows
// (C)", "Press B", "Hold E", "G flips the side"), and this swaps each for the key the player bound to that action.

/** How a key code name reads on screen: "Space", "1", or the letter. */
export function keyLabel(name: string): string {
  return KEY_LABELS[name] ?? name;
}

/** The default single-letter key of each action that has one: "E" → interact. */
const BY_LETTER: ReadonlyMap<string, BindAction> = new Map(BIND_ACTIONS.filter((a) => /^[A-Z]$/.test(DEFAULT_BINDINGS[a])).map((a) => [DEFAULT_BINDINGS[a], a]));

/** The key shown for a default letter ("E"): its action's bound key, or the letter itself if no action has it. */
export function boundLetter(letter: string, bindings: Readonly<Record<BindAction, string>> = settings().bindings): string {
  const action = BY_LETTER.get(letter);
  return action ? keyLabel(bindings[action]) : letter;
}

// A default letter in a hint: "(E)", "Press B", "hold E", "E sets", "G flips".
const HINT = /\(([A-Z])\)|\b([Pp]ress|[Hh]old) ([A-Z])\b|\b([A-Z]) (sets|flips|turns)\b/g;

/** `text` with every hinted default letter swapped for its bound key. */
export function withKeys(text: string, bindings: Readonly<Record<BindAction, string>> = settings().bindings): string {
  if (!/[A-Z]/.test(text)) return text;
  return text.replace(HINT, (whole: string, paren?: string, verb?: string, after?: string, before?: string, does?: string) => {
    if (paren) return `(${boundLetter(paren, bindings)})`;
    if (verb && after) return `${verb} ${boundLetter(after, bindings)}`;
    if (before && does) return `${boundLetter(before, bindings)} ${does}`;
    return whole;
  });
}
