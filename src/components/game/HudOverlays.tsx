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
