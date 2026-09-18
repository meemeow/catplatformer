import type { Camera, Tracer } from "../types";

/** Per-weapon look of the bullet streak. Both share a yellow hue. */
const TRACER_STYLE = {
  sheriff: { lineWidth: 3.6, glowBlur: 12, glowAlpha: 1.0, headRadius: 1.2 },
  sniper: { lineWidth: 2.8, glowBlur: 6, glowAlpha: 0.7, headRadius: 1.8 },
} as const;

/**
 * Draws each bullet as a streak fading from tail to head, plus a bright dot at
 * the leading edge. The streak direction comes from the tracer's velocity.
 */
export const drawTracers = (
  ctx: CanvasRenderingContext2D,
  tracers: Tracer[],
  camera: Camera,
): void => {
  for (const tracer of tracers) {
    const headX = tracer.x - camera.x;
    const headY = tracer.y - camera.y;

    const speed = Math.hypot(tracer.vx, tracer.vy) || 1;
    const tailX = Math.round(headX - (tracer.vx / speed) * tracer.trail);
    const tailY = Math.round(headY - (tracer.vy / speed) * tracer.trail);
    const x = Math.round(headX);
    const y = Math.round(headY);

    const alpha = Math.max(0.15, 1 - tracer.age / tracer.life);
    const style = TRACER_STYLE[tracer.type];

    ctx.save();
    ctx.lineCap = "round";

    const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
    gradient.addColorStop(0, "rgba(255,250,160,0)");
    gradient.addColorStop(0.4, `rgba(255,220,80,${0.9 * alpha})`);
    gradient.addColorStop(1, `rgba(255,255,140,${alpha})`);

    ctx.lineWidth = style.lineWidth;
    ctx.shadowColor = `rgba(255,${tracer.type === "sniper" ? 230 : 245},${
      tracer.type === "sniper" ? 140 : 160
    },${style.glowAlpha * alpha})`;
    ctx.shadowBlur = style.glowBlur;
    ctx.strokeStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle =
      tracer.type === "sniper"
        ? `rgba(220,255,255,${alpha})`
        : `rgba(255,255,140,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, style.headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};
