import { GIFS, IMAGES } from "../assets";
import type { DialogueLine } from "../types";

/** Speaker names, referenced by the audio cues and the hostage-progress checks. */
export const SPEAKERS = {
  narrator: "Narrator",
  bananaCat: "Banana Cat",
  boss: "Boss",
  hostage: "Hostage",
} as const;

/** The intro cutscene, played once before level 1. */
export const INTRO_DIALOG_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.narrator, text: "It was a beautiful morning and Banana Cat took an early walk.", img: GIFS.yapapa },
  { speaker: SPEAKERS.narrator, text: "Then suddenly... Banana Cat stumbled upon a massive cave.", img: GIFS.yapapa },
  { speaker: SPEAKERS.bananaCat, text: "Woah!", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "This is the first time I see a cave this huge! What could possibly go wrong if I take a peek inside :DD", img: GIFS.bananaCat },
  { speaker: SPEAKERS.narrator, text: "Banana cat fell into the cave accidentally.", img: GIFS.yapapa },
  { speaker: SPEAKERS.bananaCat, text: "...", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "What happened?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "Where am I?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "Oh well, I'm gonna look for my way out.", img: GIFS.bananaCat },
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

/** The boss-level opening cutscene. */
export const BOSS_DIALOG_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.bananaCat, text: "Where am I?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "Finally, another food came.", img: GIFS.bossMain },
  { speaker: SPEAKERS.hostage, text: "Is someone there? Help me please! I will be its dinner later.", img: GIFS.catCry },
  { speaker: SPEAKERS.boss, text: "Shut up, anyways...", img: GIFS.bossAngry },
  { speaker: SPEAKERS.bananaCat, text: "I recognize this voice... Are you by any chance the purr I've been trying to find?", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "...", img: GIFS.bossMain },
  { speaker: SPEAKERS.hostage, text: "???", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "...", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "No response? welp might as well leave xD", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "WAIT… aren't you supposed to untie me first?!", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "Oh yeah...", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "Make sure to treat me well later!", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "Okayyy, fine...", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "You sit back and watch :DD", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "Like if you can >:))", img: GIFS.bossExplaining },
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

/** The two hostage lines that, once both seen, unlock the reward. */
export const HOSTAGE_UNLOCK_LINES = {
  outOfBullets: "There's no other way, come here!! Quick!! I'll give something to you!!",
  bossMovingAgain: "The boss started moving again. Come here!! Quick!! I'll give something to you!!",
} as const;

/** Played when the sniper runs dry. */
export const SNIPER_EMPTY_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.bananaCat, text: "Oh no!!", img: GIFS.bananaCat },
  { speaker: SPEAKERS.bananaCat, text: "I'm out of bullets!", img: GIFS.bananaCat },
  { speaker: SPEAKERS.boss, text: "You cannot kill me >:D", img: GIFS.bossMain },
  { speaker: SPEAKERS.hostage, text: HOSTAGE_UNLOCK_LINES.outOfBullets, img: GIFS.catCry },
];

/** Played when the sheriff runs dry; the star count is filled in at runtime. */
export const sheriffEmptyLines = (starCount: number): DialogueLine[] => [
  { speaker: SPEAKERS.hostage, text: "Nice, the boss is starting to get weak.", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: "What now? I dont have bullets anymore!", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "Hmm, have you collected any stars in your adventure?", img: GIFS.catCry },
  { speaker: SPEAKERS.bananaCat, text: `I collected ${starCount} amount of stars!`, img: GIFS.bananaCat },
];

/** Follow-up when the player lacks the stars needed to upgrade. */
export const BOSS_RESUMES_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: HOSTAGE_UNLOCK_LINES.bossMovingAgain, img: GIFS.catCry },
];

/** Played immediately after the sniper upgrade. */
export const UPGRADE_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.bananaCat, text: "Woah!", img: GIFS.bananaCat },
  { speaker: SPEAKERS.hostage, text: "Damn, that will surely take down the boss!", img: GIFS.catCry },
];

/** The nudge that follows the upgrade dialogue and unfreezes the boss. */
export const UPGRADE_FOLLOWUP_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: "Its starting to move again!! Quick take it down!", img: GIFS.catCry },
];

/** Shown when the hostage hands over the bridge cutter. */
export const CUTTER_HANDOVER_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: "Cut the bridge when the boss crosses it, make sure to time it correctly!!", img: GIFS.catCry },
];

/** The closing exchange once the boss falls. */
export const BOSS_DEFEATED_LINES: DialogueLine[] = [
  { speaker: SPEAKERS.hostage, text: "Did you get him?", img: IMAGES.bananaCatHeart },
  { speaker: SPEAKERS.boss, text: "...", img: GIFS.bossMain },
  { speaker: SPEAKERS.bananaCat, text: "Yes, I did!!", img: GIFS.bananaCat },
];

/** Text shown in the floating speech bubbles drawn over the map. */
export const BUBBLE_TEXT = {
  collectStars: "Collect stars (it might be useful later)",
  pickSheriff: "Pick this sheriff",
} as const;
