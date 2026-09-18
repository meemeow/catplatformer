import { TILE, WEAPONS } from "../constants";
import type { Boss, Enemy, Tracer, WeaponType } from "../types";
import { pointRect, rectCollision } from "./collision";
import type { GameMap } from "./map";

/**
 * Creates a bullet travelling from the muzzle toward a target point.
 *
 * Sheriff rounds get their lifetime stretched to at least a full map crossing,
 * so a forward shot reaches the far wall instead of fizzling mid-air.
 */
export const spawnTracer = (
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  type: WeaponType,
  map: GameMap,
): Tracer => {
  const stats = WEAPONS[type];
  const dx = targetX - startX;
  const dy = targetY - startY;
  const len = Math.hypot(dx, dy) || 1;

  const baseLife = Math.max(0.5, len / stats.bulletSpeed + 0.2);
  const life =
    type === "sheriff"
      ? Math.max(baseLife, map.widthPx / stats.bulletSpeed + 0.1)
      : baseLife;

  return {
    x: startX,
    y: startY,
    vx: (dx / len) * stats.bulletSpeed,
    vy: (dy / len) * stats.bulletSpeed,
    age: 0,
    life,
    r: stats.tracerRadius,
    damage: stats.damage,
    type,
    trail: stats.tracerTrail,
  };
};

/** What a tracer update frame produced, for the caller to act on. */
export interface TracerFrameResult {
  /** Enemies removed by a bullet this frame. */
  enemiesHit: Enemy[];
  /** Total damage bullets dealt to the boss this frame. */
  bossDamage: number;
}

/**
 * Advances every tracer, resolves hits and drops expired rounds.
 * Mutates `tracers` and `enemies` in place; reports what happened.
 */
export const updateTracers = (
  tracers: Tracer[],
  enemies: Enemy[],
  boss: Boss | null,
  map: GameMap,
  dt: number,
): TracerFrameResult => {
  const result: TracerFrameResult = { enemiesHit: [], bossDamage: 0 };

  for (let ti = tracers.length - 1; ti >= 0; ti--) {
    const tracer = tracers[ti];
    tracer.x += tracer.vx * dt;
    tracer.y += tracer.vy * dt;
    tracer.age += dt;

    const hitbox = pointRect(tracer.x, tracer.y, tracer.r);

    let hitEnemy = false;
    for (let ei = 0; ei < enemies.length; ei++) {
      if (rectCollision(hitbox, enemies[ei])) {
        result.enemiesHit.push(enemies.splice(ei, 1)[0]);
        tracers.splice(ti, 1);
        hitEnemy = true;
        break;
      }
    }
    if (hitEnemy) continue;

    if (boss && rectCollision(hitbox, boss)) {
      result.bossDamage += tracer.damage;
      tracers.splice(ti, 1);
      continue;
    }

    const outOfBounds =
      tracer.x < -TILE ||
      tracer.x > map.widthPx + TILE ||
      tracer.y < -TILE ||
      tracer.y > map.heightPx + TILE;

    if (tracer.age > tracer.life || outOfBounds) tracers.splice(ti, 1);
  }

  return result;
};
