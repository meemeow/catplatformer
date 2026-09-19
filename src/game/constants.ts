/**
 * Tuning values for the platformer. Every magic number the engine used to
 * carry inline lives here so balance changes happen in one file.
 */

/** Size of one map tile, in world pixels. */
export const TILE = 32;

/** Nominal viewport in tiles; the canvas is resized per level to fit the map. */
export const VIEW_WIDTH = 16 * TILE;
export const VIEW_HEIGHT = 10 * TILE;

/** CSS upscale applied to the canvas and to every DOM sprite layered on it. */
export const SCALE = 1.2;

/** Visual-only multipliers. */
/**
 * Drawn size of the hostage, as a multiple of its collision box.
 *
 * The height matches the player's drawn height so the two cats read as the
 * same size standing together. The width is larger because the art is broader
 * than the player's — outstretched arms and tears — and squashing it to the
 * player's width would distort it.
 */
export const REWARD_SCALE = { x: 1.48, y: 1.35 } as const;
export const ENEMY_SCALE = 1.5;
/**
 * How much larger the cat is drawn than the box it collides with, per axis.
 *
 * Purely cosmetic: the sprite grows from its feet and stays centred on the
 * hitbox, so every gap, jump and ledge in the levels behaves exactly as before.
 * The axes are separate so the cat's build can be tuned -- a smaller `x` than
 * `y` slims it without losing any height.
 */
export const PLAYER_SCALE = { x: 1.15, y: 1.35 } as const;
/** How much of its tile the decorative boulder fills, keeping its proportions. */
export const ROCK_SCALE = 0.8;

/** Rendered width of weapon pickups / held weapons, in world pixels. */
export const WEAPON_PICKUP_WIDTH_PX = 40;
export const SNIPER_PICKUP_WIDTH_PX = 120;
/** The cutter is drawn at a fraction of the weapon width it replaces. */
export const CUTTER_SCALE = 0.2;

/** Ceiling for the enemy-proximity "yapapa" loop (0..1). */
export const YAP_MAX = 0.1;
/** Enemies are audible from this many tiles away. */
export const YAP_RANGE_TILES = 10;

/** Stars available across the whole game. */
export const TOTAL_STARS = 4;
/** Stars a single level may contain. */
export const MAX_STARS_PER_LEVEL = 4;

/** Index of the boss level inside `LEVELS`. */
export const BOSS_LEVEL_INDEX = 4;
/**
 * Level the game opens on, 0-based, so level 5 is 4.
 *
 * Anything other than 0 skips the arrival cutscene, which only makes sense on
 * the way into level one. Set this back to 0 for a normal playthrough.
 */
export const START_LEVEL_INDEX: number = 0;
/** Index of the level that shows the first-star hint bubble. */
export const FIRST_STAR_LEVEL_INDEX = 0;

export const PHYSICS = {
  /** Downward acceleration applied to the player and enemies, px/s². */
  gravity: 1200,
  /** Stronger gravity used only while the boss is plummeting into the lava. */
  bossFallGravity: 1800,
  /** Terminal velocity, px/s. */
  maxFallSpeed: 800,
  /** Fraction of jump force returned when bouncing off a stomped target. */
  stompBounce: 0.6,
  /** Largest simulated step, in seconds, so tab-outs cannot tunnel. */
  maxTimestep: 0.03,
} as const;

export const PLAYER_STATS = {
  width: TILE * 0.85,
  height: TILE * 0.99,
  speed: 160,
  jumpForce: 500,
} as const;

export const ENEMY_STATS = {
  width: TILE * 0.75,
  height: TILE * 0.85,
  speed: 60,
  health: 1,
} as const;

export const BOSS_STATS = {
  width: TILE * 1.5,
  height: TILE * 2,
  speed: 40,
  maxHealth: 1500,
} as const;

/** Per-weapon fire rate, damage and projectile speed. */
export const WEAPONS = {
  sheriff: {
    magSize: 6,
    startingMag: 6,
    startingReserve: 6,
    cooldownMs: 250,
    reloadMs: 2250,
    damage: 55,
    bulletSpeed: 900,
    tracerRadius: 1.25,
    tracerTrail: 28,
    meleeRangeTiles: 3,
    hudLabel: "Sheriff",
  },
  sniper: {
    magSize: 5,
    startingMag: 5,
    startingReserve: 0,
    cooldownMs: Math.round(1000 / 0.6),
    reloadMs: 0,
    damage: 150,
    bulletSpeed: 2000,
    tracerRadius: 2,
    tracerTrail: 44,
    meleeRangeTiles: 6,
    hudLabel: "Operator",
  },
} as const;

export const TIMINGS = {
  /** Milliseconds per character while dialogue types itself out. */
  dialogueCharMs: 25,
  /** How long the player must hold left-click to sever the bridge rope. */
  cutDurationMs: 8000,
  /** Delay before a killed enemy returns at its spawn tile. */
  enemyRespawnMs: 30000,
  /** How long the shocked-cat death GIF stays on screen. */
  enemyDeathGifMs: 1200,
  /** Grace period after picking a weapon up before it can fire. */
  pickupFireDelayMs: 300,
  /** Banner durations. */
  levelCompleteMs: 1200,
  rewardCompleteMs: 1500,
  bossAliveWarningMs: 1500,
  levelResetMs: 2000,
  /** Cutscene pacing. */
  cutsceneWalkSpeed: 120,
  cutsceneDialogDelayMs: 420,
  scriptedWalkDialogDelayMs: 120,
  deathRespawnDelayMs: 2000,
  bossDefeatDialogDelayMs: 3000,
  celebrationFlipMs: 2000,
  endFadeDelayMs: 4000,
  /** Interval driving the black-overlay fades, and the step per tick. */
  fadeTickMs: 100,
  fadeStep: 0.02,
} as const;

/** Distance (in tiles) within which a trap toggles a deactivated wall. */
export const TRAP_WALL_RADIUS = 10;
/** Player must be within this many tiles of the hostage to accept the cutter. */
export const HOSTAGE_PROXIMITY_TILES = 3;
