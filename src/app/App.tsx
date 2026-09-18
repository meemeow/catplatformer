import GamePage from "../pages/GamePage";
import HomePage from "../pages/HomePage";
import MessagePage from "../pages/MessagePage";
import { resolveRoute, type RouteName } from "./routes";

import "../styles/global.css";
import "../styles/animations.css";

const PAGES: Record<RouteName, () => React.ReactElement> = {
  home: HomePage,
  message: MessagePage,
  game: GamePage,
};

/**
 * Path-based router.
 *
 * Navigation is done with full page loads, so the route only needs to be read
 * once at mount; there is no history listener to keep in sync.
 */
export const App = () => {
  const Page = PAGES[resolveRoute(window.location.pathname)];
  return <Page />;
};
