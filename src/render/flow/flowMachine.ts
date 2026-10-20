// The game flow (042): which screen is up. Pure TypeScript, no Phaser, so its rules are unit tested.
// The states form a stack: overlays (Settings, the note, a confirm, the end card) sit over what opened them and go
// back to it; the rest replace the top or start the stack again.

export type FlowState = 'title' | 'play' | 'paused' | 'settings' | 'endCard' | 'feedback' | 'confirm' | 'farewell';

/**
 * What can happen:
 * - `start`: New game or Continue (title, or a confirm over it) → play
 * - `pause` / `resume`: play ↔ paused
 * - `settings`: title or paused → settings
 * - `endCard`: play → the end card; `keepPlaying` closes it
 * - `feedback`: any state but a confirm (or the note itself) → the note
 * - `confirm`: title, paused or settings → a confirm over it; `cancel` or `accept` close it
 * - `back`: closes Settings or the note; on the farewell card, back to the title
 * - `toTitle`: a confirm over the pause menu → the title (Quit to title)
 * - `quit`: title → the farewell card
 */
export type FlowEvent = 'start' | 'pause' | 'resume' | 'settings' | 'endCard' | 'keepPlaying' | 'feedback' | 'confirm' | 'cancel' | 'accept' | 'back' | 'toTitle' | 'quit';

export interface FlowChange {
  from: FlowState;
  to: FlowState;
  event: FlowEvent;
}

type Move = { kind: 'push'; to: FlowState } | { kind: 'replace'; to: FlowState } | { kind: 'reset'; to: FlowState } | { kind: 'pop' };

export class FlowMachine {
  private readonly stack: FlowState[];
  /** Every change, oldest first. */
  readonly log: FlowChange[] = [];

  constructor(initial: FlowState = 'title') {
    this.stack = [initial];
  }

  get state(): FlowState {
    return this.stack[this.stack.length - 1] ?? 'title';
  }

  /** The state under the top one (what an overlay returns to), or null with nothing under it. */
  get under(): FlowState | null {
    return this.stack[this.stack.length - 2] ?? null;
  }

  /** The bottom of the stack: `title`, `play` or `paused` (or the farewell card): what the overlays sit over. */
  get base(): FlowState {
    return this.stack[0] ?? 'title';
  }

  /** Whether the world steps: only in play. */
  get stepping(): boolean {
    return this.state === 'play';
  }

  can(event: FlowEvent): boolean {
    return this.move(event) !== null;
  }

  /** Applies an event; returns whether it changed the state. An event the state doesn't take changes nothing. */
  send(event: FlowEvent): boolean {
    const move = this.move(event);
    if (!move) return false;
    const from = this.state;
    if (move.kind === 'push') this.stack.push(move.to);
    else if (move.kind === 'pop') this.stack.pop();
    else if (move.kind === 'replace') this.stack[this.stack.length - 1] = move.to;
    else this.stack.splice(0, this.stack.length, move.to);
    this.log.push({ from, to: this.state, event });
    return true;
  }

  private move(event: FlowEvent): Move | null {
    const s = this.state;
    const under = this.under;
    switch (event) {
      case 'start':
        return s === 'title' || (s === 'confirm' && under === 'title') ? { kind: 'reset', to: 'play' } : null;
      case 'pause':
        return s === 'play' ? { kind: 'replace', to: 'paused' } : null;
      case 'resume':
        return s === 'paused' ? { kind: 'replace', to: 'play' } : null;
      case 'settings':
        return s === 'title' || s === 'paused' ? { kind: 'push', to: 'settings' } : null;
      case 'endCard':
        return s === 'play' ? { kind: 'push', to: 'endCard' } : null;
      case 'keepPlaying':
        return s === 'endCard' ? { kind: 'pop' } : null;
      case 'feedback':
        return s === 'confirm' || s === 'feedback' ? null : { kind: 'push', to: 'feedback' };
      case 'confirm':
        return s === 'title' || s === 'paused' || s === 'settings' ? { kind: 'push', to: 'confirm' } : null;
      case 'cancel':
      case 'accept':
        return s === 'confirm' ? { kind: 'pop' } : null;
      case 'back':
        if (s === 'farewell') return { kind: 'replace', to: 'title' };
        return s === 'settings' || s === 'feedback' ? { kind: 'pop' } : null;
      case 'toTitle':
        return s === 'confirm' && under === 'paused' ? { kind: 'reset', to: 'title' } : null;
      case 'quit':
        return s === 'title' ? { kind: 'replace', to: 'farewell' } : null;
    }
  }
}
