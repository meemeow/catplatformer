interface MenuTileProps {
  href: string;
  label: string;
  /** Animated illustration for the tile. */
  artSrc: string;
  /** Modifier suffix picking the art's size, e.g. "book" or "game". */
  artVariant: string;
  /** Pixel-art wordmark shown beneath the illustration. */
  labelSrc: string;
}

/** One entry on the main menu: an illustration above a wordmark. */
export const MenuTile = ({
  href,
  label,
  artSrc,
  artVariant,
  labelSrc,
}: MenuTileProps) => (
  <a href={href} role="button" aria-label={label} className="menu-tile">
    <div className="menu-tile__content">
      <img
        src={artSrc}
        alt=""
        aria-hidden
        draggable={false}
        className={`menu-tile__art menu-tile__art--${artVariant} pixel`}
      />
      <img
        src={labelSrc}
        alt={label}
        draggable={false}
        className="menu-tile__label pixel"
      />
    </div>
  </a>
);
