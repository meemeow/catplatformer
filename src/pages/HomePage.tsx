import { GIFS, IMAGES } from "../game/assets";
import { BackButton } from "../components/ui/BackButton";
import { MenuTile } from "../components/ui/MenuTile";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ROUTES } from "../app/routes";

import "../styles/pages/home.css";

/**
 * The title screen.
 *
 * `started` reproduces the original flag: the menu was only ever meant to show
 * on `/cattachasm`, but that path renders the game itself, so in practice
 * this page always shows the start button. The menu branch is kept intact rather than
 * deleted, since wiring it up is a routing decision, not a refactor.
 */
const HomePage = () => {
  const started = window.location.pathname === ROUTES.game;
  useDocumentTitle(started ? "SURPRISE" : "PRESS START");

  const start = () => {
    window.location.href = ROUTES.game;
  };

  if (!started) {
    return (
      <div className="screen screen--column">
        <button
          type="button"
          className="start-button"
          aria-label="Press Start"
          onClick={start}
        >
          <img
            src={IMAGES.start}
            alt="Start"
            width={320}
            draggable={false}
            className="start-button__image pixel"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="screen screen--column">
      <BackButton href={ROUTES.home} />
      <nav className="main-menu" aria-label="Main menu">
        <MenuTile
          href={ROUTES.game}
          label="Play"
          artSrc={GIFS.game}
          artVariant="game"
          labelSrc={IMAGES.play}
        />
      </nav>
    </div>
  );
};

export default HomePage;
