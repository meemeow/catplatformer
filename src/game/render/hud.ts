import { BOSS_STATS, TOTAL_STARS, WEAPONS } from "../constants";
import { LEVEL_COUNT } from "../data/levels";
import type { WeaponType } from "../types";

/** Everything the on-canvas HUD shows. */
export interface HudState {
  levelIndex: number;
  health: number;
  stars: number;
  hasWeapon: boolean;
  weaponType: WeaponType | null;
  /** Null hides the boss bar. */
  bossHealth: number | null;
}

const PANEL = { x: 8, y: 8, w: 350, h: 68 } as const;
const BOSS_BAR = { width: 300, height: 12, top: 12 } as const;

const weaponLabel = (state: HudState): string => {
  if (!state.hasWeapon) return "None";
  if (state.weaponType) return WEAPONS[state.weaponType].hudLabel;
  return "Yes (F to attack)";
};

/** Centred bar tracking the boss's remaining health, with a percentage. */
const drawBossBar = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  bossHealth: number,
): void => {
  const x = Math.round((canvasWidth - BOSS_BAR.width) / 2);
  const y = BOSS_BAR.top;
  const fraction = Math.max(0, Math.min(1, bossHealth / BOSS_STATS.maxHealth));

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 2, y - 2, BOSS_BAR.width + 4, BOSS_BAR.height + 4);
  ctx.fillStyle = "#550000";
  ctx.fillRect(x, y, BOSS_BAR.width, BOSS_BAR.height);
  ctx.fillStyle = "#ff4d4d";
  ctx.fillRect(x, y, Math.round(BOSS_BAR.width * fraction), BOSS_BAR.height);

  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.fillText("Boss", x + 6, y + BOSS_BAR.height + 12);

  const percent = `${Math.round(fraction * 100)}%`;
  const percentWidth = ctx.measureText(percent).width;
  ctx.fillText(percent, x + BOSS_BAR.width - 6 - percentWidth, y + BOSS_BAR.height + 12);
};

/** Draws the stats panel, the controls reminder and the boss bar. */
export const drawHud = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  state: HudState,
): void => {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);

  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";
  ctx.fillText(`Level: ${state.levelIndex + 1} / ${LEVEL_COUNT}`, 16, 28);
  ctx.fillText(`Health: ${state.health}`, 16, 48);

  // Note: the boss bar leaves the font at 12px, so the rows below render
  // smaller whenever a boss is present. That is how the game has always looked;
  // normalising it is a design change, not a refactor.
  if (state.bossHealth !== null) drawBossBar(ctx, canvasWidth, state.bossHealth);

  ctx.fillText(`Weapon: ${weaponLabel(state)}`, 16, 68);
  ctx.fillText("A & D: Move left and right", 140, 28);
  ctx.fillText("Space: Jump", 140, 48);
  ctx.fillText(`Stars: ${state.stars} / ${TOTAL_STARS}`, 140, 68);
};
