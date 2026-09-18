import { useRef } from "react";

import { DialogueBox } from "../components/game/DialogueBox";
import { GameStage } from "../components/game/GameStage";
import {
  AmmoBadge,
  CompletionBanner,
  EndScreen,
  HintBanner,
} from "../components/game/HudOverlays";
import { BackButton } from "../components/ui/BackButton";
import { FadeOverlay } from "../components/ui/FadeOverlay";
import { VolumeSlider } from "../components/ui/VolumeSlider";
import { BOSS_LEVEL_INDEX, SCALE } from "../game/constants";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useGameEngine } from "../hooks/useGameEngine";
import { ROUTES } from "../app/routes";

import "../styles/pages/game.css";
import "../styles/components/sprites.css";
import "../styles/components/hud.css";
import "../styles/components/dialogue.css";
import "../styles/components/overlays.css";
import "../styles/components/volume.css";

/** Minimum width of the play area, so short levels are not cramped. */
const MIN_STAGE_WIDTH = 720;
/**
 * Left + right padding the frame adds, matching `game.css`:
 * (--inset-left + --inset-right) - 2 × --frame-overlap.
 */
const FRAME_WIDTH = 47 + 39 - 2 * 8;

const GamePage = () => {
  useDocumentTitle("Cattachasm");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerSpriteRef = useRef<HTMLImageElement | null>(null);
  const weaponSpriteRef = useRef<HTMLImageElement | null>(null);
  const playerOverlayRef = useRef<HTMLCanvasElement | null>(null);

  const game = useGameEngine({
    canvas: canvasRef,
    playerSprite: playerSpriteRef,
    weaponSprite: weaponSpriteRef,
    playerOverlay: playerOverlayRef,
  });

  const goHome = () => {
    window.location.href = ROUTES.home;
  };

  const stageWidth = Math.max(
    game.canvasSize.w * SCALE + FRAME_WIDTH,
    MIN_STAGE_WIDTH,
  );

  // Every in-game hint is gated on the HUD being visible.
  const hudVisible = game.showHud;

  return (
    <div className="screen game-page">
      <FadeOverlay
        visible={game.blackOverlay}
        opacity={game.blackOverlayOpacity}
      />
      {game.showEndScreen && <EndScreen onBack={goHome} />}

      <BackButton href={ROUTES.home} />

      <VolumeSlider
        volume={game.volume.volume}
        onChange={game.volume.setVolume}
        onToggleMute={game.volume.toggleMute}
      />

      <div className="game-page__layout" style={{ maxWidth: stageWidth }}>
        <div className="game-page__frame-wrap">
          <GameStage
            canvasRef={canvasRef}
            playerSpriteRef={playerSpriteRef}
            weaponSpriteRef={weaponSpriteRef}
            playerOverlayRef={playerOverlayRef}
            size={game.canvasSize}
          >
            {hudVisible && game.hasWeapon && game.weaponType && (
              <AmmoBadge ammo={game.ammo} />
            )}

            {hudVisible &&
              game.showAimHint &&
              game.levelIndex === BOSS_LEVEL_INDEX && (
                <HintBanner slot="aim">
                  Left-click and aim at the boss to kill it
                </HintBanner>
              )}

            {hudVisible && game.showReloadHint && (
              <HintBanner slot="action">Press R to reload the sheriff</HintBanner>
            )}

            {hudVisible && game.showUpgradeHint && (
              <HintBanner slot="action">Press F to upgrade the sheriff</HintBanner>
            )}

            {hudVisible && game.showHostagePrompt && (
              <HintBanner slot="prompt">Press F to accept</HintBanner>
            )}

            {game.completionMessage && (
              <CompletionBanner message={game.completionMessage} />
            )}

            {game.dialogue.visible && (
              <DialogueBox
                line={game.dialogue.currentLine}
                displayed={game.dialogue.displayed}
                onAdvance={game.dialogue.advance}
              />
            )}
          </GameStage>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
