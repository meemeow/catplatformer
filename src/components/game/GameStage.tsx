import type { ReactNode, RefObject } from "react";
import { GIFS, IMAGES } from "../../game/assets";
import { SCALE } from "../../game/constants";

interface GameStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  playerSpriteRef: RefObject<HTMLImageElement | null>;
  weaponSpriteRef: RefObject<HTMLImageElement | null>;
  playerOverlayRef: RefObject<HTMLCanvasElement | null>;
  /** Canvas size in world pixels; CSS scales it up by `SCALE`. */
  size: { w: number; h: number };
  /** Overlays that must sit inside the frame, above the canvas. */
  children?: ReactNode;
}

/**
 * The framed play area.
 *
 * The frame is also the positioning context for every DOM sprite: the engine
 * appends enemies, the boss and speech bubbles to this element and places them
 * in its coordinate space.
 */
export const GameStage = ({
  canvasRef,
  playerSpriteRef,
  weaponSpriteRef,
  playerOverlayRef,
  size,
  children,
}: GameStageProps) => (
  <div className="game-page__frame">
    {/* Clips the sprite layer, and is what the frame art overlays. */}
    <div className="game-page__viewport">
      <canvas
        ref={canvasRef}
        className="game-page__canvas"
        style={{ width: size.w * SCALE, height: size.h * SCALE }}
      />

      {/* Positioned every frame by the render loop. */}
      <img
        ref={playerSpriteRef}
        src={GIFS.bananaCat}
        alt="Player"
        draggable={false}
        className="player-sprite"
      />
      <img
        ref={weaponSpriteRef}
        src={IMAGES.sheriff}
        alt=""
        aria-hidden
        draggable={false}
        className="player-weapon"
      />
      {/* Shows a frozen GIF frame while the player stands still. */}
      <canvas ref={playerOverlayRef} className="player-overlay" />

      {children}
    </div>
  </div>
);
