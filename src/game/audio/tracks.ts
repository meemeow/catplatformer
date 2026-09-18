import { SOUNDS } from "../assets";
import { YAP_MAX } from "../constants";

export interface TrackSpec {
  src: string;
  volume: number;
  loop?: boolean;
}

/**
 * Every sound the game owns, with the mix baked in.
 *
 * Some clips appear twice on purpose: `enemyProximity` loops and is faded by
 * distance while `narrator` is a one-shot, and `hostageCry` must be able to
 * play over the looping `rewardCry` without cutting it off.
 */
export const TRACKS = {
  music: { src: SOUNDS.levelMusic, volume: 0.03, loop: true },
  footsteps: { src: SOUNDS.footsteps, volume: 0.15, loop: true },
  jump: { src: SOUNDS.jump, volume: 0.02 },
  enemyProximity: { src: SOUNDS.yapapa, volume: YAP_MAX, loop: true },
  narrator: { src: SOUNDS.yapapa, volume: Math.min(0.14, YAP_MAX || 0.14) },
  bonk: { src: SOUNDS.bonk, volume: 0.18 },
  roll: { src: SOUNDS.roll, volume: 0.14, loop: true },
  enemyDeath: { src: SOUNDS.catDead, volume: 0.03 },
  collect: { src: SOUNDS.collect, volume: 0.05 },
  levelFinish: { src: SOUNDS.levelFinish, volume: 0.12 },
  playerDeath: { src: SOUNDS.death, volume: 0.22 },
  rewardCry: { src: SOUNDS.cry, volume: 0.07, loop: true },
  sheriffReload: { src: SOUNDS.sheriffReload, volume: 0.48 },
  sheriffShot: { src: SOUNDS.sheriffShot, volume: 0.48 },
  sniperShot: { src: SOUNDS.sniperShot, volume: 0.48 },
  dialogue: { src: SOUNDS.dialogue, volume: 0.06, loop: true },
  bossGerman: { src: SOUNDS.germanCat, volume: 0.07 },
  bossChinese: { src: SOUNDS.chineseCat, volume: 0.14 },
  hostageCry: { src: SOUNDS.cry, volume: 0.18 },
  victory: { src: SOUNDS.happy, volume: 0.05 },
} as const satisfies Record<string, TrackSpec>;

export type TrackName = keyof typeof TRACKS;
