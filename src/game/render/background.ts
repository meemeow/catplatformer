import type { Camera } from "../types";
import { EARTH, SKY } from "./palette";
import { isReady, TEXTURES } from "./textures";

const CLOUD_COUNT = 7;

/** The haze colour that stands in for distance, matching the sky's horizon. */
const HAZE = "195,226,244";

/**
 * The fraction of a range's height over which its foot dissolves.
 *
 * Shared with the ground, which has to be opaque by the time this fade starts:
 * between the two lies the only place the sky could show through both, which
 * is what left a blue band above the earth.
 */
const FOOT_FADE = 0.28;

/**
 * Where the ground starts if the art has not loaded yet, as a fraction of the
 * canvas above the deepest range's foot.
 *
 * Only a fallback: without the sprite there is no drawn height to take the
 * fade from.
 */
const GROUND_OVERLAP = 0.06;

/**
 * The band at the top of the ground where it fades in, in pixels.
 *
 * Everything below it is opaque. It is only deep enough to let the dissolved
 * feet of the ranges settle into the earth instead of being cut off by a line
 * drawn across them.
 */
const GROUND_BLEND = 30;

/**
 * How much of the dark covers the ground's soil.
 *
 * The backdrop is the same earth the platforms are cut from, so without this
 * it would read as another surface to stand on. Dimming it settles it behind
 * them while leaving enough grain to see it is soil and not a painted panel.
 */
const GROUND_DIM = 0.65;

/**
 * How opaque the ground is over the sky behind it.
 *
 * Short of solid, so a little of the sky comes through and the earth sits in
 * the same aerial perspective as the ranges instead of being the one thing on
 * screen with no distance to it.
 */
const GROUND_OPACITY = 0.9;

/**
 * The side of one tile of background soil, in pixels.
 *
 * Smaller than a terrain tile so the backdrop reads as further off, and so its
 * grain does not line up with the platforms drawn over it.
 */
const GROUND_TILE = 28;

/** One tile of background soil, scaled down and ready to repeat. */
const groundTile = (soil: HTMLImageElement): HTMLCanvasElement => {
  const { canvas, ctx } = createLayer(GROUND_TILE, GROUND_TILE);
  // Pixel art: let it stay hard-edged rather than blur as it shrinks.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(soil, 0, 0, GROUND_TILE, GROUND_TILE);
  return canvas;
};

/**
 * One parallax band of mountains.
 *
 * `spacing` is how far apart copies of the sprite sit as a multiple of its
 * drawn width: below 1 they overlap into a continuous ridge, above 1 they
 * stand alone with sky between them. `footFrac` places the base as a fraction
 * of canvas height, so the composition holds at any viewport size.
 */
interface MountainLayer {
  sprite: HTMLImageElement;
  scale: number;
  spacing: number;
  footFrac: number;
  parallax: number;
  /** Aerial perspective: how far each band washes out toward the haze. */
  hazeTop: number;
  hazeFoot: number;
}

const mountainLayers = (): MountainLayer[] => [
  {
    sprite: TEXTURES.peak,
    scale: 0.52,
    spacing: 1.7,
    footFrac: 0.55,
    parallax: 0.16,
    hazeTop: 0.44,
    hazeFoot: 0.72,
  },
  {
    sprite: TEXTURES.range,
    scale: 0.58,
    spacing: 0.92,
    footFrac: 0.6,
    parallax: 0.32,
    hazeTop: 0.2,
    hazeFoot: 0.5,
  },
  {
    sprite: TEXTURES.range,
    scale: 0.88,
    spacing: 0.88,
    footFrac: 0.65,
    parallax: 0.55,
    hazeTop: 0.04,
    hazeFoot: 0.28,
  },
];

const createLayer = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return { canvas, ctx: canvas.getContext("2d") as CanvasRenderingContext2D };
};

/**
 * Renders one band of mountains into a strip that tiles horizontally.
 *
 * Copies are laid at exact multiples of `step`, and the strip is a whole
 * number of steps wide, so the content is periodic and the join between two
 * blits of the strip is invisible. The extra copies either side cover the
 * sprite overhanging each end.
 */
const buildMountainStrip = (
  width: number,
  height: number,
  layer: MountainLayer,
): HTMLCanvasElement => {
  const { canvas, ctx } = createLayer(width, height);
  const w = Math.round(layer.sprite.naturalWidth * layer.scale);
  const h = Math.round(layer.sprite.naturalHeight * layer.scale);
  const count = Math.max(1, Math.round(width / (w * layer.spacing)));
  const step = width / count;
  const baseY = Math.round(height * layer.footFrac);

  for (let i = -1; i <= count; i++) {
    ctx.drawImage(layer.sprite, Math.round(i * step), baseY - h, w, h);
  }

  // Aerial perspective: wash the band toward the haze colour, more of it the
  // further down the slope. `source-atop` keeps it off the sky between peaks.
  ctx.globalCompositeOperation = "source-atop";
  const mist = ctx.createLinearGradient(0, baseY - h, 0, baseY);
  mist.addColorStop(0, `rgba(${HAZE},${layer.hazeTop})`);
  mist.addColorStop(1, `rgba(${HAZE},${layer.hazeFoot})`);
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, width, height);

  // Dissolve the foot rather than ending it on a hard line. The ground hides
  // the base on most levels, but where a level leaves it exposed the range
  // has to fade into the sky instead of floating above it. The gradient is
  // filled over the whole strip because `destination-in` erases everything
  // the fill does not cover, and canvas gradients clamp past their stops.
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(
    0,
    baseY - Math.round(h * FOOT_FADE),
    0,
    baseY,
  );
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  return canvas;
};

/**
 * Sky, sun, mountains and clouds.
 *
 * The mountains are rendered once into offscreen strips and then blitted with
 * a parallax offset, so a full-screen redraw costs a handful of blits rather
 * than a per-pixel pass over the ridge line.
 */
export class BackgroundRenderer {
  private width = 0;
  private height = 0;
  private strips: HTMLCanvasElement[] = [];
  /** The tiled earth behind the level, built once per size. */
  private ground: HTMLCanvasElement | null = null;
  private layers: MountainLayer[] = [];
  /** Strips built before the art arrived would be blank, so they are rebuilt. */
  private builtFromTextures = false;

  private rebuild(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.layers = mountainLayers();
    this.builtFromTextures =
      this.layers.every((layer) => isReady(layer.sprite)) &&
      isReady(TEXTURES.dirt[0]);
    this.strips = this.builtFromTextures
      ? this.layers.map((layer) => buildMountainStrip(width, height, layer))
      : [];
    this.ground = this.buildGround(width, height);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    camera: Camera,
    now: number,
  ): void {
    if (width !== this.width || height !== this.height || !this.builtFromTextures) {
      this.rebuild(width, height);
    }

    this.drawSky(ctx, width, height);
    this.drawSun(ctx, width, camera);
    // Behind the ranges: they stand on the ground rather than being cut off
    // at the ankle by it.
    this.drawGround(ctx, width, height);
    this.drawMountains(ctx, width, camera);
    this.drawClouds(ctx, width, camera, now);
  }

  private drawSky(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, SKY.top);
    sky.addColorStop(0.55, SKY.mid);
    sky.addColorStop(1, SKY.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }

  private drawSun(
    ctx: CanvasRenderingContext2D,
    width: number,
    camera: Camera,
  ): void {
    // Barely tracks the camera, so it reads as being very far away.
    const x = Math.max(90, Math.min(width - 90, width * 0.2 - camera.x * 0.02));
    const y = 76;

    const glow = ctx.createRadialGradient(x, y, 6, x, y, 46);
    glow.addColorStop(0, SKY.sun);
    glow.addColorStop(1, SKY.sunGlow);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMountains(
    ctx: CanvasRenderingContext2D,
    width: number,
    camera: Camera,
  ): void {
    this.strips.forEach((strip, index) => {
      const shift = (camera.x * this.layers[index].parallax) % width;
      const x = Math.round(shift > 0 ? -shift : -shift - width);
      // Two blits cover the viewport whatever the offset; the strip is built
      // to tile, so the seam between them is invisible.
      ctx.drawImage(strip, x, 0);
      ctx.drawImage(strip, x + width, 0);
    });
  }

  /**
   * Where the ground starts to fade in and where it becomes solid.
   *
   * The two are the deepest range's own fade: the ground comes up exactly as
   * the range dissolves and is opaque by the time the range has gone. Neither
   * can leave a gap for the sky, and retuning a layer's scale or footing moves
   * the ground with it.
   */
  private groundBand(height: number): { top: number; solid: number } {
    const deepest = this.layers.reduce((low, layer) =>
      layer.footFrac > low.footFrac ? layer : low,
    );
    const baseY = Math.round(height * deepest.footFrac);

    if (!this.builtFromTextures) {
      const top = Math.round(baseY - height * GROUND_OVERLAP);
      return { top, solid: Math.min(height, top + GROUND_BLEND) };
    }
    const drawn = deepest.sprite.naturalHeight * deepest.scale;
    return { top: Math.round(baseY - drawn * FOOT_FADE), solid: baseY };
  }

  /**
   * The ground below the ranges: solid earth, not a tint over the sky.
   *
   * It is the level's own soil, tiled and dimmed so it settles behind the
   * platforms rather than competing with them, and it is opaque from the
   * height at which
   * the lowest range starts to dissolve. That is what closes the band of sky
   * that used to show between the two: above that line the range still covers
   * the ground, below it the ground covers the sky.
   */
  /**
   * Builds the earth once, rather than tiling and dimming it every frame.
   *
   * The top edge is cut with `destination-in` so the strip itself fades out
   * there: the fade has to take the soil with it, which a gradient painted
   * over the top could not do.
   */
  private buildGround(
    width: number,
    height: number,
  ): HTMLCanvasElement | null {
    const soil = TEXTURES.dirt[0];
    if (!isReady(soil)) return null;

    const { top, solid } = this.groundBand(height);
    const { canvas, ctx } = createLayer(width, height - top);
    const blend = solid - top;

    const tiled = ctx.createPattern(groundTile(soil), "repeat");
    if (!tiled) return null;
    ctx.fillStyle = tiled;
    ctx.fillRect(0, 0, width, canvas.height);

    const dim = ctx.createLinearGradient(0, blend, 0, canvas.height);
    dim.addColorStop(0, EARTH.top);
    dim.addColorStop(1, EARTH.deep);
    ctx.globalAlpha = GROUND_DIM;
    ctx.fillStyle = dim;
    ctx.fillRect(0, 0, width, canvas.height);
    ctx.globalAlpha = 1;

    // Filled over the whole strip because `destination-in` erases whatever the
    // fill does not cover, and canvas gradients clamp past their stops.
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createLinearGradient(0, 0, 0, blend);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, `rgba(0,0,0,${GROUND_OPACITY})`);
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    return canvas;
  }

  private drawGround(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    if (this.ground) {
      ctx.drawImage(this.ground, 0, height - this.ground.height);
      return;
    }

    // Flat colour until the soil arrives, so the world is never open sky.
    const { top, solid } = this.groundBand(height);

    // The body: earth, darkening with depth the way buried tiles do.
    const body = ctx.createLinearGradient(0, solid, 0, height);
    body.addColorStop(0, EARTH.top);
    body.addColorStop(1, EARTH.deep);
    ctx.globalAlpha = GROUND_OPACITY;
    ctx.fillStyle = body;
    ctx.fillRect(0, solid, width, height - solid);
    ctx.globalAlpha = 1;

    // Its top edge only, fading in behind rock that is still solid there.
    const edge = ctx.createLinearGradient(0, top, 0, solid);
    edge.addColorStop(0, EARTH.clear);
    edge.addColorStop(1, EARTH.top);
    ctx.globalAlpha = GROUND_OPACITY;
    ctx.fillStyle = edge;
    ctx.fillRect(0, top, width, solid - top);
    ctx.globalAlpha = 1;
  }

  private drawClouds(
    ctx: CanvasRenderingContext2D,
    width: number,
    camera: Camera,
    now: number,
  ): void {
    const span = width + 300;

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const sprite = TEXTURES.cloud[i % TEXTURES.cloud.length];
      if (!isReady(sprite)) continue;

      const speed = 0.02 + (i % 3) * 0.01;
      const drift = now * 0.004 * (1 + (i % 4) * 0.25);

      // Positive modulo, so a cloud never jumps when the value crosses zero.
      const raw = i * 197 - camera.x * speed + drift;
      const x = ((raw % span) + span) % span - 200;
      const y = 40 + (i % 4) * 46;
      const scale = 0.5 + (i % 3) * 0.11;

      ctx.drawImage(
        sprite,
        Math.round(x),
        Math.round(y),
        Math.round(sprite.naturalWidth * scale),
        Math.round(sprite.naturalHeight * scale),
      );
    }
  }
}
