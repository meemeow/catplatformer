import type { Camera } from "../types";
import { SKY } from "./palette";
import { isReady, TEXTURES } from "./textures";

const CLOUD_COUNT = 7;

/** The haze colour that stands in for distance, matching the sky's horizon. */
const HAZE = "195,226,244";

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
  const fade = ctx.createLinearGradient(0, baseY - Math.round(h * 0.28), 0, baseY);
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
  private layers: MountainLayer[] = [];
  /** Strips built before the art arrived would be blank, so they are rebuilt. */
  private builtFromTextures = false;

  private rebuild(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.layers = mountainLayers();
    this.builtFromTextures = this.layers.every((layer) => isReady(layer.sprite));
    this.strips = this.builtFromTextures
      ? this.layers.map((layer) => buildMountainStrip(width, height, layer))
      : [];
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
