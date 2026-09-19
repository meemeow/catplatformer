import type { Ammo } from "../../game/types";

interface AmmoBadgeProps {
  ammo: Ammo;
}

/** Rounds in the magazine over rounds in reserve. */
export const AmmoBadge = ({ ammo }: AmmoBadgeProps) => (
  <div className="ammo-badge">
    Ammo: {ammo.mag}/{ammo.reserve}
  </div>
);

/** Vertical slot a hint occupies, so two hints never overlap. */
export type HintSlot = "aim" | "action" | "prompt";

interface HintBannerProps {
  slot: HintSlot;
  children: string;
}

/** A contextual instruction shown over the play area. */
export const HintBanner = ({ slot, children }: HintBannerProps) => (
  <div className={`hint-banner hint-banner--${slot}`}>{children}</div>
);

interface CompletionBannerProps {
  message: string;
}

/** Centred banner for level completion and failure. */
export const CompletionBanner = ({ message }: CompletionBannerProps) => (
  <div className="completion-banner">
    <div className="completion-banner__text">{message}</div>
  </div>
);

interface EndScreenProps {
  onBack: () => void;
}

/** The card shown once the final cutscene fades to black. */
export const EndScreen = ({ onBack }: EndScreenProps) => (
  <div className="end-screen">
    <div className="end-screen__content">
      <div className="end-screen__title">THE END</div>
      <button type="button" className="end-screen__button" onClick={onBack}>
        Back
      </button>
    </div>
  </div>
);

interface StatsPanelProps {
  levelIndex: number;
  levelCount: number;
  health: number;
  stars: number;
  totalStars: number;
  weapon: string;
}

/** One labelled figure on the stats board. */
const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="stats-panel__stat">
    <span className="stats-panel__label">{label}</span>
    <span className="stats-panel__value">{value}</span>
  </div>
);

/**
 * The player's standing, on a timber board in the corner of the play area.
 *
 * It was drawn on the canvas before, which meant it could not use the wooden
 * panelling the rest of the interface is built from, and its text was laid out
 * at hardcoded pixel offsets that the boss bar could knock out of step.
 */
export const StatsPanel = ({
  levelIndex,
  levelCount,
  health,
  stars,
  totalStars,
  weapon,
}: StatsPanelProps) => (
  <div className="stats-panel">
    {/*
      One grid, read in rows: the controls are the third column rather than a
      band underneath, which keeps the board two rows tall instead of three.
    */}
    <div className="stats-panel__grid">
      <Stat label="Level" value={`${levelIndex + 1} / ${levelCount}`} />
      <Stat label="Health" value={String(health)} />
      <div className="stats-panel__keys">
        <b>A</b>
        <b>D</b>
        <span>Move</span>
      </div>

      <Stat label="Weapon" value={weapon} />
      <Stat label="Stars" value={`${stars} / ${totalStars}`} />
      <div className="stats-panel__keys">
        <b>Space</b>
        <span>Jump</span>
      </div>
    </div>
  </div>
);

interface BossHealthBarProps {
  /** Remaining health. */
  health: number;
  max: number;
}

/**
 * The boss's remaining health, built like the volume post lying on its side:
 * timber, brass fittings, and a channel routed into it for the bar itself.
 */
export const BossHealthBar = ({ health, max }: BossHealthBarProps) => {
  const fraction = Math.max(0, Math.min(1, health / max));
  const percent = Math.round(fraction * 100);

  return (
    <div
      className="boss-bar"
      role="meter"
      aria-label="Boss health"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span className="boss-bar__name">Boss</span>

      <div className="boss-bar__track">
        <div
          className="boss-bar__fill"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      <output className="boss-bar__readout">{percent}%</output>
    </div>
  );
};
