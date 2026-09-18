import type { Camera } from "../types";
import { CLOUD, MOUNTAIN, SKY } from "./palette";
import { createSeededRandom } from "./random";

/** Vertical quantisation of the ridge line, for a stepped pixel-art edge. */
const RIDGE_STEP = 3;
const CLOUD_VARIANTS = 4;
const CLOUD_COUNT = 7;

const createLayer = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return { canvas, ctx: canvas.getContext("2d") as CanvasRenderingContext2D };
};

interface Peak {
  cx: number;
  height: number;
  halfWidth: number;
}

/**
 * Horizontal distance between two points on a strip that wraps around.
 *
 * Using the wrapped distance is what makes a layer tile seamlessly: a peak
 * near one edge also influences the opposite edge, so the two ends line up.
 */
const wrappedDistance = (a: number, b: number, width: number): number => {
  const d = Math.abs(a - b);
  return Math.min(d, width - d);
};

/**
 * Renders one parallax layer of mountains into a strip that can be tiled.
 *
 * Peaks are triangular rather than a smooth noise field, which is what gives
 * the hard silhouette the art style depends on, and each tall peak gets a
 * lighter cap so the ridge reads as lit from above.
 */
const buildMountainLayer = (
  width: number,
  height: number,
  layerIndex: number,
): HTMLCanvasElement => {
  const layer = MOUNTAIN[layerIndex];
  const { canvas, ctx } = createLayer(width, height);
  const random = createSeededRandom(1013 + layerIndex * 7717);

  const footY = height - layer.foot;
  const spacing = width / layer.peaks;

  const peaks: Peak[] = [];
  for (let i = 0; i < layer.peaks; i++) {
    peaks.push({
      cx: (i + 0.5) * spacing + (random() - 0.5) * spacing * 0.5,
      height: layer.foot * (0.45 + random() * 0.5),
      halfWidth: spacing * (0.55 + random() * 0.35),
    });
  }

  /** Upper envelope of every peak's triangle at this column. */
  const ridgeAt = (x: number): number => {
    let rise = 0;
    for (const peak of peaks) {
      const d = wrappedDistance(x, peak.cx, width);
      const influence = peak.height * (1 - d / peak.halfWidth);
      if (influence > rise) rise = influence;
    }
    return footY - Math.round(rise / RIDGE_STEP) * RIDGE_STEP;
  };

  ctx.beginPath();
  ctx.moveTo(0, ridgeAt(0));
  for (let x = 1; x <= width; x++) ctx.lineTo(x, ridgeAt(x));
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();

  ctx.fillStyle = layer.base;
  ctx.fill();

  // Caps are clipped to the silhouette so they cannot spill past the ridge.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = layer.light;
  for (const peak of peaks) {
    if (peak.height < layer.foot * 0.55) continue;

    const apexY = footY - peak.height;
    const capBottom = apexY + peak.height * 0.28;
    const spread = peak.halfWidth * 0.3;

    // A stepped lower edge, so the cap does not read as a smooth triangle.
    ctx.beginPath();
    ctx.moveTo(peak.cx, apexY);
    ctx.lineTo(peak.cx + spread, capBottom);
    ctx.lineTo(peak.cx + spread * 0.45, capBottom - RIDGE_STEP * 2);
    ctx.lineTo(peak.cx, capBottom);
    ctx.lineTo(peak.cx - spread * 0.5, capBottom - RIDGE_STEP * 3);
    ctx.lineTo(peak.cx - spread, capBottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  return canvas;
};

/**
 * One cloud, built from overlapping puffs snapped to a 2px grid.
 *
 * The underside is shaded with `source-atop`, which paints only where the
 * cloud already is — cheaper and cleaner than clipping to its outline.
 */
const buildCloud = (variant: number): HTMLCanvasElement => {
  const random = createSeededRandom(577 + variant * 331);
  const width = 130;
  const height = 60;
  const { canvas, ctx } = createLayer(width, height);

  const snap = (v: number) => Math.round(v / 2) * 2;
  const puffs = 4 + Math.floor(random() * 3);

  ctx.fillStyle = CLOUD.body;
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    const cx = snap(18 + t * (width - 36));
    // The middle of the cloud sits highest, tapering to the ends.
    const lift = Math.sin(t * Math.PI);
    const r = snap(10 + lift * 12 + random() * 5);
    const cy = snap(height - 16 - lift * 8);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A flat base, so the cloud sits on a line rather than floating as blobs.
  ctx.fillRect(16, snap(height - 22), width - 32, 14);

  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = CLOUD.shade;
  ctx.fillRect(0, height - 16, width, 16);
  ctx.fillStyle = CLOUD.rim;
  ctx.fillRect(0, height - 8, width, 8);
  ctx.globalCompositeOperation = "source-over";

  return canvas;
};

/**
 * Sky, sun, mountains and clouds.
 *
 * Every layer is rendered once into an offscreen strip and then blitted with a
 * parallax offset. The previous version recomputed the ridge line per pixel on
 * every frame; this draws the same picture with a handful of blits.
 */
export class BackgroundRenderer {
  private width = 0;
  private height = 0;
  private mountains: HTMLCanvasElement[] = [];
  private clouds: HTMLCanvasElement[] = [];

  private rebuild(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.mountains = MOUNTAIN.map((_, index) =>
      buildMountainLayer(width, height, index),
    );
    if (this.clouds.length === 0) {
      this.clouds = Array.from({ length: CLOUD_VARIANTS }, (_, i) => buildCloud(i));
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    camera: Camera,
    now: number,
  ): void {
    if (width !== this.width || height !== this.height) this.rebuild(width, height);

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
    this.mountains.forEach((strip, index) => {
      const shift = (camera.x * MOUNTAIN[index].parallax) % width;
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
      const sprite = this.clouds[i % this.clouds.length];
      const speed = 0.02 + (i % 3) * 0.01;
      const drift = now * 0.004 * (1 + (i % 4) * 0.25);

      // Positive modulo, so a cloud never jumps when the value crosses zero.
      const raw = i * 197 - camera.x * speed + drift;
      const x = ((raw % span) + span) % span - 200;
      const y = 26 + (i % 3) * 30;
      const scale = 0.7 + (i % 3) * 0.25;

      ctx.drawImage(
        sprite,
        Math.round(x),
        Math.round(y),
        Math.round(sprite.width * scale),
        Math.round(sprite.height * scale),
      );
    }
  }
}
