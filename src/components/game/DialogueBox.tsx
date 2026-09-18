import type { DialogueLine } from "../../game/types";

interface DialogueBoxProps {
  line: DialogueLine | undefined;
  /** The characters typed so far; the rest appear over time. */
  displayed: string;
  onAdvance: () => void;
}

/**
 * The cutscene dialogue panel. Clicking anywhere on it finishes the current
 * line, or moves to the next one if the line is already complete.
 */
export const DialogueBox = ({ line, displayed, onAdvance }: DialogueBoxProps) => (
  <div
    role="button"
    tabIndex={0}
    aria-label="Advance dialogue"
    className="dialogue-box"
    onClick={onAdvance}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onAdvance();
    }}
  >
    <div className="dialogue-box__panel">
      <div className="dialogue-box__portrait">
        <img src={line?.img} alt={line?.speaker ?? ""} draggable={false} />
      </div>
      <div className="dialogue-box__body">
        <div className="dialogue-box__speaker">{line?.speaker}</div>
        <div className="dialogue-box__text">{displayed}</div>
        <div className="dialogue-box__hint">Click to progress</div>
      </div>
    </div>
  </div>
);
