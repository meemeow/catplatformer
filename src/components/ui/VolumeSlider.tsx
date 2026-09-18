interface VolumeSliderProps {
  /** Master level, 0..1. */
  volume: number;
  onChange: (volume: number) => void;
  onToggleMute: () => void;
}

/** Steps the slider moves in, as a percentage. */
const STEP = 5;

/** Three states of the speaker glyph, by how loud things are. */
const speakerIcon = (volume: number): string => {
  if (volume === 0) return "🔇";
  if (volume < 0.5) return "🔉";
  return "🔊";
};

/**
 * Vertical master-volume control, parked beside the play area.
 *
 * The track is a native range input turned on its side, so keyboard control,
 * focus and screen-reader support come for free. Clicking the speaker mutes
 * and restores the previous level.
 */
export const VolumeSlider = ({
  volume,
  onChange,
  onToggleMute,
}: VolumeSliderProps) => {
  const percent = Math.round(volume * 100);

  return (
    <div className="volume">
      <output className="volume__readout" aria-hidden>
        {percent}
      </output>

      <input
        type="range"
        className="volume__slider"
        min={0}
        max={100}
        step={STEP}
        value={percent}
        aria-label="Volume"
        aria-valuetext={`${percent}%`}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />

      <button
        type="button"
        className="volume__mute"
        aria-label={volume === 0 ? "Unmute" : "Mute"}
        onClick={onToggleMute}
      >
        {speakerIcon(volume)}
      </button>
    </div>
  );
};
