import type { GameObjects, Scene } from 'phaser';
import { animFrames, ATLAS_KEY, DEPTHS } from '../data/assets';
import { CLAIM_TICKS } from '../data/claims';
import { TILE_SIZE } from '../data/config';
import { BENCH_FLARE_MS, FIXTURE_SPRITES, ORB_SPRITES, PYLON_SPRITES } from '../data/foundryAssets';
import { HARVEST_BAR } from '../data/hudLayout';
import { FOUNDRY_ROOM } from '../data/rooms';
import { isClaimed } from '../sim/claims';
import { fixtureDef } from '../sim/fixtures';
import { roomById, type SimState } from '../sim/state';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { addVector } from './vector/textures';

// The claimable site and what claiming brings (009): the room's pylon (dormant,
// activating, or glowing once claimed) with the claim hold's bar, the foundry's
// fixtures (with 010's bench), and Wisp orbs in flight.
export class SiteView {
  private readonly scene: Scene;
  private readonly pylon: GameObjects.Sprite;
  private readonly bar: GameObjects.Graphics;
  private readonly fixtures = new Map<string, GameObjects.Sprite>();
  private readonly orbs = new Map<number, { orb: GameObjects.Image; shadow: GameObjects.Image }>();
  /** Scene time until which the bench's lens flares. */
  private flareUntil = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    registerAnim(scene, PYLON_SPRITES.activating);
    registerAnim(scene, PYLON_SPRITES.active);
    registerAnim(scene, FIXTURE_SPRITES.waystone);
    this.pylon = scene.add.sprite(0, 0, ATLAS_KEY, PYLON_SPRITES.off).setOrigin(0.5, 1).setVisible(false);
    this.bar = scene.add.graphics().setDepth(DEPTHS.worldUi);
  }

  /** Pieces were identified since the last draw: the bench flares. */
  identified(): void {
    this.flareUntil = this.scene.time.now + BENCH_FLARE_MS;
  }

  update(sim: SimState, shown: string): void {
    this.drawPylon(sim, shown);
    this.drawFixtures(sim, shown === FOUNDRY_ROOM);
    this.drawOrbs(sim, shown);
  }

  private drawPylon(sim: SimState, shown: string): void {
    const at = roomById(shown).pylon;
    this.bar.clear();
    this.pylon.setVisible(at !== undefined);
    if (!at) return;
    const x = (at.tx + 0.5) * TILE_SIZE;
    const bottom = (at.ty + 1) * TILE_SIZE;
    this.pylon.setPosition(x, bottom).setDepth(bottom);
    const anim = this.pylon.anims.currentAnim?.key;
    if (!isClaimed(sim, at.site)) {
      if (anim) this.pylon.stop();
      this.pylon.setFrame(PYLON_SPRITES.off);
    } else if (sim.activatePulse > 0) {
      if (anim !== PYLON_SPRITES.activating.key) this.pylon.play(PYLON_SPRITES.activating.key);
    } else if (anim !== PYLON_SPRITES.active.key) this.pylon.play(PYLON_SPRITES.active.key);
    const hold = sim.claimHold;
    if (!hold || hold.site !== at.site) return;
    const { w, h, gap, border } = HARVEST_BAR;
    const left = Math.round(x - w / 2);
    const top = Math.round(bottom - this.pylon.height - gap - h);
    this.bar.fillStyle(colorOf(HARVEST_BAR.back)).fillRect(left - border, top - border, w + 2 * border, h + 2 * border);
    this.bar.fillStyle(colorOf(HARVEST_BAR.color)).fillRect(left, top, Math.round((w * hold.progress) / CLAIM_TICKS), h);
  }

  private drawFixtures(sim: SimState, shown: boolean): void {
    for (const f of shown ? sim.fixtures : []) {
      const def = fixtureDef(f.id);
      let sprite = this.fixtures.get(f.id);
      if (!sprite) {
        const x = (def.tx + 0.5) * TILE_SIZE;
        const bottom = (def.ty + 1) * TILE_SIZE;
        sprite = this.scene.add.sprite(x, bottom, ATLAS_KEY).setOrigin(0.5, 1).setDepth(bottom);
        if (def.kind === 'waystone') sprite.play(FIXTURE_SPRITES.waystone.key);
        if (def.kind === 'stash') sprite.setFrame(FIXTURE_SPRITES.stash);
        this.fixtures.set(f.id, sprite);
      }
      sprite.setVisible(true);
      if (def.kind === 'port') sprite.setFrame(animFrames(FIXTURE_SPRITES.port)[f.item ? 1 : 0] ?? '');
      if (def.kind === 'bench') sprite.setFrame(animFrames(FIXTURE_SPRITES.bench)[this.scene.time.now < this.flareUntil ? 1 : 0] ?? '');
    }
    if (!shown) for (const s of this.fixtures.values()) s.setVisible(false);
  }

  private drawOrbs(sim: SimState, shown: string): void {
    const live = new Set<number>();
    for (const o of sim.orbs) {
      if (o.roomId !== shown) continue;
      live.add(o.id);
      let d = this.orbs.get(o.id);
      if (!d) {
        d = {
          shadow: addVector(this.scene, 0, 0, ORB_SPRITES.shadow).setDepth(DEPTHS.groundFx),
          orb: addVector(this.scene, 0, 0, ORB_SPRITES.orb),
        };
        this.orbs.set(o.id, d);
      }
      d.shadow.setPosition(Math.round(o.x), Math.round(o.y));
      d.orb.setPosition(Math.round(o.x), Math.round(o.y - ORB_SPRITES.lift)).setDepth(o.y + ORB_SPRITES.lift);
    }
    for (const [id, d] of this.orbs) {
      if (live.has(id)) continue;
      d.orb.destroy();
      d.shadow.destroy();
      this.orbs.delete(id);
    }
  }
}
