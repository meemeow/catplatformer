import { TRAP_WALL_RADIUS } from "../constants";
import { footTile, tileKey } from "../core/map";
import type { GameWorld } from "../core/world";

/**
 * Traps behave as pressure plates: standing on one opens every `&` wall within
 * `TRAP_WALL_RADIUS` tiles, and stepping off closes them again.
 */
export const updateTraps = (world: GameWorld): void => {
  const foot = footTile(world.player);

  for (const trap of world.traps) {
    const key = tileKey(trap.x, trap.y);
    const standingOnTrap = foot.x === trap.x && foot.y === trap.y;

    if (standingOnTrap === trap.active) continue;

    trap.active = standingOnTrap;
    if (standingOnTrap) world.activatedTraps.add(key);
    else world.activatedTraps.delete(key);

    for (const wall of world.deactivatedWalls) {
      const distance = Math.hypot(wall.x - trap.x, wall.y - trap.y);
      if (distance >= TRAP_WALL_RADIUS) continue;

      const wallKey = tileKey(wall.x, wall.y);
      if (standingOnTrap) world.map.disabledWalls.add(wallKey);
      else world.map.disabledWalls.delete(wallKey);
    }
  }
};
