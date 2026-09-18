/**
 * Shared shapes for the engine. The original code passed `any` everywhere;
 * these are the structures it was actually building.
 */

/** Axis-aligned box in world pixels — the unit every collision test speaks. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Tile coordinate (column, row) rather than world pixels. */
export interface TilePoint {
  x: number;
  y: number;
}

export interface Player extends Rect {
  vx: number;
  vy: number;
  speed: number;
  jumpForce: number;
  onGround: boolean;
  /** 1 = facing right, -1 = facing left. */
  dir: number;
}

export interface Enemy extends Rect {
  id: number;
  vx: number;
  vy: number;
  dir: number;
  health: number;
  onGround: boolean;
  /** Tile the enemy respawns at after being killed. */
  spawnTX: number;
  spawnTY: number;
}

export interface Boss extends Rect {
  vx: number;
  vy: number;
  dir: number;
  health: number;
  /** Set once the bridge is cut, switching the boss to free-fall. */
  canFall: boolean;
}

export interface WeaponPickup extends Rect {
  collected: boolean;
}

export interface Star extends Rect {
  collected: boolean;
}

export type Reward = Rect;

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WeaponType = "sheriff" | "sniper";

export interface Ammo {
  mag: number;
  reserve: number;
  magSize: number;
}

export interface Tracer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds elapsed since the shot was fired. */
  age: number;
  /** Seconds before the tracer despawns. */
  life: number;
  /** Collision radius in world pixels. */
  r: number;
  damage: number;
  type: WeaponType;
  /** Length of the drawn streak in pixels. */
  trail: number;
}

export interface Trap extends TilePoint {
  /** True while the player is standing on the plate. */
  active: boolean;
}

/** The rope post on the boss level that drops the bridge when severed. */
export interface CutTile extends TilePoint {
  cut: boolean;
  /** Cut completion, 0..1. */
  progress: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  img: string;
}

/** Directional input, sampled by the keyboard handler and read by physics. */
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  attack: boolean;
}

/** A level map as a mutable grid of tile characters. */
export type TileMap = string[][];
