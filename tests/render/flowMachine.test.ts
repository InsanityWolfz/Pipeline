import { describe, expect, it } from 'vitest';
import { FlowMachine, type FlowEvent, type FlowState } from '../../src/render/flow/flowMachine';

// 042: the game-flow state machine.

const ALL_EVENTS: FlowEvent[] = ['start', 'pause', 'resume', 'settings', 'endCard', 'keepPlaying', 'feedback', 'confirm', 'cancel', 'accept', 'back', 'toTitle', 'quit'];

function run(events: FlowEvent[], initial: FlowState = 'title'): FlowMachine {
  const m = new FlowMachine(initial);
  for (const e of events) expect(m.send(e), `${e} from ${m.state}`).toBe(true);
  return m;
}

describe('flow machine', () => {
  it('boots to the title, or to play for a dev start', () => {
    expect(new FlowMachine().state).toBe('title');
    expect(new FlowMachine('play').state).toBe('play');
  });

  it('title → play by New game or Continue', () => {
    expect(run(['start']).state).toBe('play');
  });

  it('play ↔ paused by Esc, Resume', () => {
    expect(run(['start', 'pause']).state).toBe('paused');
    expect(run(['start', 'pause', 'resume']).state).toBe('play');
  });

  it('Settings goes back to where it was opened from', () => {
    expect(run(['settings', 'back']).state).toBe('title');
    expect(run(['start', 'pause', 'settings', 'back']).state).toBe('paused');
  });

  it('play → the end card on the first kill, Keep playing → play', () => {
    expect(run(['start', 'endCard']).state).toBe('endCard');
    expect(run(['start', 'endCard', 'keepPlaying']).state).toBe('play');
  });

  it('the note opens from every state but a confirm and goes back to its opener', () => {
    const paths: [FlowEvent[], FlowState][] = [
      [[], 'title'],
      [['start'], 'play'],
      [['start', 'pause'], 'paused'],
      [['settings'], 'settings'],
      [['start', 'endCard'], 'endCard'],
      [['quit'], 'farewell'],
    ];
    for (const [events, opener] of paths) {
      const m = run(events);
      expect(m.send('feedback')).toBe(true);
      expect(m.state).toBe('feedback');
      expect(m.send('back')).toBe(true);
      expect(m.state).toBe(opener);
    }
    const confirm = run(['confirm']);
    expect(confirm.send('feedback')).toBe(false);
    expect(confirm.state).toBe('confirm');
    expect(run(['feedback']).can('feedback')).toBe(false);
  });

  it('Settings opened over the note keeps its own opener', () => {
    const m = run(['start', 'pause', 'settings', 'feedback', 'back', 'back']);
    expect(m.state).toBe('paused');
  });

  it('Quit to title from the pause menu goes through a confirm', () => {
    expect(run(['start', 'pause', 'confirm', 'cancel']).state).toBe('paused');
    const m = run(['start', 'pause', 'confirm', 'toTitle']);
    expect(m.state).toBe('title');
    expect(m.under).toBeNull();
    // The title's own confirm (New game over a save) can't quit to the title, and the pause's can't start a game.
    expect(run(['confirm']).can('toTitle')).toBe(false);
    expect(run(['start', 'pause', 'confirm']).can('start')).toBe(false);
  });

  it('New game over a save: a confirm on the title, then start or cancel', () => {
    expect(run(['confirm', 'start']).state).toBe('play');
    expect(run(['confirm', 'cancel']).state).toBe('title');
  });

  it('an import confirm over Settings goes back to Settings', () => {
    expect(run(['settings', 'confirm', 'accept']).state).toBe('settings');
  });

  it('Quit on the title shows the farewell card, and Back returns', () => {
    expect(run(['quit']).state).toBe('farewell');
    expect(run(['quit', 'back']).state).toBe('title');
  });

  it('steps the world only in play', () => {
    const m = new FlowMachine();
    const seen: Record<string, boolean> = {};
    for (const e of ['start', 'pause', 'settings', 'feedback', 'back', 'back', 'resume', 'endCard'] as FlowEvent[]) {
      m.send(e);
      seen[m.state] = m.stepping;
    }
    expect(seen).toEqual({ play: true, paused: false, settings: false, feedback: false, endCard: false });
  });

  it('refuses events a state does not take, changing nothing', () => {
    const states: [FlowEvent[], FlowEvent[]][] = [
      [[], ['start', 'settings', 'feedback', 'confirm', 'quit']],
      [['start'], ['pause', 'endCard', 'feedback']],
      [['start', 'pause'], ['resume', 'settings', 'feedback', 'confirm']],
      [['settings'], ['feedback', 'confirm', 'back']],
      [['start', 'endCard'], ['keepPlaying', 'feedback']],
      [['confirm'], ['start', 'cancel', 'accept']],
      [['quit'], ['feedback', 'back']],
    ];
    for (const [path, allowed] of states) {
      for (const e of ALL_EVENTS.filter((x) => !allowed.includes(x))) {
        const m = run(path);
        const before = m.state;
        expect(m.send(e), `${e} from ${before}`).toBe(false);
        expect(m.state).toBe(before);
      }
    }
  });

  it('logs every change', () => {
    const m = run(['start', 'pause', 'resume']);
    expect(m.log).toEqual([
      { from: 'title', to: 'play', event: 'start' },
      { from: 'play', to: 'paused', event: 'pause' },
      { from: 'paused', to: 'play', event: 'resume' },
    ]);
    m.send('quit');
    expect(m.log).toHaveLength(3);
  });
});
