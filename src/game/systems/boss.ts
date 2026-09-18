import { BOSS_LEVEL_INDEX } from "../constants";
import type { Ammo, WeaponType } from "../types";
import { isFullyEmpty } from "./combat";

/** Everything the boss consults before deciding to take a step. */
export interface BossGateFlags {
  levelIndex: number;
  cutsceneActive: boolean;
  introActive: boolean;
  /** Set once the boss's opening dialogue has run to completion. */
  cutsceneDone: boolean;
  /** Explicit permission granted and revoked by the dialogue script. */
  movementAllowed: boolean;
  weaponType: WeaponType | null;
  ammo: Ammo;
}

/**
 * The boss freezes for a handful of story reasons: during any cutscene, before
 * its intro dialogue finishes, while the player is out of sheriff rounds, and
 * for the beat right after the sniper upgrade.
 */
export const canBossPatrol = (flags: BossGateFlags): boolean => {
  if (flags.cutsceneActive || flags.introActive) return false;

  const storyGateOpen =
    flags.movementAllowed ||
    flags.levelIndex !== BOSS_LEVEL_INDEX ||
    flags.cutsceneDone;
  if (!storyGateOpen) return false;

  const sheriffDry = flags.weaponType === "sheriff" && isFullyEmpty(flags.ammo);
  if (sheriffDry && !flags.movementAllowed) return false;

  const awaitingUpgradeBeat =
    flags.weaponType === "sniper" && !flags.movementAllowed;
  if (awaitingUpgradeBeat) return false;

  return true;
};
