import { GIFS, IMAGES } from "../assets";
import type { DialogueLine } from "../types";

/** Speaker names, referenced by the audio cues and the hostage-progress checks. */
export const SPEAKERS = {
  narrator: "Narrator",
  bananaCat: "Banana Cat",
  boss: "Boss",
  hostage: "Hostage",
} as const;

/**
 * The intro cutscene, played once before level 1.
 *
 * The line count and the speaker of each line are load-bearing:
 * `INTRO_DIALOG_SLICES` plays these by index, so a line added or moved changes
 * which beat of the scripted walk it lands on.
 */
export const INTRO_DIALOG_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.narrator, text: "It was a quiet morning, and Banana Cat set out for an early walk.", img: GIFS.yapapa },
  { speaker: SPEAKERS.narrator, text: "Then the path turned, and there it was: a cave, far bigger than anything nearby.", img: GIFS.yapapa },
  { speaker: SPEAKERS.bananaCat, text: "Woah.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "I've never seen one this big. A quick look inside can't hurt.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.narrator, text: "Banana Cat did not mean to fall in.", img: GIFS.yapapa },
  { speaker: SPEAKERS.bananaCat, text: "...", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "What just happened?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "Where am I?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "Right. Time to find a way out.", img: GIFS.bananaCat },
];

/** Which slices of the intro play at each beat of the scripted walk. */
export const INTRO_DIALOG_SLICES = {
  /** Shown once the cat reaches the spawn tile. */
  firstBeat: [0, 1],
  /** Shown after walking six tiles left. */
  secondBeat: [1, 4],
  /** The narrator line covering the tumble into the cave. */
  fallBeat: [4, 5],
  /** Everything after landing, played over level 1. */
  arrivalBeat: [5, INTRO_DIALOG_LINES.length],
} as const;

/**
 * The boss-level opening cutscene.
 *
 * As with the intro, the indices matter: `BOSS_DIALOG_CUES` fires the scripted
 * walk and turn off specific lines, so those two have to keep saying what
 * makes the cat move.
 */
export const BOSS_DIALOG_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.bananaCat, text: "Where am I?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "Another one wanders in. Good.", img: GIFS.bossMain },
  { speaker: SPEAKERS.hostage, text: "Is somebody there? Please. I'm supposed to be its dinner.", img: GIFS.catCry },
  { speaker: SPEAKERS.boss, text: "Quiet. Anyway.", img: GIFS.bossAngry },
  { speaker: SPEAKERS.bananaCat, text: "I know that voice. Are you the one I've been looking for?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "...", img: GIFS.bossMain },
  { speaker: SPEAKERS.hostage, text: "???", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "...", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "No answer. I'll see myself out, then.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "Wait! You're not going to untie me first?", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "Right. Forgot.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "You owe me for this.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "Fine. Deal.", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "Sit tight.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "Try it.", img: GIFS.bossExplaining },
];

/**
 * Line indices in `BOSS_DIALOG_LINES` that trigger scripted camera/player work
 * rather than simply advancing to the next line.
 */
export const BOSS_DIALOG_CUES = {
  /** After this line the cat walks two tiles left before the next line. */
  walkLeftAfter: 8,
  /** After this line the cat turns to face right. */
  faceRightAfter: 9,
} as const;

/**
 * The two hostage lines that, once both seen, unlock the reward.
 *
 * Matched by their exact text where the dialogue is watched, so they must stay
 * distinct from each other and be referenced through these constants rather
 * than retyped.
 */
export const HOSTAGE_UNLOCK_LINES = {
  outOfBullets: "There's another way. Get over here, I have something for you.",
  bossMovingAgain: "It's moving again. Get over here, I have something for you.",
} as const;

/** Played when the sniper runs dry. */
export const SNIPER_EMPTY_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.bananaCat, text: "That was the last round.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "I'm out.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "You can't finish me like that.", img: GIFS.bossMain },
  { speaker: SPEAKERS.hostage, text: HOSTAGE_UNLOCK_LINES.outOfBullets, img: GIFS.catCry },
];

/** Played when the sheriff runs dry; the star count is filled in at runtime. */
export const sheriffEmptyLines = (starCount: number): DialogueLine[] => [
  { speaker: SPEAKERS.hostage, text: "Good. It's starting to slow down.", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "Now what? I'm out of ammo again.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "Did you pick up any stars on the way here?", img: GIFS.catCry },
  // Counted rather than described, so one star does not read as "1 stars".
  { speaker: SPEAKERS.bananaCat, text: `I found ${starCount}.`, img: GIFS.bananaCat },
];

/** Follow-up when the player lacks the stars needed to upgrade. */
export const BOSS_RESUMES_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: HOSTAGE_UNLOCK_LINES.bossMovingAgain, img: GIFS.catCry },
];

/** Played immediately after the sniper upgrade. */
export const UPGRADE_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.bananaCat, text: "Whoa.", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "That should be enough to put it down.", img: GIFS.catCry },
];

/** The nudge that follows the upgrade dialogue and unfreezes the boss. */
export const UPGRADE_FOLLOWUP_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: "It's moving again. Take it down.", img: GIFS.catCry },
];

/** Shown when the hostage hands over the bridge cutter. */
export const CUTTER_HANDOVER_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: "Cut the bridge while it's crossing. Time it well.", img: GIFS.catCry },
];

/** The closing exchange once the boss falls. */
export const BOSS_DEFEATED_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: "Is it over?", img: IMAGES.bananaCatHeart },
  { speaker: SPEAKERS.boss, text: "...", img: GIFS.bossMain },
  { speaker: SPEAKERS.bananaCat, text: "Yeah. It's done.", img: GIFS.bananaCat },
];

/** Text shown in the floating speech bubbles drawn over the map. */
export const BUBBLE_TEXT = {
  collectStars: "Collect stars, they matter later",
  pickSheriff: "Take the sheriff",
} as const;
