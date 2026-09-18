import { IMAGES } from "../../game/assets";

interface BackButtonProps {
  /** Where the chevron navigates to. */
  href: string;
  label?: string;
}

/**
 * The pixel-art back chevron used on every screen.
 *
 * It is an image rather than a link so it can sit over the canvas, so the
 * keyboard and ARIA roles are supplied by hand.
 */
export const BackButton = ({ href, label = "Back" }: BackButtonProps) => {
  const navigate = () => {
    window.location.href = href;
  };

  return (
    <img
      src={IMAGES.back}
      alt={label}
      role="button"
      aria-label={label}
      tabIndex={0}
      draggable={false}
      className="back-button pixel"
      onClick={navigate}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        navigate();
      }}
    />
  );
};
