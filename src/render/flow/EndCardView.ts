import type { Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { END_CARD } from '../../data/endCard';
import { CardView, type CardUi } from './CardView';

// The end of the demo (042): "End of the playtest build", what's next, a thanks and a feedback prompt, with Leave
// feedback and Keep playing. Shown once per save, 180 ticks after the Bulwark's first kill; the world waits under it.

export class EndCardView {
  private readonly card: CardView;

  constructor(scene: Scene) {
    // Under the note (the note opens over it) and a confirm.
    this.card = new CardView(scene, DEPTHS.menu + 6);
  }

  get isOpen(): boolean {
    return this.card.isOpen;
  }

  show(onFeedback: () => void, onKeepPlaying: () => void): void {
    const E = END_CARD;
    this.card.show(
      [
        { text: E.title, style: 'title' },
        { text: E.nextTitle, style: 'display', gap: 6 },
        ...E.next.map((t) => ({ text: t, style: 'body' as const })),
        { text: E.thanks, style: 'display', gap: 6 },
        { text: E.prompt, style: 'body', gap: 4 },
      ],
      [
        { id: 'leaveFeedback', label: E.buttons.feedback, run: onFeedback },
        { id: 'keepPlaying', label: E.buttons.keepPlaying, run: onKeepPlaying },
      ],
      E.width,
    );
  }

  hide(): void {
    this.card.hide();
  }

  pointAt(x: number, y: number): void {
    this.card.pointAt(x, y);
  }

  click(x: number, y: number): boolean {
    return this.card.click(x, y);
  }

  get ui(): CardUi | null {
    return this.card.ui;
  }
}
