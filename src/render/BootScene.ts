import { Scene } from 'phaser';

// Empty placeholder scene until slice 001 wires the sim in.
export class BootScene extends Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.add.text(8, 8, 'Pipeline', { fontFamily: 'monospace', fontSize: '16px', color: '#5ff2e6' });
  }
}
