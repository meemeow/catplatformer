/** Canonical paths. Anything that navigates should reference these. */
export const ROUTES = {
  home: "/",
  message: "/message",
  game: "/games",
} as const;

export type RouteName = keyof typeof ROUTES;

/**
 * Paths that resolve to each route, including the spellings the original
 * router accepted. `vercel.json` rewrites every path to `index.html`, so this
 * table is the only place a URL is matched.
 */
const ALIASES: Record<RouteName, readonly string[]> = {
  home: [ROUTES.home],
  message: [ROUTES.message, "/messages"],
  game: [ROUTES.game, "/game"],
};

/** Resolves a pathname to a route, falling back to the title screen. */
export const resolveRoute = (pathname: string): RouteName => {
  const path = pathname || ROUTES.home;
  for (const [name, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(path)) return name as RouteName;
  }
  return "home";
};
