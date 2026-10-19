import { VIEW_HEIGHT } from '../data/config';
import { HUD_LAYOUT } from '../data/hudLayout';
import { HEALTH_BLOCK_HEIGHT, HEALTH_BLOCK_WIDTH } from '../data/hudPanels';
import { buildBarLabelTop, type ScreenBox } from './bottomHud';

// Where the HP block sits (031), pure: bottom-left, `margin` px in from the left
// and bottom edges, clear of the 025 hotbar row and tube slot. In build mode, when
// the build bar's left edge comes within `gap` px of it, it rises to sit `gap` px
// above the bar's label row.

/** The HP block (frame, shield and armor value, and 037's XP row under them), view px. `buildBar` is the build bar's box while building, else null. */
export function healthBlockBox(buildBar: ScreenBox | null): ScreenBox {
  const { margin, gap } = HUD_LAYOUT;
  const h = HEALTH_BLOCK_HEIGHT;
  const w = HEALTH_BLOCK_WIDTH;
  const reaches = buildBar !== null && buildBar.w > 0 && buildBar.x < margin + w + gap;
  const bottom = reaches ? buildBarLabelTop() - gap : VIEW_HEIGHT - margin;
  return { x: margin, y: bottom - h, w, h };
}
