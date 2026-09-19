import { useRef } from "react";

import { DialogueBox } from "../components/game/DialogueBox";
import { GameStage } from "../components/game/GameStage";
import {
  AmmoBadge,
  BossHealthBar,
  CompletionBanner,
  CutProgress,
  EndScreen,
  HintBanner,
  StatsPanel,
} from "../components/game/HudOverlays";
import { BackButton } from "../components/ui/BackButton";
import { FadeOverlay } from "../components/ui/FadeOverlay";
import { VolumeSlider } from "../components/ui/VolumeSlider";
import {
  BOSS_LEVEL_INDEX,
  BOSS_STATS,
  SCALE,
  TOTAL_STARS,
  WEAPONS,
} from "../game/constants";
import { LEVEL_COUNT } from "../game/data/levels";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useGameEngine } from "../hooks/useGameEngine";
import { useStageScale } from "../hooks/useStageScale";
import { ROUTES } from "../app/routes";

import "../styles/pages/game.css";
import "../styles/components/sprites.css";
import "../styles/components/hud.css";
import "../styles/components/dialogue.css";
import "../styles/components/overlays.css";
import "../styles/components/volume.css";

/**
 * Padding the frame adds on each axis, matching `game.css`:
 * (--inset-left + --inset-right) - 2 × --frame-overlap, and the same vertically.
 */
const FRAME_WIDTH = 47 + 39 - 2 * 8;
const FRAME_HEIGHT = 39 + 38 - 2 * 8;

/**
 * Space kept clear for the volume control, including the layout gap.
 *
 * It shares the centred layout with the stage, so the stage has to leave room
 * for it: a column of width beside it on a desktop, a strip of height beneath
 * it on mobile.
 */
const VOLUME_BESIDE = 84;
const VOLUME_BELOW = 80;

/*
 * The strip held clear for the back button is not listed here: it changes with
 * the button's size, so `useStageScale` reads `--toolbar-strip` from the
 * stylesheet that also applies it as page padding.
 */

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

  const stageWidth = game.canvasSize.w * SCALE + FRAME_WIDTH;
  const stageHeight = game.canvasSize.h * SCALE + FRAME_HEIGHT;
  const stageScale = useStageScale(stageWidth, stageHeight, {
    beside: VOLUME_BESIDE,
    below: VOLUME_BELOW,
  });

  // Every in-game hint is gated on the HUD being visible.
  const hudVisible = game.showHud;

  const weaponLabel = !game.hasWeapon
    ? "None"
    : game.weaponType
      ? WEAPONS[game.weaponType].hudLabel
      : "Yes (F to attack)";

  return (
    <div className="screen game-page">
      <FadeOverlay
        visible={game.blackOverlay}
        opacity={game.blackOverlayOpacity}
      />
      {game.showEndScreen && <EndScreen onBack={goHome} />}

      <BackButton href={ROUTES.home} />

      {/*
        The stage and the volume control share one centred row, so the pair is
        centred as a group and the control stays beside the frame instead of
        being pinned to the window edge.

        The box around the stage reserves its *scaled* size, which is what
        keeps the page from overflowing; a transform alone would leave the
        original size behind in the layout.
      */}
      <div className="game-page__layout">
        <div
          className="game-page__frame-wrap"
          style={{
            width: stageWidth * stageScale,
            height: stageHeight * stageScale,
          }}
        >
          <div
            className="game-page__stage"
            style={{
              width: stageWidth,
              height: stageHeight,
              transform: `scale(${stageScale})`,
            }}
          >
            <GameStage
              canvasRef={canvasRef}
              playerSpriteRef={playerSpriteRef}
              weaponSpriteRef={weaponSpriteRef}
              playerOverlayRef={playerOverlayRef}
              size={game.canvasSize}
            >
              {hudVisible && (
                <StatsPanel
                  levelIndex={game.levelIndex}
                  levelCount={LEVEL_COUNT}
                  health={game.health}
                  stars={game.stars}
                  totalStars={TOTAL_STARS}
                  weapon={weaponLabel}
                />
              )}

              {hudVisible && game.bossHealth !== null && (
                <BossHealthBar
                  health={game.bossHealth}
                  max={BOSS_STATS.maxHealth}
                />
              )}

              {hudVisible && game.hasWeapon && game.weaponType && (
                <AmmoBadge ammo={game.ammo} />
              )}

              {game.cutProgress && (
                <CutProgress
                  x={game.cutProgress.x}
                  y={game.cutProgress.y}
                  progress={game.cutProgress.progress}
                />
              )}

              {hudVisible &&
                game.showAimHint &&
                game.levelIndex === BOSS_LEVEL_INDEX && (
                  <HintBanner slot="aim">
                    Left-click and aim at the boss to kill it
                  </HintBanner>
                )}

              {hudVisible && game.showReloadHint && (
                <HintBanner slot="action">
                  Press R to reload the sheriff
                </HintBanner>
              )}

              {hudVisible && game.showUpgradeHint && (
                <HintBanner slot="action">
                  Press F to upgrade the sheriff
                </HintBanner>
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

        <VolumeSlider
          volume={game.volume.volume}
          onChange={game.volume.setVolume}
          onToggleMute={game.volume.toggleMute}
        />
      </div>
    </div>
  );
};

export default GamePage;
