import { ROCK_SCALE, TILE } from "../constants";
import type { GameMap } from "../core/map";
import { tileKey } from "../core/map";
import type { GameWorld } from "../core/world";
import { TILE_CHARS } from "../data/tiles";
import type { Camera, CutTile } from "../types";
import { paintRockTile, paintSoilTile, paintStoneBrickTile } from "./tileArt";
import {
  abyssAt,
  DEPTH,
  FLAG,
  LAVA,
  PLATE,
  ROPE,
  STONE,
  WOOD,
} from "./palette";
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
  /** Frame timestamp, for tiles that move. */
  now: number;
}

/** Builds a draw context from the live world. */
export const tileDrawContext = (
  world: GameWorld,
  fullHeightLava: boolean,
  now: number,
): TileDrawContext => ({
  camera: world.camera,
  map: world.map,
  activatedTraps: world.activatedTraps,
  cutTile: world.cutTile,
  fullHeightLava,
  now,
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
        drawFinishFlag(ctx, screenX, screenY, context.now);
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

/**
 * The stones of one tile of wall, laid in a running bond.
 *
 * Two courses with the upper one offset by half a block, so the vertical
 * joints of one course land on the middle of the blocks below. A grid of
 * joints lining up is the thing that makes drawn masonry look like wallpaper.
 */
const WALL_STONES = [
  { x: 1, y: 1, w: 14, h: 13 },
  { x: 17, y: 1, w: 14, h: 13 },
  { x: 1, y: 16, w: 6, h: 14 },
  { x: 9, y: 16, w: 14, h: 14 },
  { x: 25, y: 16, w: 6, h: 14 },
] as const;

/**
 * One dressed stone: lit along the top and left, shadowed along the bottom and
 * right, so it sits proud of the mortar instead of being a flat patch.
 */
const paintStone = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: string,
): void => {
  ctx.fillStyle = tone;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = STONE.bevel;
  ctx.fillRect(x, y, w - 1, 1);
  ctx.fillRect(x, y, 1, h - 1);

  ctx.fillStyle = STONE.shade;
  ctx.fillRect(x + 1, y + h - 1, w - 1, 1);
  ctx.fillRect(x + w - 1, y + 1, 1, h - 1);
};

/**
 * A trap-controlled wall, hidden entirely while its trap is held down.
 *
 * Cut masonry rather than one bevelled slab: a stretch of these tiles used to
 * repeat the same block over and over with its joints in a perfect grid, which
 * read as a texture rather than as a wall someone built. Each stone takes its
 * tone and its weathering from where it sits on the map, so no two tiles of
 * the same wall come out identical.
 */
const drawDeactivatedWall = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  if (context.map.disabledWalls.has(tileKey(tx, ty))) return;

  ctx.fillStyle = STONE.mortar;
  ctx.fillRect(screenX, screenY, TILE, TILE);

  WALL_STONES.forEach((stone, index) => {
    const grain = tileVariant(tx * 7 + index, ty * 5 + index, 13, 29);
    paintStone(
      ctx,
      screenX + stone.x,
      screenY + stone.y,
      stone.w,
      stone.h,
      grain === 0 ? STONE.brickAlt : STONE.brick,
    );

    // Moss gathers on the top edges, where the damp sits. Two short dabs at
    // an offset taken from the stone's own position: a line across the whole
    // block reads as a painted stripe rather than as something growing.
    if (grain === 2) {
      const from = stone.x + 2 + tileVariant(tx + index, ty, 11, 3);
      ctx.fillStyle = STONE.mossDark;
      ctx.fillRect(screenX + from, screenY + stone.y + 1, 3, 1);
      ctx.fillStyle = STONE.moss;
      ctx.fillRect(screenX + from, screenY + stone.y + 1, 2, 1);
      ctx.fillRect(screenX + from + 5, screenY + stone.y + 1, 2, 1);
    }

    // A chipped corner, so the blocks do not all end on a clean right angle.
    if (grain === 3) {
      ctx.fillStyle = STONE.mortar;
      ctx.fillRect(screenX + stone.x + stone.w - 2, screenY + stone.y, 2, 2);
    }
  });
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

/** The rope is laid up from three strands, offset from its centre line. */
const ROPE_STRANDS = [-2, 0, 2] as const;

/** The post's geometry within its tile, and where the rope crosses it. */
const POST = {
  x: 12,
  w: 8,
  top: 4,
  ropeY: 10,
  /** How far past the post's face the cutter bites. */
  bite: 4,
} as const;

/** How far a parted strand drops, and how far the rope reaches each way. */
const CUT = { droop: 3, reach: TILE * 1.5, back: TILE * 0.5 } as const;

/**
 * The anchor post, and the rope being cut through.
 *
 * The cut used to show as a yellow bar floating under the tile. It is the rope
 * itself that reports now: the bite deepens as the cutter works, fibres spring
 * loose, and the three strands part one at a time. Over an eight-second hold
 * that gives both something moving every frame and three clear milestones,
 * where a bar gave a number and nothing to look at.
 */
const drawCutPost = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  const { map, cutTile, now } = context;
  const postX = screenX + POST.x;
  const postTop = screenY + POST.top;
  const ropeY = screenY + POST.ropeY;
  const biteX = postX + POST.w + POST.bite;

  const cutting =
    cutTile && cutTile.x === tx && cutTile.y === ty && !cutTile.cut
      ? cutTile.progress
      : 0;

  const toLeft = map.tileAt(tx - 1, ty) === TILE_CHARS.bridge;
  const toRight = map.tileAt(tx + 1, ty) === TILE_CHARS.bridge;

  // Rope first: the post stands in front of it.
  ROPE_STRANDS.forEach((offset, strand) => {
    const y = ropeY + offset;
    ctx.fillStyle = strand === 1 ? ROPE.lit : ROPE.mid;

    if (toLeft) {
      const from = screenX - CUT.back;
      ctx.fillRect(from, y, postX - from, 1);
    }
    if (!toRight) return;

    // Strands part one at a time, so the load visibly moves to the rest.
    const parted = cutting >= (strand + 1) / ROPE_STRANDS.length;
    const from = postX + POST.w;
    const to = screenX + CUT.reach;

    if (!parted) {
      ctx.fillRect(from, y, to - from, 1);
      return;
    }
    ctx.fillRect(from, y, biteX - from, 1);
    // Past the bite it has dropped onto whatever is still holding.
    ctx.fillStyle = ROPE.dark;
    ctx.fillRect(biteX + 2, y + CUT.droop, to - biteX - 2, 1);
    ctx.fillRect(biteX, y + 1, 2, CUT.droop);
  });

  // The post: a squared timber, banded in iron and capped.
  ctx.fillStyle = WOOD.mid;
  ctx.fillRect(postX, postTop, POST.w, TILE - POST.top);
  ctx.fillStyle = WOOD.light;
  ctx.fillRect(postX, postTop, 2, TILE - POST.top);
  ctx.fillStyle = WOOD.dark;
  ctx.fillRect(postX + POST.w - 2, postTop, 2, TILE - POST.top);
  ctx.fillStyle = WOOD.grain;
  ctx.fillRect(postX + 3, postTop + 6, 1, TILE - POST.top - 10);

  ctx.fillStyle = WOOD.light;
  ctx.fillRect(postX - 2, postTop - 3, POST.w + 4, 3);
  ctx.fillStyle = WOOD.dark;
  ctx.fillRect(postX - 2, postTop, POST.w + 4, 1);

  for (const bandY of [postTop + 8, postTop + 18]) {
    ctx.fillStyle = PLATE.kerbDark;
    ctx.fillRect(postX - 1, bandY, POST.w + 2, 3);
    ctx.fillStyle = PLATE.kerb;
    ctx.fillRect(postX - 1, bandY, POST.w + 2, 2);
    ctx.fillStyle = PLATE.kerbLit;
    ctx.fillRect(postX - 1, bandY, POST.w + 2, 1);
  }

  if (cutting <= 0 || !toRight) return;

  // The bite: an opening notch, with the pale inside of the rope showing.
  const depth = 1 + Math.round(cutting * 3);
  ctx.fillStyle = ROPE.dark;
  ctx.fillRect(biteX, ropeY - 3, 2, 7);
  ctx.fillStyle = ROPE.frayed;
  ctx.fillRect(biteX, ropeY - depth + 1, 2, depth);

  // Fibres springing loose, flicking with the stroke of the cutter.
  const flick = Math.round(Math.sin(now * 0.02));
  const flick2 = Math.round(Math.sin(now * 0.02 + 2));
  ctx.fillRect(biteX - 2, ropeY - 3 + flick, 1, 1);
  ctx.fillRect(biteX + 2, ropeY + 3 + flick2, 1, 1);
  ctx.fillRect(biteX - 3, ropeY + 2 - flick2, 1, 1);
};

/** One plank of decking and the gap after it, in pixels. */
const PLANK = { width: 7, gap: 1 } as const;

/** Where the bearer rope runs, measured down from the top of the tile. */
const DECK = { height: 9, bearerY: 9 } as const;

/**
 * A rope bridge: plank decking on a bearer rope, lashed at every board.
 *
 * It used to fill its whole tile with timber, which is why a span read as a
 * wall laid flat rather than as something you could fall off. The deck is only
 * as thick as a board now and everything under it is left open, so the drop is
 * visible through the bridge.
 */
const drawBridge = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void => {
  const step = PLANK.width + PLANK.gap;

  // The bearer the boards are lashed to, drawn first so it passes behind them.
  ctx.fillStyle = ROPE.dark;
  ctx.fillRect(screenX, screenY + DECK.bearerY, TILE, 2);
  ctx.fillStyle = ROPE.mid;
  ctx.fillRect(screenX, screenY + DECK.bearerY, TILE, 1);

  for (let x = 0; x < TILE; x += step) {
    const left = screenX + x;

    ctx.fillStyle = WOOD.mid;
    ctx.fillRect(left, screenY, PLANK.width, DECK.height);
    // Lit where boots land, shadowed on the underside and the trailing edge.
    ctx.fillStyle = WOOD.light;
    ctx.fillRect(left, screenY, PLANK.width, 2);
    ctx.fillStyle = WOOD.dark;
    ctx.fillRect(left, screenY + DECK.height - 2, PLANK.width, 2);
    ctx.fillRect(left + PLANK.width - 1, screenY, 1, DECK.height);
    ctx.fillStyle = WOOD.grain;
    ctx.fillRect(left + 1, screenY + 4, PLANK.width - 3, 1);

    // The lashing holding this board to the bearer.
    ctx.fillStyle = ROPE.lit;
    ctx.fillRect(left + 2, screenY + DECK.height - 3, 1, 5);
    ctx.fillStyle = ROPE.dark;
    ctx.fillRect(left + 3, screenY + DECK.height - 3, 1, 5);
  }
};

/** Pressure plate; turns green while the player stands on it. */
/** The plate's geometry within its tile, in pixels. */
const PLATE_ART = {
  /** Clear of the tile edges, so the kerb reads as set into the floor. */
  margin: 2,
  kerbH: 4,
  faceH: 5,
  /** How far the face stands above the kerb before it is stepped on. */
  travel: 2,
} as const;

/**
 * A pressure plate: an iron face on a stone kerb, sunk into the floor.
 *
 * It was a flat orange square with a dark square inside it, which read as a
 * marker rather than as a thing in the world. The plate now sits on the floor
 * of its tile like the other props, and its state shows in two ways: the face
 * drops flush with the kerb once it has been stepped on, and the lamp between
 * the rivets changes colour. The travel alone is two pixels, which is not
 * something a player can see mid-jump, so the lamp carries the reading.
 */
const drawTrap = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tx: number,
  ty: number,
  context: TileDrawContext,
): void => {
  const spent = context.activatedTraps.has(tileKey(tx, ty));
  const { margin, kerbH, faceH, travel } = PLATE_ART;

  const left = screenX + margin;
  const width = TILE - margin * 2;
  const kerbTop = screenY + TILE - kerbH;
  const faceTop = kerbTop - faceH + (spent ? travel : 0);

  // The stone kerb the plate is bedded into.
  ctx.fillStyle = PLATE.kerbDark;
  ctx.fillRect(left, kerbTop, width, kerbH);
  ctx.fillStyle = PLATE.kerb;
  ctx.fillRect(left, kerbTop, width, kerbH - 1);
  ctx.fillStyle = PLATE.kerbLit;
  ctx.fillRect(left, kerbTop, width, 1);

  // The recess the face travels in: dark, and taller while the face is raised.
  ctx.fillStyle = PLATE.socket;
  ctx.fillRect(left + 1, faceTop + faceH - 1, width - 2, kerbTop - faceTop - faceH + 2);

  // The iron face, bevelled so it reads as a slab rather than a stripe.
  const faceLeft = left + 2;
  const faceWidth = width - 4;
  ctx.fillStyle = PLATE.faceDark;
  ctx.fillRect(faceLeft, faceTop, faceWidth, faceH);
  ctx.fillStyle = PLATE.face;
  ctx.fillRect(faceLeft, faceTop, faceWidth, faceH - 1);
  ctx.fillStyle = PLATE.faceLit;
  ctx.fillRect(faceLeft, faceTop, faceWidth, 1);

  // Brass rivets holding the face down, one at each end.
  ctx.fillStyle = PLATE.rivet;
  ctx.fillRect(faceLeft + 1, faceTop + 1, 2, 2);
  ctx.fillRect(faceLeft + faceWidth - 3, faceTop + 1, 2, 2);

  // The lamp, with a bloom around it so it carries at a distance.
  const lampX = screenX + TILE / 2 - 1;
  const lampY = faceTop + 1;
  ctx.fillStyle = spent ? PLATE.spentGlow : PLATE.armedGlow;
  ctx.fillRect(lampX - 2, lampY - 1, 6, 4);
  ctx.fillStyle = spent ? PLATE.spent : PLATE.armed;
  ctx.fillRect(lampX, lampY, 2, 2);
};

/** The flag's geometry within its tile, in pixels. */
const FLAG_ART = {
  poleX: 9,
  poleW: 3,
  poleTop: 3,
  clothTop: 6,
  clothW: 17,
  clothH: 12,
} as const;

/** How the banner moves: sway in pixels, speed, and ripples across its width. */
const FLAG_WAVE = { sway: 2.4, speed: 0.005, ripples: 7 } as const;

/**
 * The level exit: a banner on a pole.
 *
 * Drawn as one-pixel columns rather than as a rectangle, each offset by a
 * travelling sine. Cloth pinned along a pole cannot move at its fixed edge and
 * moves most at its free one, so the sway is scaled by the distance out — that
 * alone is most of what makes it read as cloth instead of a card.
 *
 * Each column is then lit by which way the wave is turning under it, taken from
 * the slope of the same sine: a fold rolling toward the light catches it and
 * the back of a fold does not. Three flat tones rather than a gradient, because
 * at twelve pixels tall a blend is just mud.
 */
const drawFinishFlag = (
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  now: number,
): void => {
  const { poleX, poleW, poleTop, clothTop, clothW, clothH } = FLAG_ART;
  const x = screenX + poleX;

  // The pole, lit down one side so it reads as round rather than as a bar.
  ctx.fillStyle = FLAG.poleDark;
  ctx.fillRect(x, screenY + poleTop, poleW, TILE - poleTop);
  ctx.fillStyle = FLAG.pole;
  ctx.fillRect(x, screenY + poleTop, poleW - 1, TILE - poleTop);
  ctx.fillStyle = FLAG.poleLit;
  ctx.fillRect(x, screenY + poleTop, 1, TILE - poleTop);

  // A brass finial, and a socket where the pole meets the ground.
  ctx.fillStyle = FLAG.finial;
  ctx.fillRect(x, screenY + poleTop - 3, poleW, 3);
  ctx.fillRect(x - 1, screenY + poleTop - 2, poleW + 2, 1);
  ctx.fillStyle = FLAG.poleDark;
  ctx.fillRect(x - 2, screenY + TILE - 3, poleW + 4, 3);

  const clothX = x + poleW;
  const top = screenY + clothTop;

  for (let column = 0; column < clothW; column++) {
    // 0 at the pole, 1 at the free edge.
    const out = column / (clothW - 1);
    const phase = now * FLAG_WAVE.speed - out * FLAG_WAVE.ripples;
    const sway = Math.sin(phase) * FLAG_WAVE.sway * out;
    const turn = Math.cos(phase) * out;

    // The first columns are gathered against the pole and sit in its shadow.
    const tone =
      column < 2
        ? FLAG.clothHem
        : turn > 0.35
          ? FLAG.clothLit
          : turn < -0.35
            ? FLAG.clothShade
            : FLAG.cloth;

    ctx.fillStyle = tone;
    // The far edge hangs slightly shorter, as a loose corner does.
    const height = clothH - Math.round(out * 2);
    ctx.fillRect(clothX + column, Math.round(top + sway), 1, height);
  }
};
