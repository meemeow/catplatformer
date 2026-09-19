/**
 * Every static asset path in one place, so no component ever hardcodes a URL.
 * Files live under `public/`, so these are absolute web paths.
 */

export const IMAGES = {
  back: "/images/back.png",
  bananaCatHeart: "/images/bananacatheart.png",
  /** The play-area frame. Referenced by URL from `styles/pages/game.css`. */
  frame: "/images/cattachasm_border.png",
  catDead: "/images/catded.png",
  cutter: "/images/cutter.png",
  play: "/images/play.png",
  sheriff: "/images/sheriff.webp",
  sniper: "/images/sniper.png",
  star: "/images/star.png",
  start: "/images/start.png",
} as const;

export const GIFS = {
  bananaCat: "/others/bananacat.gif",
  background: "/others/bg.gif",
  bossAngry: "/others/catbossangry.gif",
  bossExplaining: "/others/catbossexplaining.gif",
  bossMain: "/others/catbossmain.gif",
  catCry: "/others/catcry.gif",
  catShock: "/others/catshock.gif",
  game: "/others/game.gif",
  happyCat: "/others/happycat.gif",
  laughingCat: "/others/laughingcat.gif",
  yapapa: "/others/yapapa.gif",
} as const;

export const SOUNDS = {
  bonk: "/sounds/bonk.mp3",
  bossMusic: "/sounds/bossmusic.mp3",
  catDead: "/sounds/catded.mp3",
  catLaughing: "/sounds/catlaughing.mp3",
  chineseCat: "/sounds/chinesecat.mp3",
  collect: "/sounds/collect.mp3",
  cry: "/sounds/cry.mp3",
  death: "/sounds/death.mp3",
  dialogue: "/sounds/dialogue.mp3",
  footsteps: "/sounds/footsteps.mp3",
  germanCat: "/sounds/germancat.mp3",
  happy: "/sounds/happy.mp3",
  jump: "/sounds/jump.mp3",
  levelFinish: "/sounds/levelfinish.mp3",
  levelMusic: "/sounds/levelmusic.mp3",
  roll: "/sounds/roll.mp3",
  sheriffReload: "/sounds/sheriffreload.mp3",
  sheriffShot: "/sounds/sheriffsound.mp3",
  sniperShot: "/sounds/snipersound.mp3",
  yapapa: "/sounds/yapapa.mp3",
} as const;

/**
 * Terrain and sky art, diced out of `background_assets.jpg` with its white
 * matte cut to transparency. Drawn to the canvas, never referenced from CSS.
 */
export const TERRAIN = {
  clouds: [
    "/images/terrain/cloud-1.png",
    "/images/terrain/cloud-2.png",
    "/images/terrain/cloud-3.png",
    "/images/terrain/cloud-4.png",
  ],
  /** A lone summit, used sparsely on the farthest parallax layer. */
  peak: "/images/terrain/peak.png",
  /** A full ridge line, repeated to build the two nearer layers. */
  range: "/images/terrain/range.png",
  /** A decorative boulder, drawn as a cut-out prop rather than a full cell. */
  rock: "/images/terrain/rock.png",
  brick: "/images/terrain/brick.png",
  dirt: [
    "/images/terrain/dirt-1.png",
    "/images/terrain/dirt-2.png",
    "/images/terrain/dirt-3.png",
  ],
  grass: ["/images/terrain/grass-1.png", "/images/terrain/grass-2.png"],
} as const;
