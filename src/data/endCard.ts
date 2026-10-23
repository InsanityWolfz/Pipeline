// The end of the demo (042): the card that shows after the last boss's first kill (060: the Forgewright's), `delayTicks` later (so its death and
// drops play), then free play goes on. Its words are pending Shaun's rewrite; "What's next" comes from the drive
// rant's theme 11 (docs/brainstorm/2026-10-19-drive-rant.md).

export const END_CARD = {
  /** The boss whose first kill ends the demo (060: the Forgewright, was the Bulwark). */
  boss: 'forgewright',
  delayTicks: 180,
  title: 'End of the playtest build',
  nextTitle: "What's next",
  next: [
    'New regions and bosses',
    'More ammo, and new ways to combine and augment it',
    'A bigger foundry, with setups to switch between',
    'Gear sets',
  ],
  thanks: 'Thanks for playing.',
  prompt: 'Tell Shaun what you thought: press F to leave a note, then Settings → Export save to send it.',
  buttons: { feedback: 'Leave feedback', keepPlaying: 'Keep playing' },
  /** The card's width, view px (wider than a confirm, for the list). */
  width: 360,
} as const;
