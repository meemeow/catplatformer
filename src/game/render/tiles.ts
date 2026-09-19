import { ROCK_SCALE, TILE } from "../constants";
import type { GameMap } from "../core/map";
import { tileKey } from "../core/map";
import type { GameWorld } from "../core/world";
import { TILE_CHARS } from "../data/tiles";
import type { Camera, CutTile } from "../types";
import { paintRockTile, paintSoilTile, paintStoneBrickTile } from "./tileArt";
import { abyssAt, DEPTH, LAVA, STONE, WOOD } from "./palette";
import { tileVariant } from "./random";
import { isReady, TEXTURES } from "./textures";

/**
 * How many rows of ground keep their texture: the grassy top and one row of
 * lit soil under it. Everything deeper is drawn as flat dark earth.
 */
const LIT_ROWS = 2;

/** Open sky: nothing in this tile cuts the ground below it off from the light. */
const isOpenAir = (map: GameMap, tx: number, ty: number): boolean =>
  !map.isSolid(tx, ty) &&
  !map.isBridge(tx, ty) &&
  map.tileAt(tx, ty) !== TILE_CHARS.lava;

/**
 * One row past the lit soil: far enough to tell the first buried row from the
 * unlit ones below it, which are all drawn the same way.
 */
const DEEPEST = LIT_ROWS + 1;

/**
 * How many tiles sit between this one and the open air above it, counted no
 * further than `DEEPEST` — past that there is no reason to walk the column.
 */
const buriedDepth = (map: GameMap, tx: number, ty: number): number => {
  for (let above = 1; above <= DEEPEST; above++) {
    // Past the top of the map is not rock, it is the end of the world, and
    // nothing there buries anything. The ceiling row keeps its soil rather
    // than reading as a black bar across the top of the level. It never counts
    // as open either, so it grows no grass: there is no sky up there.
    if (ty - above < 0) return Math.max(above - 1, 1);
    // Lava is opaque: the ground under a pool is not merely shaded but cut off
    // from the light entirely, so it skips the falloff and starts out dark
    // however shallow the pool is.
    if (map.tileAt(tx, ty - above) === TILE_CHARS.lava) return DEEPEST;
    if (isOpenAir(map, tx, ty - above)) return above - 1;
  }
  return DEEPEST;
};

/** How far up the last lit row the dark beneath it reaches. */
const FOOT_FADE = 0.45;

/**
 * Fades the foot of the last lit row into the dark under it.
 *
 * Without this the change from textured soil to flat dark is a hard line
 * straight across the wall. The ground should lose its light the way the lava
 * cools through its own body — over a distance, not at a tile boundary.
 */
const shadeLitFoot = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  const top = screenY + TILE * (1 - FOOT_FADE);
  const fade = ctx.createLinearGradient(0, top, 0, screenY + TILE);
  fade.addColorStop(0, DEPTH.clear);
  fade.addColorStop(1, DEPTH.fill);
  ctx.fillStyle = fade;
  ctx.fillRect(screenX, top, TILE, TILE * FOOT_FADE);
};

/**
 * How much of the dark covers soil drawn underneath it.
 *
 * Not quite opaque: the little that comes through is the point. It leaves the
 * grain of the earth readable as shading in the dark rather than a flat void,
 * while staying far too dim to look lit. The face of a mass holds a little
 * more of its soil than the rock behind it, which is what gives a pillar an
 * edge rather than one flat tone across its width.
 */
const DEPTH_VEIL = {
  /** Against open space, where the light still catches the rock. */
  face: 0.76,
  /** Behind the face, where it does not. */
  inner: 0.94,
  /** Rock with nothing to be seen against: no soil shows through at all. */
  unseen: 1,
} as const;

/**
 * The extra dark laid on away from an open side, taking a face back to
 * `inner`.
 *
 * A face tile is painted at the lighter `face` level and then darkened across
 * its width, so the light dies away over a whole tile instead of stepping down
 * at the seam between two of them. The figure is what the second coat has to
 * be for the two together to leave as little soil showing as `inner` alone:
 * (1 - face)(1 - falloff) = 1 - inner.
 */
const EDGE_FALLOFF =
  1 - (1 - DEPTH_VEIL.inner) / (1 - DEPTH_VEIL.face);

/** Which sides of a tile look out on open space. */
interface Faces {
  left: boolean;
  right: boolean;
}

/** Neither side: the tile is inside a mass. */
const NO_FACES: Faces = { left: false, right: false };

/**
 * Whether this tile belongs to rock hanging over open space rather than to the
 * ground the level is built on.
 *
 * Found by looking straight down: ground runs unbroken to the foot of the map,
 * while a cliff or a cave roof has air somewhere beneath it. Only the hanging
 * kind is shaded. It is seen against the sky and wants to read as rock, where
 * deep ground is just the bottom of the world with nothing to see into.
 */
const isOverhang = (map: GameMap, tx: number, ty: number): boolean => {
  for (let below = ty + 1; below < map.rows; below++) {
    if (isOpenAir(map, tx, below)) return true;
  }
  return false;
};

/** How far from an edge a tile can sit and still be seen against open space. */
const SHADE_REACH = 3;

/**
 * Whether open space is close enough to either side that this tile is seen
 * against it.
 *
 * A pillar or the edge of a bank is read as stone standing in the light, so it
 * is shaded. Rock this far from any edge is in the middle of solid ground,
 * with nothing to be seen against.
 */
const isNearEdge = (map: GameMap, tx: number, ty: number): boolean => {
  for (let step = 1; step <= SHADE_REACH; step++) {
    if (isOpenAir(map, tx - step, ty) || isOpenAir(map, tx + step, ty)) {
      return true;
    }
  }
  return false;
};

/**
 * The unlit ground.
 *
 * The first buried row falls from `fill` to `abyss` across its own height,
 * picking up exactly where the row above left off; everything under it is as
 * dark as the ground gets.
 */
const paintDepth = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  buried: number,
  /** How much of the dark covers soil already drawn underneath it. */
  veil: number,
  /** Which sides of the tile look out on open space, if any. */
  faces: Faces = NO_FACES,
): void => {
  if (buried > LIT_ROWS) {
    ctx.fillStyle = DEPTH.abyss;
  } else {
    const fall = ctx.createLinearGradient(0, screenY, 0, screenY + TILE);
    fall.addColorStop(0, DEPTH.fill);
    fall.addColorStop(1, DEPTH.abyss);
    ctx.fillStyle = fall;
  }
  ctx.globalAlpha = veil;
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.globalAlpha = 1;

  if (!faces.left && !faces.right) return;

  // The second coat: nothing at the open side, full strength away from it, so
  // the rock darkens across the tile rather than at its edge.
  const across = ctx.createLinearGradient(screenX, 0, screenX + TILE, 0);
  const lit = abyssAt(0);
  const dark = abyssAt(EDGE_FALLOFF);
  if (faces.left && faces.right) {
    across.addColorStop(0, lit);
    across.addColorStop(0.5, dark);
    across.addColorStop(1, lit);
  } else if (faces.left) {
    across.addColorStop(0, lit);
    across.addColorStop(1, dark);
  } else {
    across.addColorStop(0, dark);
    across.addColorStop(1, lit);
  }
  ctx.fillStyle = across;
  ctx.fillRect(screenX, screenY, TILE, TILE);
};

/**
 * How much dark everything inside the cave takes.
 *
 * One figure for the painted wall and for the ground in front of it, so the
 * whole hollow sits at a single light level instead of a dim backdrop with
 * bright ledges stuck on it. At full brightness a large stretch of cave reads
 * as the nearest thing on screen.
 */
const CAVE_DIM = 0.4;

/** How many courses of wall the ground above it darkens. */
const WALL_SHADE_ROWS = 3;

/**
 * The strength of that dark at each course, mixed once rather than per tile.
 *
 * A tile takes the entry for its own depth at its top edge and the next one at
 * its bottom, so consecutive courses meet at the same value and the wall fades
 * out continuously rather than in steps.
 */
const WALL_SHADE = Array.from({ length: WALL_SHADE_ROWS + 1 }, (_, course) =>
  abyssAt(1 - course / WALL_SHADE_ROWS),
);

/**
 * How many courses below the ground this piece of wall sits, counted no
 * further than the dark reaches.
 *
 * A run of wall that is not capped by ground gets `WALL_SHADE_ROWS`, which is
 * the same as no shade at all: there is nothing above it to be in the shadow
 * of.
 */
const wallShadeDepth = (map: GameMap, tx: number, ty: number): number => {
  for (let above = 1; above <= WALL_SHADE_ROWS; above++) {
    if (map.tileAt(tx, ty - above) === TILE_CHARS.passableDirt) continue;
    return map.isSolid(tx, ty - above) ? above - 1 : WALL_SHADE_ROWS;
  }
  return WALL_SHADE_ROWS;
};

/**
 * Sinks the top of the painted wall into the ground above it.
 *
 * The wall is a flat backdrop butted straight against the terrain, so wherever
 * the two met there was a hard stepped line with brick on one side and earth
 * on the other. Carrying the dark of that earth down over the first few
 * courses makes the wall emerge from under the ground instead of stopping
 * against it.
 */
const shadeWallHead = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  course: number,
): void => {
  if (course >= WALL_SHADE_ROWS) return;
  const head = ctx.createLinearGradient(0, screenY, 0, screenY + TILE);
  head.addColorStop(0, WALL_SHADE[course]);
  head.addColorStop(1, WALL_SHADE[course + 1]);
  ctx.fillStyle = head;
  ctx.fillRect(screenX, screenY, TILE, TILE);
};

/** Drops a tile to the light level inside the cave. */
const dimInCave = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  ctx.globalAlpha = CAVE_DIM;
  ctx.fillStyle = DEPTH.abyss;
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.globalAlpha = 1;
};

/**
 * Whether this ground is roofed by the painted wall rather than by the sky.
 *
 * Looks up through the tile's own soil to whatever covers it: the wall means
 * the cave, empty sky means outside. Only the lit rows ever ask, so this never
 * walks further than the soil is deep.
 */
const isIndoors = (map: GameMap, tx: number, ty: number): boolean => {
  for (let above = 1; above <= LIT_ROWS; above++) {
    if (map.tileAt(tx, ty - above) === TILE_CHARS.passableDirt) return true;
    if (!map.isSolid(tx, ty - above)) return false;
  }
  return false;
};

/** Everything a tile needs to know about the world to draw itself. */
export interface TileDrawContext {
  camera: Camera;
  map: GameMap;
  activatedTraps: Set<string>;
  cutTile: CutTile | null;
  /** The last level floods its pit, so lava is drawn full-height there. */
  fullHeightLava: boolean;
}

/** Builds a draw context from the live world. */
export const tileDrawContext = (
  world: GameWorld,
  fullHeightLava: boolean,
): TileDrawContext => ({
  camera: world.camera,
  map: world.map,
  activatedTraps: world.activatedTraps,
  cutTile: world.cutTile,
  fullHeightLava,
});

/**
 * Draws map tiles, caching the three procedurally generated ones.
 *
 * The cache is keyed by tile type and art variant rather than by coordinate:
 * the first tile of each variant to be drawn defines how all of them look,
 * which is what keeps a full-screen redraw cheap.
 */
export class TileRenderer {
  private readonly cache = new Map<string, HTMLCanvasElement>();

  /** Called when the level changes, so art does not carry over. */
  clear(): void {
    this.cache.clear();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    char: string,
    screenX: number,
    screenY: number,
    context: TileDrawContext,
  ): void {
    const tx = Math.floor((screenX + context.camera.x) / TILE);
    const ty = Math.floor((screenY + context.camera.y) / TILE);

    switch (char) {
      case TILE_CHARS.solid:
        this.drawSolid(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.passableDirt:
        this.drawTile(
          ctx,
          screenX,
          screenY,
          TEXTURES.brick,
          `brick_${tileVariant(tx, ty, 17, 13)}`,
          () => paintStoneBrickTile(tx, ty, tileVariant(tx, ty, 17, 13)),
        );
        dimInCave(ctx, screenX, screenY);
        shadeWallHead(
          ctx,
          screenX,
          screenY,
          wallShadeDepth(context.map, tx, ty),
        );
        break;
      case TILE_CHARS.rock:
        this.drawProp(
          ctx,
          screenX,
          screenY,
          TEXTURES.rock,
          `rock_${tileVariant(tx, ty, 19, 7)}`,
          () => paintRockTile(tx, ty, tileVariant(tx, ty, 19, 7)),
          ROCK_SCALE,
        );
        break;
      case TILE_CHARS.deactivatedWall:
        drawDeactivatedWall(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.lava:
        drawLava(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.cutPost:
        drawCutPost(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.bridge:
        drawBridge(ctx, screenX, screenY);
        break;
      case TILE_CHARS.trap:
        drawTrap(ctx, screenX, screenY, tx, ty, context);
        break;
      case TILE_CHARS.finish:
        drawFinishFlag(ctx, screenX, screenY);
        break;
      default:
        // Empty tiles stay transparent so the parallax background shows through.
        break;
    }
  }

  /** Ground grows grass only where nothing sits on top of it. */
  private drawSolid(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    tx: number,
    ty: number,
    context: TileDrawContext,
  ): void {
    const { map } = context;
    const showGrass = isOpenAir(map, tx, ty - 1);

    // Past the lit rows the ground is unlit earth. That is what reads as
    // depth, and it stops a tall bank of dirt looking like one tile stamped
    // over and over. Only the first buried row keeps any light; below that the
    // ground is as dark as it gets.
    const buried = showGrass ? 0 : buriedDepth(map, tx, ty);

    // Rock keeps its soil under the dark wherever it can be seen against open
    // space — hanging over it, or standing near enough to an edge. Ground
    // buried in the middle of a mass has nothing to be seen against, so it is
    // drawn flat with no soil beneath it to show.
    const seen = isOverhang(map, tx, ty) || isNearEdge(map, tx, ty);
    if (buried >= LIT_ROWS && !seen) {
      paintDepth(ctx, screenX, screenY, buried, DEPTH_VEIL.unseen);
      return;
    }

    const variant = showGrass ? tileVariant(tx, ty, 31, 17) : 0;
    const key = showGrass ? `soil_grass_${variant}` : "soil_bare";
    // Buried soil varies on its own seed, so a wall of dirt does not repeat
    // whichever single tile the grass variant happens to pick.
    const set = showGrass ? TEXTURES.grass : TEXTURES.dirt;
    const index = showGrass ? variant : tileVariant(tx, ty, 23, 11);

    this.drawTile(ctx, screenX, screenY, set[index % set.length], key, () =>
      paintSoilTile(tx, ty, variant, showGrass),
    );

    // Seen rock keeps its soil under the dark, so the grain still shows through
    // and it reads as shaded stone instead of a hole cut out of the world.
    if (buried >= LIT_ROWS) {
      const faces: Faces = {
        left: isOpenAir(map, tx - 1, ty),
        right: isOpenAir(map, tx + 1, ty),
      };
      const lit = faces.left || faces.right;
      paintDepth(
        ctx,
        screenX,
        screenY,
        buried,
        lit ? DEPTH_VEIL.face : DEPTH_VEIL.inner,
        faces,
      );
      return;
    }

    // The last row before the dark carries the start of the falloff, so the
    // two meet at the same shade rather than at a seam. Skipped where there is
    // nothing underneath: a thin platform has no depth to shade into.
    if (buried === LIT_ROWS - 1 && !isOpenAir(map, tx, ty + 1)) {
      shadeLitFoot(ctx, screenX, screenY);
    }

    // Ground under the painted wall is inside the cave, so it is lit by the
    // cave rather than by the sky and drops to match it.
    if (isIndoors(map, tx, ty)) dimInCave(ctx, screenX, screenY);
  }

  /**
   * Draws a tile from its sheet texture, falling back to the procedural art
   * for as long as the image is still in flight.
   *
   * The textures are the real art; the painters stay so that a cold load, or
   * a missing file, still shows terrain rather than a hole in the world.
   */
  private drawTile(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    texture: HTMLImageElement,
    key: string,
    paint: () => HTMLCanvasElement,
  ): void {
    if (isReady(texture)) {
      ctx.drawImage(texture, screenX, screenY, TILE, TILE);
      return;
    }
    this.drawCached(ctx, screenX, screenY, key, paint);
  }

  /**
   * Draws a cut-out prop instead of a full tile: scaled to fit the cell with
   * its proportions intact and resting on the cell floor, so it sits on
   * whatever is beneath it rather than floating or stretching to a square.
   */
  private drawProp(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    texture: HTMLImageElement,
    key: string,
    paint: () => HTMLCanvasElement,
    /** Fraction of the cell the prop fills; 1 fits it to the edges. */
    fill: number,
  ): void {
    if (!isReady(texture)) {
      this.drawCached(ctx, screenX, screenY, key, paint);
      return;
    }

    const scale =
      Math.min(TILE / texture.naturalWidth, TILE / texture.naturalHeight) * fill;
    const w = Math.round(texture.naturalWidth * scale);
    const h = Math.round(texture.naturalHeight * scale);
    ctx.drawImage(
      texture,
      screenX + Math.round((TILE - w) / 2),
      screenY + TILE - h,
      w,
      h,
    );
  }

  private drawCached(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    key: string,
    paint: () => HTMLCanvasElement,
  ): void {
    let tile = this.cache.get(key);
    if (!tile) {
      tile = paint();
      this.cache.set(key, tile);
    }
    ctx.drawImage(tile, screenX, screenY, TILE, TILE);
  }
}

/** A trap-controlled wall, hidden entirely while its trap is held down. */
const drawDeactivatedWall = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  if (context.map.disabledWalls.has(tileKey(tx, ty))) return;

  // Cut masonry, so it reads as built rather than grown.
  ctx.fillStyle = STONE.mortar;
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.fillStyle = STONE.brick;
  ctx.fillRect(screenX + 1, screenY + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = STONE.bevel;
  ctx.fillRect(screenX + 1, screenY + 1, TILE - 2, 2);
  ctx.fillStyle = STONE.shade;
  ctx.fillRect(screenX + 1, screenY + TILE - 3, TILE - 2, 2);
};

/** Molten rock: dark below, bright at the surface, with a glowing crust. */
const paintLavaBody = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  surfaceY: number,
  depth: number,
  /** False for lava with more lava above it, which has no surface of its own. */
  surface: boolean,
): void => {
  if (!surface) {
    // Below the top the glow has already fallen off, so this is a flat deep
    // fill that carries on from the tile above. Repeating the hot gradient per
    // tile is what turned a deep pool into a stack of separate bands.
    ctx.fillStyle = LAVA.deep;
    ctx.fillRect(screenX, surfaceY, TILE, depth);
    return;
  }

  const molten = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + depth);
  molten.addColorStop(0, LAVA.hot);
  molten.addColorStop(0.35, LAVA.body);
  molten.addColorStop(1, LAVA.deep);
  ctx.fillStyle = molten;
  ctx.fillRect(screenX, surfaceY, TILE, depth);

  ctx.fillStyle = LAVA.crust;
  ctx.fillRect(screenX, surfaceY, TILE, 2);
  ctx.fillStyle = LAVA.hot;
  ctx.fillRect(screenX, surfaceY + 2, TILE, 1);
};

const drawLava = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  // Only the top of a pool has a surface. Everything under it fills its tile
  // completely, so however deep the pool is it reads as one body of lava with
  // a single crust rather than one band per row.
  if (context.map.tileAt(tx, ty - 1) === TILE_CHARS.lava) {
    paintLavaBody(ctx, screenX, screenY, TILE, false);
    return;
  }

  if (context.fullHeightLava) {
    paintLavaBody(ctx, screenX, screenY, TILE, true);
    return;
  }

  // Half-height pools read as shallow, so the sky shows above them.
  paintLavaBody(ctx, screenX, screenY + TILE / 2, TILE / 2, true);
};

/** The rope anchor, plus a progress bar while the player is cutting it. */
const drawCutPost = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  const postX = screenX + TILE * 0.38;
  const postW = TILE * 0.24;
  ctx.fillStyle = WOOD.mid;
  ctx.fillRect(postX, screenY + TILE * 0.12, postW, TILE * 0.76);
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(postX, screenY + TILE * 0.12, 2, TILE * 0.76);
  ctx.fillStyle = WOOD.dark;
  ctx.fillRect(postX + postW - 2, screenY + TILE * 0.12, 2, TILE * 0.76);

  // Ropes reach toward whichever neighbours are bridge tiles.
  ctx.strokeStyle = WOOD.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (context.map.tileAt(tx - 1, ty) === TILE_CHARS.bridge) {
    ctx.moveTo(screenX + TILE * 0.35, screenY + TILE * 0.28);
    ctx.lineTo(screenX - TILE * 0.5, screenY + TILE * 0.28);
  }
  if (context.map.tileAt(tx + 1, ty) === TILE_CHARS.bridge) {
    ctx.moveTo(screenX + TILE * 0.65, screenY + TILE * 0.28);
    ctx.lineTo(screenX + TILE * 1.5, screenY + TILE * 0.28);
  }
  ctx.stroke();

  const cut = context.cutTile;
  if (!cut || cut.x !== tx || cut.y !== ty || cut.cut || cut.progress <= 0) return;

  const barWidth = Math.round(TILE * 0.6);
  const barHeight = 6;
  const barX = screenX + Math.round((TILE - barWidth) / 2);
  const barY = screenY + TILE - 10;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(
    barX + 1,
    barY + 1,
    Math.max(0, Math.round((barWidth - 2) * cut.progress)),
    barHeight - 2,
  );
};

/** Plank decking, lit along the top edge and shadowed underneath. */
const drawBridge = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  ctx.fillStyle = WOOD.mid;
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(screenX, screenY, TILE, 3);

  // Board seams, and the gaps you can see daylight through.
  ctx.fillStyle = WOOD.dark;
  for (let x = 0; x < TILE; x += 8) ctx.fillRect(screenX + x, screenY, 1, TILE);
  ctx.fillStyle = WOOD.grain;
  ctx.fillRect(screenX, screenY + 11, TILE, 1);
  ctx.fillRect(screenX, screenY + 21, TILE, 1);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(screenX, screenY + TILE - 4, TILE, 4);
};

/** Pressure plate; turns green while the player stands on it. */
const drawTrap = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  ctx.fillStyle = context.activatedTraps.has(tileKey(tx, ty)) ? "#4caf50" : "#ff9800";
  ctx.fillRect(screenX, screenY, TILE, TILE);
  ctx.fillStyle = "#333";
  ctx.fillRect(screenX + 8, screenY + 8, TILE - 16, TILE - 16);
};

const drawFinishFlag = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  ctx.fillStyle = "#8b8b8b";
  ctx.fillRect(screenX + TILE / 2 - 2, screenY + 4, 4, TILE - 8);
  ctx.fillStyle = "#ff2d55";
  ctx.fillRect(screenX + TILE / 2 + 2, screenY + 6, TILE / 2 - 4, TILE / 3);
};
