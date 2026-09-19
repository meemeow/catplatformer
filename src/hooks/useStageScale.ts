import { useEffect, useState } from "react";

/** Breathing room kept between the stage and the window edge, in CSS pixels. */
const MARGIN = 16;

/** Never shrink past this, however small the window gets. */
const MIN_SCALE = 0.15;

/**
 * Below this width the volume control sits under the stage rather than beside
 * it, so the space it needs comes out of the height instead of the width.
 *
 * Must stay in step with the matching breakpoints in `game.css` and
 * `volume.css`, which do the actual stacking.
 */
export const STACK_QUERY = "(max-width: 760px)";

interface Reserved {
  /** Width taken by the volume control when it stands beside the stage. */
  beside?: number;
  /** Height taken by the volume control when it lies beneath the stage. */
  below?: number;
}

/**
 * Height the page holds clear at the top for the back button, read straight
 * off the stylesheet.
 *
 * The button resizes at its own breakpoints, so this has to move with it.
 * Reading the variable rather than repeating the number here means there is
 * one definition to change, in `game.css`, instead of two that must agree.
 */
const toolbarStrip = (): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--toolbar-strip",
  );
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * The factor that fits a fixed-size stage inside the window.
 *
 * The play area cannot reflow: the canvas and every DOM sprite over it are
 * positioned in one shared pixel grid, so making the canvas smaller on its own
 * would leave the sprites behind. Scaling the whole stage as a unit keeps them
 * aligned at any window size.
 *
 * Capped at 1 because the art is pixel art — drawn past its native size it only
 * gets softer, never sharper.
 */
export const useStageScale = (
  stageWidth: number,
  stageHeight: number,
  reserved: Reserved = {},
): number => {
  const [scale, setScale] = useState(1);
  const { beside = 0, below = 0 } = reserved;

  useEffect(() => {
    if (stageWidth <= 0 || stageHeight <= 0) return;

    const fit = () => {
      const stacked = window.matchMedia(STACK_QUERY).matches;
      const width = window.innerWidth - MARGIN * 2 - (stacked ? 0 : beside);
      const height =
        window.innerHeight -
        MARGIN * 2 -
        toolbarStrip() -
        (stacked ? below : 0);
      setScale(
        Math.max(
          MIN_SCALE,
          Math.min(1, width / stageWidth, height / stageHeight),
        ),
      );
    };

    fit();
    // A resize covers crossing the breakpoint as well, since it is width-based.
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [stageWidth, stageHeight, beside, below]);

  return scale;
};
