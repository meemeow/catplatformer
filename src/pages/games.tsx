import { useRef, useEffect, useState } from "react";

export default function CatPlatformer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerSpriteRef = useRef<HTMLImageElement | null>(null);
  const weaponSpriteRef = useRef<HTMLImageElement | null>(null);
  const playerOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  // When true the death overlay animation is active; used to keep the
  // player invisible while `catded.png` animates.
  const deathActiveRef = useRef(false);
  const [hasWeapon, setHasWeapon] = useState(false);
  const [weaponType, setWeaponType] = useState<string | null>(null); // 'sheriff' | 'sniper' | null
  const weaponTypeRef = useRef<string | null>(weaponType);
  useEffect(() => { weaponTypeRef.current = weaponType; }, [weaponType]);
  // Ammo state: current magazine and reserve bullets
  const [ammo, setAmmo] = useState({ mag: 0, reserve: 0, magSize: 6 });
  const ammoRef = useRef(ammo);
  useEffect(() => { ammoRef.current = ammo; }, [ammo]);
  // Hints: aim/hit hint and reload hint
  const [showAimHint, setShowAimHint] = useState(false);
  const showAimHintRef = useRef(false);
  const aimShotsRef = useRef(0);
  const prevAmmoRef = useRef(ammo);
  const [showReloadHint, setShowReloadHint] = useState(false);
  // Keep a ref in sync so the long-running game loop can read whether
  // the player currently has a weapon without closing over a stale state
  const hasWeaponRef = useRef(hasWeapon);
  useEffect(() => { hasWeaponRef.current = hasWeapon; }, [hasWeapon]);
  const [_showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [bossHealth, setBossHealth] = useState(1500);
  const bossHealthRef = useRef(bossHealth);
  useEffect(() => { bossHealthRef.current = bossHealth; }, [bossHealth]);
  const [health, setHealth] = useState(100);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  // Cutscene / dialogue state for level 5 (index 4)
  const [cutsceneActive, setCutsceneActive] = useState(false);
  const cutsceneActiveRef = useRef(cutsceneActive);
  useEffect(() => { cutsceneActiveRef.current = cutsceneActive; }, [cutsceneActive]);
  // Track whether level-5 (index 4) boss cutscene/dialogue has fully finished.
  const level5CutsceneDoneRef = useRef<boolean>(false);
  // Whether the boss is allowed to start moving (only set true after dialog finishes)
  const bossCanMoveRef = useRef<boolean>(false);
  // When true, show a persistent speech bubble prompting to pick the sheriff pickup
  const showSheriffBubbleRef = useRef<boolean>(false);
  // When true, show a speech bubble pointing at the first star in level 1
  const showFirstStarBubbleRef = useRef<boolean>(false);
  // When true, freeze the player's DOM GIF animation during scripted cutscenes
  const freezePlayerAnimRef = useRef<boolean>(false);
  // Track which levels have already shown their cutscene (avoid replaying)
  const shownCutscenesRef = useRef<Record<number, boolean>>({});
  // Intro sequence state
  const [introActive, setIntroActive] = useState(true);
  const introActiveRef = useRef(introActive);
  useEffect(() => { introActiveRef.current = introActive; }, [introActive]);

  const [showHUD, setShowHUD] = useState(false);
  // ADD THIS: Create a ref to track HUD visibility inside the loop
  const showHUDRef = useRef(showHUD);
  useEffect(() => { showHUDRef.current = showHUD; }, [showHUD]); 

  const [blackOverlay, setBlackOverlay] = useState(true);
  const [blackOverlayOpacity, setBlackOverlayOpacity] = useState(1);
  const [showEndScreen, setShowEndScreen] = useState(false);
  
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogLineIndex, setDialogLineIndex] = useState(0);
  const [dialogCharIndex, setDialogCharIndex] = useState(0);
  const [dialogDisplayed, setDialogDisplayed] = useState("");
  const dialogVisibleRef = useRef(dialogVisible);
  useEffect(() => { dialogVisibleRef.current = dialogVisible; }, [dialogVisible]);
  // Track whether the specific hostage dialog lines have been shown
  const seenHostage1Ref = useRef(false);
  const seenHostage2Ref = useRef(false);
  // When true, reward can be interacted with
  const rewardUnlockedRef = useRef(false);
  // Dialogue lines for the boss cutscene
  const DIALOG_LINES = [
    { speaker: 'Banana Cat', text: 'Where am I?', img: '/others/bananacat.gif' },
    { speaker: 'Boss', text: 'Finally, another food came.', img: '/others/catbossmain.gif' },
    { speaker: 'Hostage', text: 'Is someone there? Help me please! I will be its dinner later.', img: '/others/catcry.gif' },
    { speaker: 'Boss', text: 'Shut up, anyways...', img: '/others/catbossangry.gif' },
    { speaker: 'Banana Cat', text: "I recognize this voice... Are you by any chance the purr I've been trying to find?", img: '/others/bananacat.gif' },
    { speaker: 'Boss', text: '...', img: '/others/catbossmain.gif' },
    { speaker: 'Hostage', text: '???', img: '/others/catcry.gif' },
    { speaker: 'Banana Cat', text: '...', img: '/others/bananacat.gif' },
    { speaker: 'Banana Cat', text: "No response? welp might as well leave xD", img: '/others/bananacat.gif' },
    { speaker: 'Hostage', text: "WAIT… aren't you supposed to untie me first?!", img: '/others/catcry.gif' },
    { speaker: 'Banana Cat', text: 'Oh yeah...', img: '/others/bananacat.gif' },
    { speaker: 'Banana Cat', text: 'Make sure to treat me well later!', img: '/others/bananacat.gif' },
    { speaker: 'Hostage', text: "Okayyy, fine...", img: '/others/catcry.gif' },
    { speaker: 'Banana Cat', text: 'You sit back and watch :DD', img: '/others/bananacat.gif' },
    { speaker: 'Boss', text: 'Like if you can >:))', img: '/others/catbossexplaining.gif' },
  ];
  // Intro dialogue lines
  const INTRO_DIALOG_LINES = [
    { speaker: 'Narrator', text: 'It was a beautiful morning and Banana Cat took an early walk.', img: '/others/yapapa.gif' },
    { speaker: 'Narrator', text: 'Then suddenly... Banana Cat stumbled upon a massive cave.', img: '/others/yapapa.gif' },
    { speaker: 'Banana Cat', text: 'Woah!', img: '/others/bananacat.gif' },
    { speaker: 'Banana Cat', text: 'This is the first time I see a cave this huge! What could possibly go wrong if I take a peek inside :DD', img: '/others/bananacat.gif' },
    { speaker: 'Narrator', text: 'Banana cat fell into the cave accidentally.', img: '/others/yapapa.gif' },
    { speaker: 'Banana Cat', text: '...', img: '/others/bananacat.gif' },
    { speaker: 'Banana Cat', text: 'What happened?', img: '/others/bananacat.gif' },
    { speaker: 'Banana Cat', text: 'Where am I?', img: '/others/bananacat.gif' },
    { speaker: 'Banana Cat', text: "Oh well, I'm gonna look for my way out.", img: '/others/bananacat.gif' },
  ];
  const dialogSpeed = 25; // ms per char
  const dialogTimerRef = useRef<number | null>(null);
  const moveTimerRef = useRef<number | null>(null);
  // Scripted walk request: distance remaining in pixels and next dialog line to show
  const scriptedWalkRemainingRef = useRef<number>(0);
  const scriptedWalkNextLineRef = useRef<number | null>(null);
  const scriptedWalkSpeedRef = useRef<number>(120);
  // One-time scripted facing change (set to 1 for right, -1 for left)
  const scriptedFaceRef = useRef<number | null>(null);
  // Intro walk tracking
  const introWalkRemainingRef = useRef<number>(0);
  const introWalkNextActionRef = useRef<string | null>(null);

  // Custom dialog sequence support (for in-battle prompts)
  const customDialogLinesRef = useRef<Array<{speaker:string,text:string,img:string}>|null>(null);
  const customDialogOnCompleteRef = useRef<(() => void) | null>(null);

  // Track whether we've already handled empty-sheriff sequence to avoid repeats
  const sheriffEmptyHandledRef = useRef(false);
  // Track whether we've already handled empty-sniper sequence to avoid repeats
  const sniperEmptyHandledRef = useRef(false);
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);
  const showUpgradeHintRef = useRef(false);
  useEffect(() => { showUpgradeHintRef.current = showUpgradeHint; }, [showUpgradeHint]);

  function startTyping(lineIdx: number) {
    const lines = customDialogLinesRef.current ?? DIALOG_LINES;
    const line = lines[lineIdx];
    if (!line) return;
    // If this dialog line matches one of the hostage prompts, mark it as seen.
    try {
      const h1 = "There's no other way, come here!! Quick!! I'll give something to you!!";
      const h2 = "The boss started moving again. Come here!! Quick!! I'll give something to you!!";
      if (line.speaker === 'Hostage') {
        if (line.text === h1) seenHostage1Ref.current = true;
        if (line.text === h2) seenHostage2Ref.current = true;
        if (seenHostage1Ref.current && seenHostage2Ref.current) rewardUnlockedRef.current = true;
      }
    } catch (e) {}
    setDialogLineIndex(lineIdx);
    setDialogCharIndex(0);
    setDialogDisplayed("");
    if (dialogTimerRef.current) {
      clearInterval(dialogTimerRef.current);
      dialogTimerRef.current = null;
    }
    // Play dialogue typing sound (looped) if audio is allowed
    try {
      const dlg = dialogueAudioRef.current;
      if (dlg && audioAllowedRef.current) {
        dlg.currentTime = 0;
        dlg.play().catch(() => {});
      }
    } catch (e) {}
    dialogTimerRef.current = window.setInterval(() => {
      setDialogCharIndex((ci) => {
        const ni = Math.min(line.text.length, ci + 1);
        setDialogDisplayed(line.text.slice(0, ni));
        if (ni >= line.text.length && dialogTimerRef.current) {
          clearInterval(dialogTimerRef.current);
          dialogTimerRef.current = null;
          // stop dialogue audio when typing completes
          try {
            const dlg = dialogueAudioRef.current;
            if (dlg) {
              dlg.pause();
              dlg.currentTime = 0;
            }
          } catch (e) {}
        }
        return ni;
      });
    }, dialogSpeed);
  }

  // Start a custom dialog sequence (array of {speaker,text,img}). When finished,
  // `onComplete` is invoked. This reuses the existing typing timer but points at
  // `customDialogLinesRef` so `startTyping` will use the custom lines.
  function startCustomDialog(lines: Array<{speaker:string,text:string,img:string}>, onComplete?: () => void) {
    customDialogLinesRef.current = lines.slice();
    customDialogOnCompleteRef.current = onComplete ?? null;
    setDialogVisible(true);
    startTyping(0);
  }

  function finishDialogAndUnpause() {
    // cleanup timers
    if (dialogTimerRef.current) { clearInterval(dialogTimerRef.current); dialogTimerRef.current = null; }
    if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; }
    // ensure dialogue audio is stopped
    try {
      const dlg = dialogueAudioRef.current;
      if (dlg) { dlg.pause(); dlg.currentTime = 0; }
    } catch (e) {}
    setDialogVisible(false);
    setCutsceneActive(false);
    setDialogDisplayed("");
    setDialogLineIndex(0);
    setDialogCharIndex(0);
    setPaused(false);
    // If this was the level-5 boss cutscene, mark it as completed so HUD/music can start
    try {
      if (levelIndex === 4) {
        level5CutsceneDoneRef.current = true;
        // allow the boss to start moving now that its cutscene/dialogue finished
        try { bossCanMoveRef.current = true; } catch (e) {}
          // request showing the sheriff pickup prompt bubble (will be created in the RAF loop)
          try { showSheriffBubbleRef.current = true; } catch (e) {}
        // clear any player animation freeze so the DOM GIF can animate normally
        try { freezePlayerAnimRef.current = false; } catch (e) {}
        // Attempt to start boss music immediately in case the bg effect
        // previously paused the audio while the cutscene ran.
        try {
          const bg = bgAudioRef.current;
          if (bg) {
            bg.currentTime = 0;
            bg.play().catch(() => {});
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  function onDialogClick() {
    // cut any narrator yapapa sound immediately when the user clicks to progress
    try {
      const narr = narratorYapRef.current;
      if (narr) {
        narr.pause();
        try { narr.currentTime = 0; } catch (e) {}
      }
    } catch (e) {}
    // also cut any boss-specific voice clips
    try { const g = germanCatRef.current; if (g) { g.pause(); try { g.currentTime = 0; } catch (e) {} } } catch (e) {}
    try { const c = chineseCatRef.current; if (c) { c.pause(); try { c.currentTime = 0; } catch (e) {} } } catch (e) {}
    try { const cr = cryAudioRef.current; if (cr) { cr.pause(); try { cr.currentTime = 0; } catch (e) {} } } catch (e) {}
    try { const h = hostageCryRef.current; if (h) { h.pause(); try { h.currentTime = 0; } catch (e) {} } } catch (e) {}
    const lines = customDialogLinesRef.current ?? DIALOG_LINES;
    const line = lines[dialogLineIndex];
    if (!line) return;
    // If still typing, finish immediately
    if (dialogCharIndex < line.text.length) {
      if (dialogTimerRef.current) { clearInterval(dialogTimerRef.current); dialogTimerRef.current = null; }
      setDialogCharIndex(line.text.length);
      setDialogDisplayed(line.text);
      // stop dialogue audio since typing was forced to finish
      try {
        const dlg = dialogueAudioRef.current;
        if (dlg) { dlg.pause(); dlg.currentTime = 0; }
      } catch (e) {}
      return;
    }
    // Advance to next line or finish
    const next = dialogLineIndex + 1;
    if (next < lines.length) {
      // Special scripted move for original DIALOG_LINES indices
      if (!customDialogLinesRef.current) {
        if (dialogLineIndex === 8) {
          setDialogVisible(false);
          setCutsceneActive(true);
          setPaused(false);
          scriptedWalkRemainingRef.current = 2 * TILE; // two tiles left
          scriptedWalkNextLineRef.current = next;
          scriptedWalkSpeedRef.current = 120;
        } else {
          if (dialogLineIndex === 9) scriptedFaceRef.current = 1;
          try {
            const nextLine = lines[next];
            if (nextLine && nextLine.img === '/others/catcry.gif') {
              const h = hostageCryRef.current;
              if (h) { try { h.currentTime = 0; } catch (e) {} ; h.play().catch(() => {}); }
            }
          } catch (e) {}
          startTyping(next);
        }
      } else {
        // Progress custom dialog
        try {
          const nextLine = lines[next];
          if (nextLine && nextLine.img === '/others/catcry.gif') {
            const h = hostageCryRef.current;
            if (h) { try { h.currentTime = 0; } catch (e) {} ; h.play().catch(() => {}); }
          }
        } catch (e) {}
        startTyping(next);
      }
    } else {
      // End of dialog sequence
      // If it was a custom dialog, invoke its onComplete handler
      if (customDialogLinesRef.current) {
        const cb = customDialogOnCompleteRef.current;
        customDialogLinesRef.current = null;
        customDialogOnCompleteRef.current = null;
        setDialogVisible(false);
        try { if (cb) cb(); } catch (e) {}
      } else {
        finishDialogAndUnpause();
      }
    }
  }

  // Start intro sequence
  function startIntroSequence() {
  setIntroActive(true);
  setBlackOverlay(true);
  setBlackOverlayOpacity(1);
  setShowHUD(false);
  setPaused(true);
  
  // Fade in black transition over 5 seconds
  setTimeout(() => {
    // Fade out black overlay over 5 seconds
    let opacity = 1;
    const fadeInterval = setInterval(() => {
      opacity -= 0.02;
      setBlackOverlayOpacity(opacity);
      if (opacity <= 0) {
        clearInterval(fadeInterval);
        setBlackOverlay(false);
        // Start walking from left side to S tile
        introWalkRemainingRef.current = 6 * TILE; // Walk 6 tiles from left to S
        introWalkNextActionRef.current = 'first_dialog';
      }
    }, 100);
  }, 100);
}

  // Tile settings
  const TILE = 32;
  const VIEWW = 16 * TILE;
  const VIEWH = 10 * TILE;
  const [canvasSize, setCanvasSize] = useState({ w: VIEWW, h: VIEWH });
  const SCALE = 1.2;
  // Multiplier to adjust the visual size of the reward GIF
  const reward_scale = 1.0;
  // Desired pixel width for weapon pickup images (adjust to make width longer)
  const WEAPON_PICKUP_WIDTH_PX = 40; // change this value to set the pickup width in pixels
  // Larger visual width for the sniper pickup (held weapon/sniper skin)
  const SNIPER_PICKUP_WIDTH_PX = 120; // adjust this to change sniper visual width
  // Multiplier to scale enemy sizes (affects sprite and collision size)
  const ENEMY_SCALE = 1.5;
  // Max volume for the enemy proximity yap sound (0.0 - 1.0). Lower to reduce loudness.
  const YAP_MAX = 0.1 ;
  // Total stars available across the whole game (cap).
  const TOTAL_STARS = 4;
  // Global collected stars count (persist across levels)
  const [collectedStars, setCollectedStars] = useState(0);
  const collectedStarsRef = useRef(collectedStars);
  useEffect(() => { collectedStarsRef.current = collectedStars; }, [collectedStars]);
  // Snapshot of collected stars at the moment the current level started.
  // If the player dies, we restore to this value.
  const levelCollectedAtStartRef = useRef<number>(0);

  const introduction = [
    ".....................................", // 1
    ".....................................", // 2
    "........................#############", // 3
    ".......................##############", // 4
    ".....................################", // 5
    "....................#################", // 6
    "....................######@@@@@@#####", // 7
    ".....................##@@@@@@@@@@@###", // 8
    "......................@@@@@@@@@@@@###", // 9
    "......................@@@@@@@@@@@@@##", // 10
    "......................@@@@@@@@@@@@@@#", // 11
    "....S..........K......@@@@@@@@@@@@@@@", // 12
    "########################@@@@@@@@@@@@@", // 13
    "##########################@@@@@@@@@@@", // 14
    "#############################@@@@@@@@", // 15
    "###############################@@@@@@", // 16
    "#####################################", // 17
    "#####################################", // 18
    "#####################################", // 19
    "#####################################", // 20
  ]

  const levels = [
    [
      "#####################################", // 1
      ".....................................", // 2
      ".....................................", // 3
      ".....................................", // 4
      ".............................E.......", // 5
      ".....##############################..", // 6
      "###.............................###..", // 7
      "................................###..", // 8
      ".........#######................###..", // 9
      "#######...............####......###..", // 10
      "................................###..", // 11
      "..............#####.........#######..", // 12
      "................................###..", // 13
      "...#######......................###..", // 14
      ".......................######...###..", // 15
      ".............######.............###..", // 16
      "................................###..", // 17
      "......#####.....................###..", // 18
      "..S.......................E...P.###.F", // 19
      "#####################################", // 20
    ],
    [
      "#####################################", // 1
      ".....................................", // 2
      "....................................F", // 3
      "......####.........................##", // 4
      ".E.......................#####...####", // 5
      "###..........#########LLLLLLLLLLL####", // 6
      ".............########################", // 7
      ".E...................................", // 8
      "####...............###...............", // 9
      "####..........E....###...............", // 10
      "################################.....", // 11
      "########.............................", // 12
      ".....................................", // 13
      "..................................###", // 14
      "....####.............................", // 15
      "....####.....#####...##...##...#.....", // 16
      "#...####.............................", // 17
      "....######...........................", // 18
      "S...######.......E.......P.......E...", // 19
      "#####################################", // 20
    ],
    [
      "#####################################", // 1
      "................######...............", // 2
      "S...............######.P............F", // 3
      "#####...........#########.......#####", // 4
      "............##########...............", // 5
      ".......###############.....###.......", // 6
      "...........###########...............", // 7
      ".E..............########.............", // 8
      "###########.....######.........######", // 9
      "................######....###..##....", // 10
      "........E.......######.........##....", // 11
      "....#####################.E..........", // 12
      "........................#########....", // 13
      ".....................................", // 14
      "...................................##", // 15
      ".....................................", // 16
      "..####............##....##...##..#...", // 17
      "..........####.......................", // 18
      "LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL", // 19
      "#####################################", // 20
    ],
    [
      "#####################################", // 1
      "............#########################", // 2
      "..........P.......###################", // 3
      ".......#####..........T...E..........", // 4
      "S......#####.......##########&&#####.", // 5
      "###....#####...E............#........", // 6
      ".......###################..#...#####", // 7
      "........######..............#........", // 8
      "...........###...############........", // 9
      ".............###.....#####.....#####.", // 10
      "###..................#####.....##....", // 11
      "......####...........#####.....#....F", // 12
      ".........#################.....#...##", // 13
      "...............................##....", // 14
      "...................................##", // 15
      ".....................................", // 16
      "#####....#.......#........#....#.#...", // 17
      ".....................................", // 18
      "LLLLLLLLLLL###LLLLLLL##LLLLLLLLLLLLLL", // 19
      "#####################################", // 20
    ],
    [
      ".....................................", // 1
      ".....................................", // 2
      ".....................................", // 3
      ".....................................", // 4
      ".....................................", // 5
      ".....................................", // 6
      ".....................................", // 7
      ".....................................", // 8
      ".....................................", // 9
      ".....................................", // 10
      "....S..W............B....C.....R.....", // 11
      "############-------------############", // 12
      "############.............############", // 13
      "############.............############", // 14
      "############.............############", // 15
      "############LLLLLLLLLLLLL############", // 16
      "############LLLLLLLLLLLLL############", // 17
      "#####################################", // 18
      "#####################################", // 19
      "#####################################", // 20
    ],
  ];

  useEffect(() => {
    document.title = "The Cat Platformer";
    // Start intro sequence when component mounts
    startIntroSequence();
    return () => {
      // optional: restore a default title when leaving
      document.title = "PRESS START";
    };
  }, []);

  useEffect(() => {
    // Keep a ref in sync so the long-running game loop can read the
    // current paused state without forcing the main effect to re-run.
    pausedRef.current = paused;
  }, [paused]);

  // If player has the base weapon and later collects enough stars, show upgrade prompt
  useEffect(() => {
    if (weaponType === "sheriff" && collectedStars === TOTAL_STARS) {
      setShowUpgradePrompt(true);
    }
  }, [collectedStars, weaponType]);

  // Set initial ammo when weapon type changes
  useEffect(() => {
    if (weaponType === "sheriff") {
      // Two mags worth: 6 in mag, 6 reserve => 12 total in two mags
      setAmmo({ mag: 6, reserve: 6, magSize: 6 });
    } else if (weaponType === "sniper") {
      // Sniper special: 5 bullets in mag and 0 reserve
      setAmmo({ mag: 5, reserve: 0, magSize: 5 });
    } else {
      setAmmo({ mag: 0, reserve: 0, magSize: 6 });
    }
  }, [weaponType]);

  // Show aim hint on boss level only when the sheriff is picked up
  useEffect(() => {
    if (levelIndex === 4 && hasWeapon && weaponType === 'sheriff') {
      aimShotsRef.current = 0;
      setShowAimHint(true);
      showAimHintRef.current = true;
    } else {
      setShowAimHint(false);
      showAimHintRef.current = false;
    }
  }, [levelIndex, hasWeapon, weaponType]);

  // Monitor ammo changes to count fired bullets and show/hide reload hint
  useEffect(() => {
    try {
      const prev = prevAmmoRef.current;
      // detect bullets consumed (shots fired)
      if (prev && ammo.mag < prev.mag) {
        const fired = prev.mag - ammo.mag;
        aimShotsRef.current += fired;
        if (showAimHintRef.current && aimShotsRef.current >= 2) {
          setShowAimHint(false);
          showAimHintRef.current = false;
        }
      }

      // Show reload hint specifically for the sheriff when mag reaches 0 and there is reserve
      if (weaponType === 'sheriff' && ammo.mag === 0 && ammo.reserve > 0) {
        setShowReloadHint(true);
      } else {
        setShowReloadHint(false);
      }

      // If the player is using the sniper and has completely run out of bullets,
      // trigger a short custom dialog sequence and freeze the boss until it
      // finishes. Guard with a ref so this only runs once per empty event.
      if (weaponType === 'sniper' && prev && (prev.mag > 0 || prev.reserve > 0) && ammo.mag === 0 && ammo.reserve === 0 && !sniperEmptyHandledRef.current) {
        sniperEmptyHandledRef.current = true;
        // freeze boss and activate a cutscene-like state so movement stops.
        try { bossCanMoveRef.current = false; } catch (e) {}
        setCutsceneActive(true);
        const lines = [
          { speaker: 'Banana Cat', text: 'Oh no!!', img: '/others/bananacat.gif' },
          { speaker: 'Banana Cat', text: "I'm out of bullets!", img: '/others/bananacat.gif' },
          { speaker: 'Boss', text: 'You cannot kill me >:D', img: '/others/catbossmain.gif' },
          { speaker: 'Hostage', text: "There's no other way, come here!! Quick!! I'll give something to you!!", img: '/others/catcry.gif' }
        ];
        startCustomDialog(lines, () => {
          // Only allow boss to move again when the dialog says it should
          // We'll check for a specific dialog line in the loop instead of automatically setting to true
          // Don't set bossCanMoveRef.current = true here
          setCutsceneActive(false);
        });
        try { bossCanMoveRef.current = true; } catch (e) {}
      }

      prevAmmoRef.current = ammo;
    } catch (e) {}
  }, [ammo, weaponType]);

  // Audio refs: background music and footsteps
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const footstepsAudioRef = useRef<HTMLAudioElement | null>(null);
  const jumpAudioRef = useRef<HTMLAudioElement | null>(null);
  const yapapaAudioRef = useRef<HTMLAudioElement | null>(null);
  const narratorYapRef = useRef<HTMLAudioElement | null>(null);
  const catdedAudioRef = useRef<HTMLAudioElement | null>(null);
  const bonkAudioRef = useRef<HTMLAudioElement | null>(null);
  const collectAudioRef = useRef<HTMLAudioElement | null>(null);
  const rollAudioRef = useRef<HTMLAudioElement | null>(null);
  const cryAudioRef = useRef<HTMLAudioElement | null>(null);
  const deathAudioRef = useRef<HTMLAudioElement | null>(null);
  const levelfinishAudioRef = useRef<HTMLAudioElement | null>(null);
  const sheriffReloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const sheriffShotAudioRef = useRef<HTMLAudioElement | null>(null);
  const sniperShotAudioRef = useRef<HTMLAudioElement | null>(null);
  const dialogueAudioRef = useRef<HTMLAudioElement | null>(null);
  const germanCatRef = useRef<HTMLAudioElement | null>(null);
  const chineseCatRef = useRef<HTMLAudioElement | null>(null);
  const hostageCryRef = useRef<HTMLAudioElement | null>(null);
  // Cutter / cutting state for level-5 `C` tile
  const cTileRef = useRef<{ x: number; y: number; cut: boolean; progress: number } | null>(null);
  const cutterGivenRef = useRef<boolean>(false);
  const nearHostageAcceptRef = useRef<boolean>(false);
  const [showHostagePrompt, setShowHostagePrompt] = useState(false);
  // Whether the page has received a user gesture allowing audio playback
  const audioAllowedRef = useRef(false);
  // Shooting / reload state
  const nextShotAllowedRef = useRef<number>(0);
  const reloadingRef = useRef(false);
  const reloadTimerRef = useRef<number | null>(null);

  // Create audio elements on mount and clean up on unmount
  useEffect(() => {
    // Background music audio (looping)
    const bg = new Audio();
    bg.loop = true;
    bg.preload = 'auto';
    bg.volume = 0.03;
    // set initial src for the current level (levelIndex closure is initial value)
    bg.src = levelIndex < 4 ? '/sounds/levelmusic.mp3' : '/sounds/bossmusic.mp3';
    bgAudioRef.current = bg;

    // Footsteps audio (looping short clip)
    const fs = new Audio('/sounds/footsteps.mp3');
    fs.loop = true;
    fs.preload = 'auto';
    fs.volume = 0.15;
    footstepsAudioRef.current = fs;

    // Jump sound (one-shot)
    const jmp = new Audio('/sounds/jump.mp3');
    jmp.preload = 'auto';
    jmp.volume = 0.02;
    jumpAudioRef.current = jmp;

    // Enemy proximity sound (looping) - starts silent and is controlled per-frame
    const yap = new Audio('/sounds/yapapa.mp3');
    yap.loop = true;
    yap.preload = 'auto';
    yap.volume = YAP_MAX;
    yapapaAudioRef.current = yap;

    // Dedicated narrator yapapa sound (one-shot) used when narrator GIF appears
    const narr = new Audio('/sounds/yapapa.mp3');
    narr.loop = false;
    narr.preload = 'auto';
    narr.volume = Math.min(0.14, YAP_MAX || 0.14);
    narratorYapRef.current = narr;

    // Bonk sound used when performing the scripted fall
    const bonk = new Audio('/sounds/bonk.mp3');
    bonk.preload = 'auto';
    bonk.volume = 0.18;
    bonkAudioRef.current = bonk;

    // Roll sound used while Banana Cat is spinning/rolling
    const roll = new Audio('/sounds/roll.mp3');
    roll.loop = true;
    roll.preload = 'auto';
    roll.volume = 0.14;
    rollAudioRef.current = roll;

    // Cat death sound (one-shot) used when stomping enemies
    const cd = new Audio('/sounds/catded.mp3');
    cd.preload = 'auto';
    cd.volume = 0.03;
    catdedAudioRef.current = cd;

    // Star collect sound (one-shot)
    const collect = new Audio('/sounds/collect.mp3');
    collect.preload = 'auto';
    collect.volume = 0.05;
    collectAudioRef.current = collect;

    // Level finish sound (one-shot)
    const lf = new Audio('/sounds/levelfinish.mp3');
    lf.preload = 'auto';
    lf.volume = 0.12;
    levelfinishAudioRef.current = lf;

    // Player death sound (one-shot)
    const death = new Audio('/sounds/death.mp3');
    death.preload = 'auto';
    death.volume = 0.22;
    deathAudioRef.current = death;

    // Reward/GIF cry sound (looping while reward exists)
    const cry = new Audio('/sounds/cry.mp3');
    cry.loop = true;
    cry.preload = 'auto';
    cry.volume = 0.07;
    cryAudioRef.current = cry;

    // Weapon sounds
    const sreload = new Audio('/sounds/sheriffreload.mp3');
    sreload.preload = 'auto';
    sreload.volume = 0.48;
    sheriffReloadAudioRef.current = sreload;

    const sshot = new Audio('/sounds/sheriffsound.mp3');
    sshot.preload = 'auto';
    sshot.volume = 0.48;
    sheriffShotAudioRef.current = sshot;

    const snip = new Audio('/sounds/snipersound.mp3');
    snip.preload = 'auto';
    snip.volume = 0.48;
    sniperShotAudioRef.current = snip;

    // Dialogue typing sound (played while text types; loop if short)
    const dlg = new Audio('/sounds/dialogue.mp3');
    dlg.preload = 'auto';
    dlg.loop = true;
    dlg.volume = 0.06;
    dialogueAudioRef.current = dlg;

    // Extra boss voice sounds for specific boss GIFs
    const germ = new Audio('/sounds/germancat.mp3');
    germ.preload = 'auto';
    germ.loop = false;
    germ.volume = 0.07;
    germanCatRef.current = germ;

    const chin = new Audio('/sounds/chinesecat.mp3');
    chin.preload = 'auto';
    chin.loop = false;
    chin.volume = 0.14;
    chineseCatRef.current = chin;

    // Separate hostage cry for dialogue (non-looping) so reward cry can remain looping
    const hcry = new Audio('/sounds/cry.mp3');
    hcry.preload = 'auto';
    hcry.loop = false;
    hcry.volume = 0.18;
    hostageCryRef.current = hcry;

    return () => {
      try {
        bg.pause();
      } catch (e) {}
      try {
        fs.pause();
      } catch (e) {}
      try {
        jmp.pause();
      } catch (e) {}
      try {
        yap.pause();
      } catch (e) {}
      try {
        cd.pause();
      } catch (e) {}
      try {
        collect.pause();
      } catch (e) {}
      try {
        lf.pause();
      } catch (e) {}
      try {
        death.pause();
      } catch (e) {}
      try {
        cry.pause();
      } catch (e) {}
      try { sheriffReloadAudioRef.current?.pause(); } catch (e) {}
      try { sheriffShotAudioRef.current?.pause(); } catch (e) {}
      try { sniperShotAudioRef.current?.pause(); } catch (e) {}
      try { dialogueAudioRef.current?.pause(); } catch (e) {}
      try { narratorYapRef.current?.pause(); } catch (e) {}
      try { germanCatRef.current?.pause(); } catch (e) {}
      try { chineseCatRef.current?.pause(); } catch (e) {}
      try { hostageCryRef.current?.pause(); } catch (e) {}
      try { bonkAudioRef.current?.pause(); } catch (e) {}
      try { rollAudioRef.current?.pause(); } catch (e) {}
      bgAudioRef.current = null;
      footstepsAudioRef.current = null;
      jumpAudioRef.current = null;
      yapapaAudioRef.current = null;
      catdedAudioRef.current = null;
      collectAudioRef.current = null;
      levelfinishAudioRef.current = null;
      deathAudioRef.current = null;
      cryAudioRef.current = null;
      hostageCryRef.current = null;
      sheriffReloadAudioRef.current = null;
      sheriffShotAudioRef.current = null;
      sniperShotAudioRef.current = null;
      dialogueAudioRef.current = null;
      narratorYapRef.current = null;
      germanCatRef.current = null;
      chineseCatRef.current = null;
      bonkAudioRef.current = null;
      rollAudioRef.current = null;
    };
  }, []);

  // Play narrator yapapa sound when the dialog line shows the narrator yapapa GIF
  useEffect(() => {
    try {
      const lines = customDialogLinesRef.current ?? (introActive ? INTRO_DIALOG_LINES : DIALOG_LINES);
      const line = lines[dialogLineIndex];
      if (!line) return;
      const img = line.img;
      // Pause any boss/narrator/hostage sounds first
      try { germanCatRef.current?.pause(); } catch (e) {}
      try { chineseCatRef.current?.pause(); } catch (e) {}
      try { narratorYapRef.current?.pause(); } catch (e) {}
      try { cryAudioRef.current?.pause(); } catch (e) {}

      if (!dialogVisible) return;
      if (img === '/others/yapapa.gif') {
        const narr = narratorYapRef.current;
        if (narr) { try { narr.currentTime = 0; } catch (e) {} ; narr.play().catch(() => {}); }
      } else if (img === '/others/catbossexplaining.gif') {
        const g = germanCatRef.current;
        if (g) { try { g.currentTime = 0; } catch (e) {} ; g.play().catch(() => {}); }
      } else if (img === '/others/catbossangry.gif') {
        const c = chineseCatRef.current;
        if (c) { try { c.currentTime = 0; } catch (e) {} ; c.play().catch(() => {}); }
      } else if (img === '/others/catcry.gif') {
        const cr = hostageCryRef.current;
        if (cr) { try { cr.currentTime = 0; } catch (e) {} ; if (audioAllowedRef.current) cr.play().catch(() => {}); }
      }
    } catch (e) {}
  }, [dialogLineIndex, dialogVisible, introActive]);

  // Some browsers block autoplay until a user gesture. Listen for the
  // first user interaction and then resume audio playback.
  useEffect(() => {
    if (audioAllowedRef.current) return;
    const tryResume = () => {
      audioAllowedRef.current = true;
      const bg = bgAudioRef.current;
      try {
        if (bg && !pausedRef.current) bg.play().catch(() => {});
      } catch (e) {}
      // don't attempt to autoplay footsteps here; they'll start when movement occurs
    };

    window.addEventListener('pointerdown', tryResume, { once: true });
    window.addEventListener('keydown', tryResume, { once: true });

    return () => {
      window.removeEventListener('pointerdown', tryResume);
      window.removeEventListener('keydown', tryResume);
    };
  }, [paused, levelIndex]);

  // Switch background music when level changes, paused/resumed, or during intro
  useEffect(() => {
    const bg = bgAudioRef.current;
    if (!bg) return;
    // Prefer level music during the intro sequence
    const src = introActive ? '/sounds/levelmusic.mp3' : (levelIndex < 4 ? '/sounds/levelmusic.mp3' : '/sounds/bossmusic.mp3');
    // only change source when different to avoid reloading repeatedly
    if (bg.src !== new URL(src, window.location.origin).href) {
      bg.src = src;
      try {
        bg.currentTime = 0;
      } catch (e) {}
    }

    // If intro is active, allow level music to play even if general `paused` is true
    if (!pausedRef.current || introActive) {
      // On level 5 (index 4) only start playback after the boss cutscene/dialogue
      // has finished; otherwise keep the music paused (skip this check during intro)
      if (!introActive && levelIndex === 4 && !level5CutsceneDoneRef.current) {
        try { bg.pause(); } catch (e) {}
      } else {
        bg.play().catch(() => {});
      }
    } else {
      bg.pause();
    }
  }, [levelIndex, paused, introActive]);

  // Build a 2D map from a level's string array, padding rows to equal width
  function makeMap(levelArr: string[]): string[][] {
    const maxLen = levelArr.reduce((m, row) => Math.max(m, row.length), 0);
    return levelArr.map((row) => row.padEnd(maxLen, ".").split(""));
  }

  function createPlayer(spawnX = TILE * 2, spawnY = TILE * 6) {
    return {
      x: spawnX,
      y: spawnY,
      w: TILE * .85,
      h: TILE * .99,
      vx: 0,
      vy: 0,
      speed: 160,
      jumpForce: 500,
      onGround: false,
      dir: 1,
    };
  }

  // Enemy template
  function createEnemy(x: number, y: number) {
    return {
      x: x * TILE,
      y: y * TILE,
      w: TILE * 0.75 * ENEMY_SCALE,
      h: TILE * 0.85 * ENEMY_SCALE,
      vx: 60,
      dir: 1,
      health: 1,
      vy: 0,
      onGround: false,
      // Keep original tile coords for respawn
      spawnTX: x,
      spawnTY: y,
    };
  }

  // Boss template
  function createBoss(x: number, y: number) {
    return {
      x: x * TILE,
      y: y * TILE,
      w: TILE * 1.5,
      h: TILE * 2,
      vx: 40,
      dir: 1,
      health: 1500,
      vy: 0,
      canFall: false, 
    };
  }

  // Weapon pickup
  function createWeapon(x: number, y: number) {
    return {
      x: x * TILE,
      y: y * TILE,
      w: TILE * 0.6,
      h: TILE * 0.3,
      collected: false,
    };
  }

  // Reward/finish point
  function createReward(x: number, y: number) {
    return {
      x: x * TILE,
      y: y * TILE,
      w: TILE,
      h: TILE,
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas as HTMLCanvasElement;

    // Compute the current level map first so we can size the canvas
    let map = makeMap(introActive ? introduction : levels[levelIndex]);
    canvasEl.width = map[0].length * TILE;
    canvasEl.height = map.length * TILE;
    setCanvasSize({ w: canvasEl.width, h: canvasEl.height });
    const ctx = canvasEl.getContext("2d") as CanvasRenderingContext2D;
    let last = performance.now();
    let raf: number | null = null;

    // Game state
    // `map` was sized above for the canvas; keep using it here
    let player = createPlayer();
    let enemies: any[] = [];
    // Active bullet tracers (projectiles that travel towards targets)
    let tracers: any[] = [];
    // Stars (collectibles marked as 'P' in level data).
    let stars: any[] = [];

    // Create a travelling tracer (bullet) that moves from a start point toward a
    // target at a given speed (px/s) and applies `damage` on hit. Tracers are
    // simple point-like objects checked against enemy/boss rects.
    function spawnTracer(startX: number, startY: number, targetX: number, targetY: number, speed: number, damage: number, type = 'sheriff') {
      const dx = targetX - startX;
      const dy = targetY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const vx = (dx / len) * speed;
      const vy = (dy / len) * speed;
      // life = time to reach target + small buffer. If type is 'sheriff', keep
      // a longer lifetime so it can traverse the full map when fired forward.
      const baseLife = Math.max(0.5, len / speed + 0.2);
      const life = type === 'sheriff' ? Math.max(baseLife, (map[0].length * TILE) / speed + 0.1) : baseLife;
      // smaller collision radius for a thinner bullet feel
      const r = type === 'sniper' ? 2 : 1.25;
      // trail length used for drawing streaks — sniper gets a longer streak
      // to appear like a long tracer; sheriff is vibrant but slightly shorter.
      const trail = type === 'sniper' ? 44 : 28;
      tracers.push({ x: startX, y: startY, vx, vy, age: 0, life, r, damage, type, trail });
    }
    // Map of enemy id -> DOM <img> used to display animated GIFs
    const enemyImgEls = new Map<number, HTMLImageElement>();
    // DOM <img> for the reward GIF (so it animates as a DOM element rather than a frozen canvas draw)
    let rewardImgEl: HTMLImageElement | null = null;
    // DOM <img> for the boss so it can be z-indexed above bridges
    let bossImgEl: HTMLImageElement | null = null;
    // Interval id used to flip celebration images (reward/dialog) every 2s
    let celebrationFlipInterval: number | null = null;
    // Scale factor to apply to the player GIF when celebrating
    let happyScale = 1;
    // DOM element for the sheriff speech bubble
    let sheriffBubbleEl: HTMLDivElement | null = null;
    // DOM element for the first-star speech bubble
    let starBubbleEl: HTMLDivElement | null = null;
    let enemyIdCounter = 0;
    // Track enemy respawn timers so we can clear them on cleanup or level change
    let enemyRespawnTimers: number[] = [];
        // Reset current level (on player death)
        function resetCurrentLevel(reason: string) {
          // Ensure death overlay state is cleared when we prepare to reset
          deathActiveRef.current = false;
          // Restore collected stars to the value at level start (undo tentative collects)
          try { setCollectedStars(levelCollectedAtStartRef.current); } catch (e) {}
          setPaused(true);
          setCompletionMessage(`${reason}! Restarting level...`);
          // Clear enemy respawn timers immediately
          enemyRespawnTimers.forEach((t) => clearTimeout(t));
          enemyRespawnTimers = [];
          setTimeout(() => {
            setCompletionMessage(null);
            // Rebuild map and reinitialize level state
            map = makeMap(levels[levelIndex]);
            initializeLevel(map, false);

            // If this is the boss level (index 4) we want to replay the
            // scripted walk-into-scene + dialogue that normally runs when
            // the level is first entered. The main effect runs this once
            // on initialize, but a mid-level reset won't re-run that block,
            // so trigger it here explicitly.
            try {
              // clear the shown-cutscene flag so the cutscene code will run
              shownCutscenesRef.current[levelIndex] = false;

              // *** NEW: Force a full state reset on respawn for Level 5 (index 4) ***
              if (levelIndex === 4) {
                // 1. Reset Weapon/Ammo State (Ensure nothing is equipped)
                // This allows the subsequent level initialization to properly equip the starting weapon.
                setHasWeapon(false);
                setWeaponType(null);
                setAmmo({ mag: 0, reserve: 0, magSize: 6 });

                // 2. Reset Custom Dialogue Flags
                // Clear the flags that prevent the "out of ammo" dialogue from showing again.
                sniperEmptyHandledRef.current = false;
                sheriffEmptyHandledRef.current = false;
                
                // 3. Reset Active Dialogue and Line Index
                // Clear any active custom dialogue lines (if they were running)
                customDialogLinesRef.current = null;
                customDialogOnCompleteRef.current = null;
                // Ensure the line index is reset to 0 so the next dialogue starts from the first line.
                setDialogLineIndex(0);
              }
            } catch (e) {}

            try {
              if (levelIndex === 4 && boss && !shownCutscenesRef.current[levelIndex] && !introActiveRef.current) {
                shownCutscenesRef.current[levelIndex] = true;
                setPaused(false);
                setCutsceneActive(true);
                setDialogVisible(false);
                try { player.x = 0; } catch (e) {}
                const targetX = (playerSpawn as any) ? (playerSpawn as any).x * TILE : player.x;
                const speed = 120; // px per second for cutscene walk
                if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; }
                moveTimerRef.current = window.setInterval(() => {
                  try {
                    const dx = speed * 0.016;
                    player.x = Math.min(targetX, (player.x || 0) + dx);
                    if (player.x >= targetX - 0.5) {
                      if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; }
                      const t = window.setTimeout(() => {
                        setDialogVisible(true);
                        startTyping(0);
                      }, 420);
                      enemyRespawnTimers.push(t);
                    }
                  } catch (e) {}
                }, 16);
                if (moveTimerRef.current) enemyRespawnTimers.push(moveTimerRef.current as unknown as number);
              }
            } catch (e) {}

            setPaused(false);
          }, 2000);
        }
    let boss: any = null;
    let weapon: any = null;
    let reward: any = null;
    let traps: { x: number; y: number; active: boolean }[] = [];
    let deactivatedWalls: { x: number; y: number }[] = [];
    let bridges: { x: number; y: number }[] = [];
    let lavaTiles: { x: number; y: number }[] = [];
    let activatedTraps = new Set<string>();
    let activeDeactivatedWalls = new Set<string>();
    let playerSpawn: { x: number; y: number } | null = null;
    // Cutting state for level-5 'C' tile
    let cutInterval: number | null = null;
    const CUT_DURATION_MS = 8000;

    // Controls
    const keys = { left: false, right: false, up: false, attack: false };

    function onKey(e: KeyboardEvent, down: boolean) {
      // Ignore player input during scripted cutscenes or while dialog is visible
      if (cutsceneActiveRef.current || dialogVisibleRef.current || introActiveRef.current) return;
      if (e.key === "a" || e.key === "A") keys.left = down;
      if (e.key === "d" || e.key === "D") keys.right = down;
      // Use Space (code "Space") for jump; support setting on both down and up
      if (e.code === "Space" || e.key === " ") {
        keys.up = down;
        if (down) e.preventDefault();
      }
      if (e.key === "f" || e.key === "F") {
        // If player is near the hostage and presses F, accept the cutter handover
        // Only allow granting the cutter if one of the specific hostage lines
        // has been said earlier (seenHostage1Ref or seenHostage2Ref).
        // In the onKey function, inside the F key down handler
      if (down && nearHostageAcceptRef.current && (seenHostage1Ref.current || seenHostage2Ref.current)) {
        // begin handover animation: cutter image moves from hostage -> player
        try {
          setCutsceneActive(true);
          setPaused(true);
          const parent = canvasEl.parentElement;
          
          // Get the reward's DOM image (catcry.gif)
          const hostImg = rewardImgEl;
          
          // Get player position from game state, not DOM element
          if (parent && hostImg && reward) {
            const cutterImg = document.createElement('img');
            cutterImg.src = '/images/cutter.png';
            cutterImg.draggable = false;
            cutterImg.style.position = 'absolute';
            cutterImg.style.pointerEvents = 'none';
            cutterImg.style.imageRendering = 'pixelated';
            cutterImg.style.zIndex = '12000';
            
            // Calculate starting position from the reward (R tile)
            // Use the reward's world coordinates and convert to screen coordinates
            const startX = Math.round((reward.x - camera.x) * SCALE);
            const startY = Math.round((reward.y - camera.y) * SCALE);
            
            // Calculate ending position at the player's current position
            const endX = Math.round((player.x - camera.x) * SCALE);
            const endY = Math.round((player.y - camera.y) * SCALE);
            
            // Set initial position at the reward
            cutterImg.style.left = `${startX}px`;
            cutterImg.style.top = `${startY}px`;
            cutterImg.style.width = '36px';
            cutterImg.style.height = 'auto';
            cutterImg.style.transition = 'left 650ms ease, top 650ms ease, transform 650ms ease';
            parent.appendChild(cutterImg);
            
            // Ensure layout
            setTimeout(() => {
              try {
                // Move to player's position
                cutterImg.style.left = `${endX}px`;
                cutterImg.style.top = `${endY}px`;
              } catch (e) {}
              
              setTimeout(() => {
                try { cutterImg.remove(); } catch (e) {}
                // show dialog line from hostage
                startCustomDialog([
                  { speaker: 'Hostage', text: 'Cut the bridge when the boss crosses it, make sure to time it correctly!!', img: '/others/catcry.gif' }
                ], () => {
                  // give the player the cutter permission
                  cutterGivenRef.current = true;
                  setCutsceneActive(false);
                  setPaused(false);
                });
              }, 700);
            }, 20);
          } else {
            // fallback: just show dialog and grant cutter
            startCustomDialog([
              { speaker: 'Hostage', text: 'Cut the bridge when the boss crosses it, make sure to time it correctly!!', img: '/others/catcry.gif' }
            ], () => { 
              cutterGivenRef.current = true; 
              setCutsceneActive(false); 
              setPaused(false); 
            });
          }
        } catch (e) {}
        return;
      }
        // If we're showing the upgrade hint, treat F as the upgrade key instead
        if (down && showUpgradeHintRef.current && weaponTypeRef.current === 'sheriff') {
          // perform upgrade
          setWeaponType('sniper');
          setHasWeapon(true);
          setShowUpgradeHint(false);
          showUpgradeHintRef.current = false;
          // Make sure boss is NOT moving yet (keep it frozen)
          try { bossCanMoveRef.current = false; } catch (e) {}
          // Open the follow-up dialog sequence after upgrading
          startCustomDialog([
            { speaker: 'Banana Cat', text: 'Woah!', img: '/others/bananacat.gif' },
            { speaker: 'Hostage', text: "Damn, that will surely take down the boss!", img: '/others/catcry.gif' },
          ], () => {
            startCustomDialog([
              { speaker: 'Hostage', text: "Its starting to move again!! Quick take it down!", img: '/others/catcry.gif' },
            ], () => {
              // Only when this specific line completes, allow boss to move again
              try { bossCanMoveRef.current = true; } catch (e) {}
            });
          }); 
        } else {
          keys.attack = down;
        }
      }
      // Reload on `r` (only on keydown)
      if ((e.key === "r" || e.key === "R") && down) {
        const wtype = weaponTypeRef.current;
        if (!wtype || !hasWeaponRef.current) return;
        const cur = ammoRef.current;
        if (wtype === "sheriff") {
          // Start reload process if not already reloading and there is reserve
          if (!reloadingRef.current && cur.mag < cur.magSize && cur.reserve > 0) {
            reloadingRef.current = true;
            try {
              const s = sheriffReloadAudioRef.current;
              if (s) {
                s.currentTime = 0;
                s.play().catch(() => {});
              }
            } catch (e) {}
            // 2.25 second reload time
            const t = window.setTimeout(() => {
              const nowCur = ammoRef.current;
              const need = nowCur.magSize - nowCur.mag;
              const take = Math.min(need, nowCur.reserve);
              setAmmo({ mag: nowCur.mag + take, reserve: nowCur.reserve - take, magSize: nowCur.magSize });
              reloadingRef.current = false;
              reloadTimerRef.current = null;
            }, 2250);
            reloadTimerRef.current = t;
          }
        } else if (wtype === "sniper") {
          // Sniper cannot be reloaded via R (5/0 special) — ignore
        }
      }
    }

    // Clear movement/jump on keyup
    const keyupHandler = (e: KeyboardEvent) => onKey(e, false);

    const keydownHandler = (e: KeyboardEvent) => onKey(e, true);

    window.addEventListener("keydown", keydownHandler);
    window.addEventListener("keyup", keyupHandler);

    // Pointer: left-click to attack/aim and click-on-boss damage. Also prevent context menu on canvas.
    const pointerDownHandler = (ev: PointerEvent) => {
      // Ignore pointer input during cutscenes or while dialog is visible
      if (cutsceneActiveRef.current || dialogVisibleRef.current || introActiveRef.current) return;
      // left button
      if ((ev as any).button === 0) {
        // compute canvas-relative coordinates and world coordinates
        const rect = canvasEl.getBoundingClientRect();
        const cssX = ev.clientX - rect.left;
        const cssY = ev.clientY - rect.top;
        const scaleX = canvasEl.width / rect.width;
        const scaleY = canvasEl.height / rect.height;
        const worldX = camera.x + cssX * scaleX;
        const worldY = camera.y + cssY * scaleY;

        // compute clicked tile
        const clickedTileX = Math.floor(worldX / TILE);
        const clickedTileY = Math.floor(worldY / TILE);

        // If clicking on the special 'C' tile and player is positioned one
        // block to the right and the cutter has been accepted, start cutting.
        try {
          const ct = cTileRef.current;
          const playerTileX = Math.floor((player.x + player.w / 2) / TILE);
          const playerTileY = Math.floor((player.y + player.h - 1) / TILE);
          if (ct && !ct.cut && clickedTileX === ct.x && clickedTileY === ct.y && cutterGivenRef.current && playerTileX === ct.x + 1 && playerTileY === ct.y) {
            // begin cut progress (requires holding left click)
            ct.progress = 0;
            // store ref changes back
            cTileRef.current = ct;
            // clear any previous
            if (cutInterval) { clearInterval(cutInterval); cutInterval = null; }
            const start = Date.now();
            cutInterval = window.setInterval(() => {
              const elapsed = Date.now() - start;
              const prog = Math.min(1, elapsed / CUT_DURATION_MS);
              try { if (cTileRef.current) cTileRef.current.progress = prog; } catch (e) {}
              if (prog >= 1) {
                try {
                    if (cTileRef.current) {
                        cTileRef.current.cut = true;
                        // make the post tile passable
                        try { map[cTileRef.current.y][cTileRef.current.x] = "."; } catch (e) {}
                    }

                    let wasOnBridge = false;
                    
                    // 1. CHECK IF THE BOSS IS ON THE BRIDGE (MUST BE DONE BEFORE TILE REMOVAL)
                    try {
                        if (boss) {
                            // Calculate which tile is immediately BENEATH the boss's feet
                            // Use +1 to check the ground tile below, rather than inside the boss body
                            const bossFootY = Math.floor((boss.y + boss.h + 1) / TILE);
                            const bossLeftTile = Math.floor(boss.x / TILE);
                            const bossRightTile = Math.floor((boss.x + boss.w - 1) / TILE);
                            
                            // Check if any of the tiles under the boss are the solid bridge tiles ("-")
                            for (let tx = bossLeftTile; tx <= bossRightTile; tx++) {
                                // Check the CURRENT (solid) state of the map tile
                                const originalTile = tileAt(tx, bossFootY); 
                                if (originalTile === "-") {
                                    wasOnBridge = true;
                                    break;
                                }
                            }
                        }
                    } catch (e) {}
                    
                    // 2. REMOVE THE BRIDGE TILES (MAP UPDATE)
                    for (const bridge of bridges) {
                        try {
                            // Change the bridge tile from '-' to '.' (empty/passable)
                            if (map[bridge.y][bridge.x] === '-') {
                                map[bridge.y][bridge.x] = ".";
                            }
                        } catch (e) {}
                    }

                    // 3. EXECUTE FALLING LOGIC BASED ON THE CHECK FROM STEP 1
                    try {
                        if (wasOnBridge && boss) { 
                            // Play bonk sound immediately
                            try { 
                                if (bonkAudioRef.current) {
                                    bonkAudioRef.current.currentTime = 0;
                                    bonkAudioRef.current.play().catch(() => {});
                                }
                            } catch (e) {}
                            
                            // FIX: Properly initiate falling
                            boss.canFall = true;
                            boss.vy = 150; // Start with some downward velocity
                            
                            // FIX: Move boss down slightly to break contact with bridge
                            boss.y += 2;
                        } else if (boss && boss.health > 0) {
                            // FIX: If bridge was cut but boss was NOT on it, fail the level immediately
                            resetCurrentLevel("Level Failed. Boss is still alive");
                        }
                    } catch (e) {}
                    
                    if (cutInterval) { 
                        clearInterval(cutInterval); 
                        cutInterval = null; 
                    }
                } catch (e) {}
            }
            }, 150);
            ev.preventDefault();
            return;
          }
        } catch (e) {}

        // If a boss exists and the click hits the boss, apply direct damage
        if (boss) {
          const bx = boss.x;
          const by = boss.y;
          const bw = boss.w;
          const bh = boss.h;
          if (worldX >= bx && worldX <= bx + bw && worldY >= by && worldY <= by + bh) {
            const now = Date.now();
            const wtype = weaponTypeRef.current || 'sheriff';
            const cur = ammoRef.current;
            // prevent shooting while reloading or before cooldown
            if (reloadingRef.current || now < nextShotAllowedRef.current) {
              keys.attack = true;
              ev.preventDefault();
              return;
            }
            if (cur.mag > 0 && hasWeaponRef.current) {
              // consume one bullet and start cooldown
              const cooldown = wtype === 'sheriff' ? 250 : Math.round(1000 / 0.6);
              setAmmo({ mag: Math.max(0, cur.mag - 1), reserve: cur.reserve, magSize: cur.magSize });
              nextShotAllowedRef.current = now + cooldown;
              try {
                if (wtype === 'sniper') {
                  const sn = sniperShotAudioRef.current;
                  if (sn) { sn.currentTime = 0; sn.play().catch(() => {}); }
                } else {
                  const ss = sheriffShotAudioRef.current;
                  if (ss) { ss.currentTime = 0; ss.play().catch(() => {}); }
                }
              } catch (e) {}

              // Spawn a travelling tracer toward the boss instead of applying
              // instant damage. Damage will be applied when the tracer collides.
              try {
                const muzzleX = (player.x || 0) + (player.w || 0) / 2;
                const muzzleY = (player.y || 0) + (player.h || 0) / 2;
                const targetX = bx + bw / 2;
                const targetY = by + bh / 2;
                const speed = wtype === 'sniper' ? 2000 : 900; // px/s travel speed
                const damage = wtype === 'sniper' ? 150 : 55;
                spawnTracer(muzzleX, muzzleY, targetX, targetY, speed, damage, wtype);
              } catch (e) {}
            } else {
              keys.attack = true;
            }
            ev.preventDefault();
            return;
          }
        }

        // Fallback: treat as generic attack input (for firing forward)
        keys.attack = true;
        ev.preventDefault();
      }
    };
    const pointerUpHandler = (_ev: PointerEvent) => {
      // stop generic attack input
      try { keys.attack = false; } catch (e) {}
      // stop any cutting in progress
      try {
        if (cutInterval) { clearInterval(cutInterval); cutInterval = null; }
        if (cTileRef.current && !cTileRef.current.cut) cTileRef.current.progress = 0;
      } catch (e) {}
    };
    const ctxMenuHandler = (ev: Event) => { ev.preventDefault(); };
    canvasEl.addEventListener('pointerdown', pointerDownHandler);
    canvasEl.addEventListener('contextmenu', ctxMenuHandler);
    window.addEventListener('pointerup', pointerUpHandler);

    // Initialize level
    function initializeLevel(level: string[][], spawnLeftForIntro = false) {
      // Remove any existing enemy DOM images
      enemyImgEls.forEach((img) => img.remove());
      enemyImgEls.clear();
      // Remove reward DOM image if present
      try { if (rewardImgEl) { rewardImgEl.remove(); rewardImgEl = null; } } catch (e) {}
      try { if (celebrationFlipInterval) { clearInterval(celebrationFlipInterval); celebrationFlipInterval = null; } } catch (e) {}
      // Remove boss DOM image if present
      try { if (bossImgEl) { bossImgEl.remove(); bossImgEl = null; } } catch (e) {}
      // Remove sheriff bubble if present
      try { if (sheriffBubbleEl) { sheriffBubbleEl.remove(); sheriffBubbleEl = null; } } catch (e) {}
      // Remove first-star bubble if present
      try { if (starBubbleEl) { starBubbleEl.remove(); starBubbleEl = null; } } catch (e) {}
      // Remove first-star bubble if present
      try { if (starBubbleEl) { starBubbleEl.remove(); starBubbleEl = null; } } catch (e) {}
      enemyIdCounter = 0;
      enemies = [];
      // Reset stars for the level (collectedStars persists across levels)
      stars = [];
      // Clear any active tracers when reinitializing the level
      tracers = [];
      traps = [];
      deactivatedWalls = [];
      bridges = [];
      lavaTiles = [];
      activatedTraps.clear();
      activeDeactivatedWalls.clear();
      weapon = null;
      boss = null;
      reward = null;
      playerSpawn = null;
      // reset cutter state
      try { cTileRef.current = null; } catch (e) {}
      try { cutterGivenRef.current = false; } catch (e) {}
      setHasWeapon(false);
      setBossHealth(1500);
      setHealth(100);
      // reset boss movement permission until dialog completes
      try { bossCanMoveRef.current = false; } catch (e) {}
      // Reset level-5 cutscene completion when (re)initializing the level
      try { level5CutsceneDoneRef.current = false; } catch (e) {}
      // Clear any scripted walk/facing state so it doesn't carry across levels
      try { scriptedWalkRemainingRef.current = 0; } catch (e) {}
      try { scriptedWalkNextLineRef.current = null; } catch (e) {}
      try { scriptedFaceRef.current = null; } catch (e) {}
      try { freezePlayerAnimRef.current = false; } catch (e) {}
      try { showSheriffBubbleRef.current = false; } catch (e) {}
      try { showFirstStarBubbleRef.current = levelIndex === 0; } catch (e) {}
      try { sheriffEmptyHandledRef.current = false; } catch (e) {}
      // Reset hostage dialog tracking and reward lock for the new level
      try { seenHostage1Ref.current = false; } catch (e) {}
      try { seenHostage2Ref.current = false; } catch (e) {}
      try { rewardUnlockedRef.current = false; } catch (e) {}
      try { if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; } } catch (e) {}
      try { 
          introWalkRemainingRef.current = 0;
          introWalkNextActionRef.current = null;
        } catch (e) {}
      try { happyScale = 1; } catch (e) {}

      // Find all special tiles
      for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
          const tile = level[y][x];
          switch (tile) {
            case "S":
              playerSpawn = { x, y };
              break;
            case "E":
              // create enemy with attached DOM GIF sprite
              const ne = createEnemy(x, y);
              (ne as any).id = ++enemyIdCounter;
              // Special-case: on level 4 (index 3) make enemies size 1.0 and faster
              if (levelIndex === 2) {
                ne.w = TILE * 0.95 * 1.0; // reset to base 1.0
                ne.h = TILE * 0.99 * 1.0;
                ne.vx = Math.round(ne.vx * 2); // increase speed
              }
              if (levelIndex === 3) {
                ne.w = TILE * 0.95 * 1.0; // reset to base 1.0
                ne.h = TILE * 0.99 * 1.0;
                ne.vx = Math.round(ne.vx * 3); // increase speed
              }
              enemies.push(ne);
              // create DOM image for this enemy
              try {
                const img = document.createElement("img");
                img.src = "/others/yapapa.gif";
                img.draggable = false;
                img.style.position = "absolute";
                img.style.left = "0px";
                img.style.top = "0px";
                img.style.pointerEvents = "none";
                img.style.imageRendering = "pixelated";
                img.style.transformOrigin = "bottom center";
                // initial size (will be updated each frame)
                img.style.width = `${Math.round(ne.w * SCALE)}px`;
                img.style.height = `${Math.round(ne.h * SCALE)}px`;
                // start hidden until positioned in the render loop
                img.style.display = "none";
                canvasEl.parentElement?.appendChild(img);
                enemyImgEls.set((ne as any).id, img);
              } catch (e) {}
              break;
            case "B":
              boss = createBoss(x, y);
              // place boss visually one tile above the marker so it stands on top of bridges
              try { boss.y = boss.y - TILE; } catch (e) {}
              // create a DOM image for the boss so its animated GIF appears above bridge tiles
              try {
                const img = document.createElement("img");
                img.src = "/others/catbossmain.gif";
                img.draggable = false;
                img.style.position = "absolute";
                img.style.left = "0px";
                img.style.top = "0px";
                img.style.pointerEvents = "none";
                img.style.imageRendering = "pixelated";
                img.style.transformOrigin = "bottom center";
                img.style.display = "none";
                canvasEl.parentElement?.appendChild(img);
                bossImgEl = img;
              } catch (e) {}
              break;
            case "W":
              weapon = createWeapon(x, y);
              level[y][x] = ".";
              break;
            case "P":
              // Add up to 4 stars per level
              if (stars.length < 4) {
                stars.push({ x: x * TILE, y: y * TILE, w: TILE * 0.9, h: TILE * 0.9, collected: false });
              }
              // clear the tile so it's not treated as solid
              level[y][x] = ".";
              break;
            case "R":
              reward = createReward(x, y);
              // Create a DOM <img> for the reward GIF so it stays animated (same approach used for enemies)
              try {
                const img = document.createElement("img");
                img.src = "/others/catcry.gif";
                img.draggable = false;
                img.style.position = "absolute";
                img.style.left = "0px";
                img.style.top = "0px";
                img.style.pointerEvents = "none";
                img.style.imageRendering = "pixelated";
                img.style.transformOrigin = "bottom center";
                img.style.display = "none";
                canvasEl.parentElement?.appendChild(img);
                rewardImgEl = img;
              } catch (e) {}
              break;
            case "C":
              // Cable/post that can be cut by the player to drop the bridge
              cTileRef.current = { x, y, cut: false, progress: 0 };
              break;
              break;
            case "T":
              traps.push({ x, y, active: false });
              break;
            case "&":
              deactivatedWalls.push({ x, y });
              break;
            case "-":
              bridges.push({ x, y });
              break;
            case "L":
              lavaTiles.push({ x, y });
              break;
          }
        }
      }

      // Set player spawn
      if (playerSpawn) {
        if (spawnLeftForIntro && levelIndex === 0) {
          // For intro: spawn player outside left side of map (6 tiles left of S)
          player = createPlayer((playerSpawn.x * TILE) - (6 * TILE), playerSpawn.y * TILE);
        } else {
          player = createPlayer(playerSpawn.x * TILE, playerSpawn.y * TILE);
        }
      } else {
        // Default spawn if no S found
        player = createPlayer(TILE * 2, TILE * 6);
      }
      // Snapshot current global collected count as the baseline for this level
      levelCollectedAtStartRef.current = collectedStarsRef.current;
      // Show the first-star bubble on level 1 (index 0) if the level contains at least one star
      try {
        showFirstStarBubbleRef.current = (levelIndex === 0 && stars.length > 0);
      } catch (e) {}
    }

    // Check tile type
    function tileAt(tx: number, ty: number): string {
      if (ty < 0 || ty >= map.length) return "#";
      if (tx < 0 || tx >= map[0].length) return "#";
      return map[ty][tx];
    }

    function isSolidTile(tx: number, ty: number): boolean {
      const tile = tileAt(tx, ty);
      // Check if this position has a deactivated wall that's currently active
      const deactivatedKey = `${tx},${ty}`;
      if (activeDeactivatedWalls.has(deactivatedKey)) {
        return false; // Deactivated walls are not solid
      }
      // '@' tiles are passable dirt walls, 'K' tiles are half-block rocks
      return tile === "#" || tile === "&";
    }

    function isBridgeTile(tx: number, ty: number): boolean {
      return tileAt(tx, ty) === "-";
    }

    // Helper to spawn an enemy with a DOM sprite (used for respawn)
    function spawnEnemyWithSprite(tx: number, ty: number) {
      const ne = createEnemy(tx, ty);
      (ne as any).id = ++enemyIdCounter;
      // Match level-4 special sizing/speed on respawn if we're on that level
      if (levelIndex === 3) {
        ne.w = TILE * 0.75 * 1.0;
        ne.h = TILE * 0.85 * 1.0;
        ne.vx = Math.round(ne.vx * 1.6);
      }
      enemies.push(ne);
      try {
        const img = document.createElement("img");
        img.src = "/others/yapapa.gif";
        img.draggable = false;
        img.style.position = "absolute";
        img.style.left = "0px";
        img.style.top = "0px";
        img.style.pointerEvents = "none";
        img.style.imageRendering = "pixelated";
        img.style.transformOrigin = "bottom center";
        img.style.width = `${Math.round(ne.w * SCALE)}px`;
        img.style.height = `${Math.round(ne.h * SCALE)}px`;
        // start hidden until positioned in the render loop
        img.style.display = "none";
        canvasEl.parentElement?.appendChild(img);
        enemyImgEls.set((ne as any).id, img);
      } catch (e) {}
    }

    // Check if player is on a trap
    function checkTrapActivation() {
      const playerTileX = Math.floor((player.x + player.w / 2) / TILE);
      const playerTileY = Math.floor((player.y + player.h - 1) / TILE);
      // Treat traps as pressure plates: they only affect deactivated walls
      // while the player stands on them. Also limit the special wall toggling
      // to level 4 (index 3) so other levels are unaffected.
      traps.forEach((trap) => {
        const trapKey = `${trap.x},${trap.y}`;
        const isPlayerOnTrap = playerTileX === trap.x && playerTileY === trap.y;

        if (isPlayerOnTrap) {
          if (!trap.active) {
            trap.active = true;
            activatedTraps.add(trapKey);
            // Toggle nearby deactivated walls (all levels)
            deactivatedWalls.forEach(wall => {
              const wallKey = `${wall.x},${wall.y}`;
              const dist = Math.hypot(wall.x - trap.x, wall.y - trap.y);
              if (dist < 10) activeDeactivatedWalls.add(wallKey);
            });
          }
        } else {
          // If the trap was active but player left, deactivate and revert walls
          if (trap.active) {
            trap.active = false;
            activatedTraps.delete(trapKey);
            deactivatedWalls.forEach(wall => {
              const wallKey = `${wall.x},${wall.y}`;
              const dist = Math.hypot(wall.x - trap.x, wall.y - trap.y);
              if (dist < 10) activeDeactivatedWalls.delete(wallKey);
            });
          }
        }
      });
    }

    // Collision detection between two rectangles
    function rectCollision(a: any, b: any): boolean {
      return a.x < b.x + b.w &&
             a.x + a.w > b.x &&
             a.y < b.y + b.h &&
             a.y + a.h > b.y;
    }

    function moveAndCollide(dt: number) {
  // Apply gravity
  player.vy += 1200 * dt;
  
  // Cap falling speed
  if (player.vy > 800) player.vy = 800;
  
  // Horizontal movement
  player.vx = 0;
  if (keys.left) player.vx = -player.speed;
  if (keys.right) player.vx = player.speed;
  if (player.vx !== 0) player.dir = Math.sign(player.vx);

  // Apply horizontal movement first
  player.x += player.vx * dt;
  
  // Horizontal collision
  const left = player.x;
  const right = player.x + player.w;
  const top = player.y;
  const bottom = player.y + player.h;

  const leftTile = Math.floor(left / TILE);
  const rightTile = Math.floor((right - 1) / TILE);
  const topTile = Math.floor(top / TILE);
  const bottomTile = Math.floor((bottom - 1) / TILE);

  // Check horizontal collision with solid tiles
  if (player.vx > 0) {
    // Moving right
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (isSolidTile(rightTile, ty)) {
        player.x = rightTile * TILE - player.w - 0.01;
        break;
      }
    }
  } else if (player.vx < 0) {
    // Moving left
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (isSolidTile(leftTile, ty)) {
        player.x = (leftTile + 1) * TILE + 0.01;
        break;
      }
    }
  }

  // Apply vertical movement
  player.y += player.vy * dt;
  
  // Reset ground state
  player.onGround = false;
  
  // Vertical collision
  const newLeftTile = Math.floor(player.x / TILE);
  const newRightTile = Math.floor((player.x + player.w - 1) / TILE);
  const newTopTile = Math.floor(player.y / TILE);
  const newBottomTile = Math.floor((player.y + player.h - 1) / TILE);

  // Check for ground collision (falling)
  if (player.vy >= 0) {
    for (let tx = newLeftTile; tx <= newRightTile; tx++) {
      const checkTileY = newBottomTile;
      
      // Check for solid ground or bridge
      if (isSolidTile(tx, checkTileY) || isBridgeTile(tx, checkTileY)) {
        player.y = checkTileY * TILE - player.h - 0.01;
        player.vy = 0;
        player.onGround = true;
        break;
      }
      
      // Additional check for being on top of a tile
      const footCheckY = Math.floor((player.y + player.h + 1) / TILE);
      if (isSolidTile(tx, footCheckY) && player.y + player.h > footCheckY * TILE - 2) {
        player.y = footCheckY * TILE - player.h - 0.01;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }
  
  // Check for ceiling collision (jumping)
  if (player.vy < 0) {
    for (let tx = newLeftTile; tx <= newRightTile; tx++) {
      if (isSolidTile(tx, newTopTile)) {
        player.y = (newTopTile + 1) * TILE + 0.01;
        player.vy = 0;
        break;
      }
    }
  }

  // Jump handling
  if (keys.up && player.onGround) {
    // Play jump sound
    try {
      const j = jumpAudioRef.current;
      if (j) {
        j.currentTime = 0;
        j.play().catch(() => {});
      }
    } catch (e) {}

    player.vy = -player.jumpForce;
    player.onGround = false;
    keys.up = false; // Consume the jump input
  }

  // Footsteps: play while moving horizontally on the ground
  try {
    const fs = footstepsAudioRef.current;
    const isMoving = Math.abs(player.vx) > 0.5 && player.onGround;
    if (fs) {
      if (isMoving && !pausedRef.current) {
        if (fs.paused) {
          fs.currentTime = 0;
          fs.play().catch(() => {});
        }
      } else {
        if (!fs.paused) fs.pause();
      }
    }
  } catch (e) {}

  // Lava handling: touching lava instantly respawns at level spawn.
  const playerTileX = Math.floor((player.x + player.w / 2) / TILE);
  const playerTileY = Math.floor((player.y + player.h - 1) / TILE);
  const tileChar = tileAt(playerTileX, playerTileY);

  if (tileChar === "L") {
    // Die in lava: reset level
    doPlayerDeathSequence("You fell in lava");
  }

  // Check traps
  checkTrapActivation();

  // Check weapon pickup
  if (weapon && !weapon.collected && rectCollision(player, weapon)) {
    weapon.collected = true;
    setHasWeapon(true);
    // give the player the base gun (sheriff skin)
    setWeaponType("sheriff");
    // If player already has max stars, prompt upgrade immediately
    if (collectedStarsRef.current >= TOTAL_STARS) setShowUpgradePrompt(true);
    // Prevent accidental immediate firing right after pickup by clearing
    // the attack intent and adding a short fire cooldown.
    try { keys.attack = false; } catch (e) {}
    try { nextShotAllowedRef.current = Date.now() + 300; } catch (e) {}
  }

  // Boss collision blocking: prevent player from passing through the boss
  try {
    if (boss) {
      const bossRect = { x: boss.x, y: boss.y, w: boss.w, h: boss.h };
      if (rectCollision(player, bossRect)) {
        const playerCenterX = player.x + player.w / 2;
        const bossCenterX = boss.x + boss.w / 2;
        // If player is falling onto the boss, allow a stomp bounce
        const playerBottom = player.y + player.h;
        if (player.vy > 0 && playerBottom - boss.y < TILE * 0.6) {
          player.y = boss.y - player.h - 0.01;
          player.vy = -player.jumpForce * 0.6;
          player.onGround = true;
        } else {
          // Side collision: push the player to the side and stop horizontal velocity
          if (playerCenterX < bossCenterX) {
            player.x = boss.x - player.w - 0.01;
          } else {
            player.x = boss.x + boss.w + 0.01;
          }
          player.vx = 0;
        }
      }
    }
  } catch (e) {}


  // Check star pickups
  stars.forEach((s) => {
    if (!s.collected && rectCollision(player, s)) {
      s.collected = true;
      setCollectedStars(cs => Math.min(TOTAL_STARS, cs + 1));
      try {
        const collect = collectAudioRef.current;
        if (collect) {
          collect.currentTime = 0;
          collect.play().catch(() => {});
        }
      } catch (e) {}
      // If this was the first-star bubble target, remove/hide its bubble
      try {
        showFirstStarBubbleRef.current = false;
        if (starBubbleEl) { starBubbleEl.remove(); starBubbleEl = null; }
      } catch (e) {}
    }
  });

  // Check finish tile (F)
  const footX = Math.floor((player.x + player.w / 2) / TILE);
  const footY = Math.floor((player.y + player.h - 1) / TILE);
  if (tileAt(footX, footY) === "F") {
    setPaused(true);
    setCompletionMessage(`Level ${levelIndex + 1} complete!`);
    try {
      const lf = levelfinishAudioRef.current;
      if (lf) {
        lf.currentTime = 0;
        lf.play().catch(() => {});
      }
    } catch (e) {}
    setTimeout(() => {
      setCompletionMessage(null);
      setPaused(false);
      if (levelIndex < levels.length - 1) {
        setLevelIndex((li) => li + 1);
      } else {
        setPaused(true);
      }
    }, 1200);
  }

  // Check reward/finish
  if (reward && rectCollision(player, reward)) {
    // Don't allow interacting with the reward until the two hostage lines
    // have been shown (they unlock the reward). Silently ignore if locked.
    if (!rewardUnlockedRef.current) {
      // still locked; do nothing
    } else {
      // If a boss exists and is still alive, don't finish the level yet.
      if (boss && boss.health > 0) {
        // Notify the player briefly that the boss must be defeated first.
        setCompletionMessage("Defeat the boss first!");
        try {
          // Pause the reward/cry audio to avoid overlapping sounds
          const cry = cryAudioRef.current;
          if (cry && !cry.paused) cry.pause();
        } catch (e) {}
        setTimeout(() => {
          setCompletionMessage(null);
        }, 1500);
      } else {
        setPaused(true);
        setCompletionMessage(`Level ${levelIndex + 1} complete!`);
        try {
          const lf = levelfinishAudioRef.current;
          if (lf) {
            lf.currentTime = 0;
            lf.play().catch(() => {});
          }
        } catch (e) {}
        setTimeout(() => {
          setCompletionMessage(null);
          setPaused(false);
          if (levelIndex < levels.length - 1) {
            setLevelIndex((li) => li + 1);
          } else {
            setPaused(true);
          }
        }, 1500);
      }
    }
  }

  // Attack enemies if weapon equipped
  // Prevent firing while a dialog is visible
  if (dialogVisibleRef.current || introActiveRef.current) {
    // block attack and movement inputs while dialog is visible so the
    // player doesn't keep moving when a dialog/cutscene pops up
    keys.attack = false;
    try { keys.left = false; keys.right = false; keys.up = false; } catch (e) {}
    try { if (player) player.vx = 0; } catch (e) {}
  }

  if (keys.attack && hasWeaponRef.current) {
    const wtype = weaponTypeRef.current || "sheriff";
    const attackRange = wtype === "sniper" ? TILE * 6 : TILE * 3;
    const attackX = player.dir > 0 ? player.x + player.w : player.x - attackRange;
    const attackW = attackRange;
    const attackH = player.h * 0.7;
    const attackY = player.y + (player.h - attackH) / 2;

    // Respect reload state and fire rate
    const now = Date.now();
    if (reloadingRef.current || now < nextShotAllowedRef.current) {
      keys.attack = false;
    } else {
      const curAmmo = ammoRef.current;
      if (curAmmo.mag <= 0) {
        keys.attack = false;
      } else {
        // consume one bullet and set cooldown
        const cooldown = wtype === 'sheriff' ? 250 : Math.round(1000 / 0.6);
        nextShotAllowedRef.current = now + cooldown;
        setAmmo({ mag: Math.max(0, curAmmo.mag - 1), reserve: curAmmo.reserve, magSize: curAmmo.magSize });
        try {
          if (wtype === 'sniper') {
            const sn = sniperShotAudioRef.current;
            if (sn) { sn.currentTime = 0; sn.play().catch(() => {}); }
          } else {
            const ss = sheriffShotAudioRef.current;
            if (ss) { ss.currentTime = 0; ss.play().catch(() => {}); }
          }
        } catch (e) {}

        // Spawn a forward-traveling tracer aimed roughly in the facing direction
        try {
          const muzzleX = (player.x || 0) + (player.w || 0) / 2;
          const muzzleY = (player.y || 0) + (player.h || 0) / 2;
          let aimX = attackX + attackW / 2;
          const aimY = attackY + attackH / 2;
          // Sheriff shots should traverse the whole map when fired forward
          if (wtype === 'sheriff') {
            aimX = player.dir > 0 ? (map[0].length * TILE) + TILE : -TILE;
          }
          const speed = wtype === 'sniper' ? 2000 : 900; // sniper faster than sheriff
          const damage = wtype === 'sniper' ? 150 : 55;
          spawnTracer(muzzleX, muzzleY, aimX, aimY, speed, damage, wtype);
        } catch (e) {}

        keys.attack = false; // Consume attack input
      }
    }
  }

  // Update enemies (Mario-like goombas walking only on '#' and '&')
  // Pause enemy updates during scripted cutscenes so only the player moves.
  if (!cutsceneActiveRef.current && !introActiveRef.current) {
    enemies.forEach(enemy => {
    // Apply gravity
    enemy.vy += 1200 * dt;
    if (enemy.vy > 800) enemy.vy = 800;

    // Horizontal intent
    const moveX = enemy.vx * enemy.dir * dt;
    enemy.x += moveX;

    // Horizontal collision against solid tiles only ('#' and '&')
    const leftTile = Math.floor(enemy.x / TILE);
    const rightTile = Math.floor((enemy.x + enemy.w - 1) / TILE);
    const topTile = Math.floor(enemy.y / TILE);
    const bottomTile = Math.floor((enemy.y + enemy.h - 1) / TILE);

    if (moveX > 0) {
      // moving right
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (isSolidTile(rightTile, ty)) {
          enemy.x = rightTile * TILE - enemy.w - 0.01;
          enemy.dir = -1; // turn around on wall
          break;
        }
      }
    } else if (moveX < 0) {
      // moving left
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (isSolidTile(leftTile, ty)) {
          enemy.x = (leftTile + 1) * TILE + 0.01;
          enemy.dir = 1; // turn around on wall
          break;
        }
      }
    }

    // Vertical movement
    enemy.y += enemy.vy * dt;
    enemy.onGround = false;

    const newLeftTile = Math.floor(enemy.x / TILE);
    const newRightTile = Math.floor((enemy.x + enemy.w - 1) / TILE);
    const newTopTile = Math.floor(enemy.y / TILE);
    const newBottomTile = Math.floor((enemy.y + enemy.h - 1) / TILE);

    // Ground collision: only treat '#' and '&' as ground
    if (enemy.vy >= 0) {
      for (let tx = newLeftTile; tx <= newRightTile; tx++) {
        if (isSolidTile(tx, newBottomTile)) {
          enemy.y = newBottomTile * TILE - enemy.h - 0.01;
          enemy.vy = 0;
          enemy.onGround = true;
          break;
        }
      }
    }

    // Ceiling collision
    if (enemy.vy < 0) {
      for (let tx = newLeftTile; tx <= newRightTile; tx++) {
        if (isSolidTile(tx, newTopTile)) {
          enemy.y = (newTopTile + 1) * TILE + 0.01;
          enemy.vy = 0;
          break;
        }
      }
    }

    // Edge detection: if the tile one step ahead below feet isn't solid (# or &), turn around
    const feetY = Math.floor((enemy.y + enemy.h + 1) / TILE);
    const aheadX = enemy.dir > 0
      ? Math.floor((enemy.x + enemy.w + 1) / TILE)
      : Math.floor((enemy.x - 1) / TILE);
    const groundAheadSolid = isSolidTile(aheadX, feetY);
    const wallAheadSolid = isSolidTile(aheadX, feetY - 1);
    if (!groundAheadSolid || wallAheadSolid) {
      enemy.dir *= -1;
    }

    // Check if enemy is standing on lava: remove and schedule respawn
    const enemyTileX = Math.floor((enemy.x + enemy.w / 2) / TILE);
    const enemyTileY = Math.floor((enemy.y + enemy.h - 1) / TILE);
    if (tileAt(enemyTileX, enemyTileY) === "L") {
      // Remove this enemy from the game and schedule respawn (30s)
      const idx = enemies.indexOf(enemy);
      if (idx !== -1) {
        const removed = enemies.splice(idx, 1)[0];
        // remove its DOM sprite if present
        const rid = (removed as any).id;
        if (rid && enemyImgEls.has(rid)) {
          const iel = enemyImgEls.get(rid)!;
          iel.remove();
          enemyImgEls.delete(rid);
        }
        const timer = window.setTimeout(() => {
          // respawn with DOM sprite
          spawnEnemyWithSprite(removed.spawnTX, removed.spawnTY);
        }, 30000);
        enemyRespawnTimers.push(timer);
      }
      return; // stop processing this enemy
    }
    });
  }

  if (boss) {
    // While a cutscene is active (not finished), the boss should remain
    // stationary and not perform its normal movement logic. Allow movement
    // if boss was explicitly enabled or when not on the boss level/cutscene.
    // If the player is holding the sheriff and has no bullets (mag=0 and reserve=0),
    // freeze the boss in place until ammo is available again.
    const sheriffEmpty = weaponTypeRef.current === 'sheriff' && ammoRef.current && ammoRef.current.mag === 0 && ammoRef.current.reserve === 0;
    const sniperUpgradeJustHappened = weaponTypeRef.current === 'sniper' && !bossCanMoveRef.current; // Add this check
    
    if (boss.canFall) {
        // FIX: Apply stronger gravity for dramatic fall
        boss.vy += 1800 * dt; // Increased gravity
        boss.y += boss.vy * dt; // Apply vertical movement
        
        // FIX: Update boss DOM image position if it exists
        try {
            if (bossImgEl) {
                // Position the DOM image to match the falling boss
                const sx = Math.round((boss.x - camera.x) * SCALE);
                const sy = Math.round((boss.y - camera.y) * SCALE);
                const w = Math.round(boss.w * SCALE);
                const h = Math.round(boss.h * SCALE);
                bossImgEl.style.left = `${sx}px`;
                bossImgEl.style.top = `${sy}px`;
                bossImgEl.style.width = `${w}px`;
                bossImgEl.style.height = `${h}px`;
                bossImgEl.style.display = 'block';
                bossImgEl.style.zIndex = '3';
            }
        } catch (e) {}
        
        // FIX: Better lava collision detection - check multiple points
        const bossLeftX = Math.floor(boss.x / TILE);
        const bossRightX = Math.floor((boss.x + boss.w - 1) / TILE);
        const bossBottomY = Math.floor((boss.y + boss.h - 1) / TILE);
        
        let hitLava = false;
        // Check across the width of the boss
        for (let tx = bossLeftX; tx <= bossRightX; tx++) {
            if (tileAt(tx, bossBottomY) === "L") {
                hitLava = true;
                break;
            }
        }
        
        if (hitLava) {
            // Boss has hit lava - remove it
            try {
                if (bossImgEl) { 
                    bossImgEl.remove(); 
                    bossImgEl = null; 
                }
            } catch (e) {}
            
            boss = null;
            setBossHealth(0);
            bossHealthRef.current = 0;

            // FIX: If player is already dying/dead, prioritize player death logic and abort victory.
            if (deathActiveRef.current) return;

            try { const cr = cryAudioRef.current; if (cr && !cr.paused) { cr.pause(); try { cr.currentTime = 0; } catch (e) {} } } catch (e) {}
            // Remove cutter from player after boss defeated
            try { cutterGivenRef.current = false; } catch (e) {}
            try { if (weaponSpriteRef.current) { weaponSpriteRef.current.style.display = 'none'; } } catch (e) {}
            try { setHasWeapon(false); } catch (e) {}
            try { setWeaponType(null); } catch (e) {}
            try { hasWeaponRef.current = false; } catch (e) {}
            try { weaponTypeRef.current = null; } catch (e) {}
            try { setAmmo({ mag: 0, reserve: 0, magSize: ammoRef.current?.magSize || 6 }); } catch (e) {}
            try { showSheriffBubbleRef.current = false; } catch (e) {}
            try {
              // Stop boss music immediately
              const bg = bgAudioRef.current;
              if (bg) { try { bg.pause(); bg.currentTime = 0; } catch (e) {} }
            } catch (e) {}

            // FIX: Wait 3 seconds before showing "Did you get him?" dialogue
            setTimeout(() => {
              // Double check if player died during the wait
              if (deathActiveRef.current) return;

              try { setPaused(false); } catch (e) {}
              try { setCutsceneActive(false); } catch (e) {}

              // Open the small end-of-boss dialog but DO NOT pause the game
              try {
                const endDialog = [
                  { speaker: 'Hostage', text: 'Did you get him?', img: '/images/bananacatheart.png' },
                  { speaker: 'Boss', text: '...', img: '/others/catbossmain.gif' },
                  { speaker: 'Banana Cat', text: 'Yes, I did!!', img: '/others/bananacat.gif' },
                ];

                startCustomDialog(endDialog, () => {
                  // Play happy sound (low volume)
                  try { const happy = new Audio('/sounds/happy.mp3'); happy.preload = 'auto'; happy.volume = 0.05; happy.play().catch(() => {}); } catch (e) {}

                  // Change player frozen sprite to happycat (looping GIF)
                    try {
                      if (playerSpriteRef.current) {
                        playerSpriteRef.current.src = '/others/happycat.gif';
                        try { playerSpriteRef.current.style.display = 'block'; } catch (e) {}
                      }
                      try { freezePlayerAnimRef.current = false; } catch (e) {}
                      try { happyScale = 1.6; } catch (e) {}
                    } catch (e) {}

                  // Replace map reward/hostage GIF with heart PNG and start flipping both map + dialog images
                  try {
                    if (rewardImgEl) rewardImgEl.src = '/images/bananacatheart.png';
                    if (celebrationFlipInterval) { clearInterval(celebrationFlipInterval); celebrationFlipInterval = null; }
                    let flipped = false;
                    const canvasEl = canvasRef.current;
                    celebrationFlipInterval = window.setInterval(() => {
                      flipped = !flipped;
                      try { if (rewardImgEl) rewardImgEl.style.transform = flipped ? 'scaleX(-1)' : 'scaleX(1)'; } catch (e) {}
                      try {
                        const dlgImg = canvasEl?.parentElement?.querySelector('div[role="button"] img') as HTMLImageElement | null;
                        if (dlgImg) {
                          dlgImg.style.transform = flipped ? 'scaleX(-1)' : 'scaleX(1)';
                          try { if (dlgImg.src && dlgImg.src.indexOf('/others/catcry.gif') !== -1) dlgImg.src = '/images/bananacatheart.png'; } catch (e) {}
                        }
                      } catch (e) {}
                    }, 2000) as unknown as number;
                  } catch (e) {}

                  try { setCompletionMessage('Level 5 complete!'); } catch (e) {}

                  // After 4s, fade to black over 5 seconds and then show "The End"
                  try {
                    setBlackOverlay(true);
                    setBlackOverlayOpacity(0);
                    setTimeout(() => {
                      let op = 0;
                      const fadeInt = window.setInterval(() => {
                        op += 0.02;
                        if (op > 1) op = 1;
                        try { setBlackOverlayOpacity(op); } catch (e) {}
                              if (op >= 1) {
                                clearInterval(fadeInt);
                                try { setCompletionMessage(null); } catch (e) {}
                                try { setShowEndScreen(true); } catch (e) {}
                              }
                      }, 100);
                    }, 4000);
                  } catch (e) {}
                });
              } catch (e) {}
            }, 3000); // End of 3 second delay
        }
    } else if (!cutsceneActiveRef.current && (bossCanMoveRef.current || levelIndex !== 4 || level5CutsceneDoneRef.current) && !introActiveRef.current && !(sheriffEmpty && !bossCanMoveRef.current) && !sniperUpgradeJustHappened) {
        // Original horizontal movement logic...
        boss.x += boss.vx * boss.dir * dt;

        const groundY = Math.floor((boss.y + boss.h + 1) / TILE);
        const nextX = boss.dir > 0 
            ? Math.floor((boss.x + boss.w + 1) / TILE)
            : Math.floor((boss.x - 1) / TILE);

        const groundAhead = isSolidTile(nextX, groundY) || isBridgeTile(nextX, groundY);
        const wallAhead = isSolidTile(nextX, groundY - 1);

        if (!groundAhead || wallAhead) {
            boss.dir *= -1;
        }
    }
}

  // Proximity sound for enemies: if any enemy is within 10 tiles, play `sounds/yapapa.mp3`
  try {
    const yap = yapapaAudioRef.current;
    if (yap) {
      const maxTiles = 10;
      const maxDist = maxTiles * TILE;
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      let nearest = Infinity;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const d = Math.hypot(ex - px, ey - py);
        if (d < nearest) nearest = d;
      }

      // If nearest enemy within range, set volume proportional to proximity
      if (nearest <= maxDist && !pausedRef.current && audioAllowedRef.current && !introActiveRef.current) {
        // loudness falls off with distance (quadratic for nicer curve)
        const t = Math.max(0, 1 - nearest / maxDist);
        const vol = Math.min(YAP_MAX, YAP_MAX * (t * t));
        yap.volume = vol;
        if (yap.paused) yap.play().catch(() => {});
      } else {
        // Too far or paused: fade out and pause
        yap.volume = 0;
        if (!yap.paused) yap.pause();
      }
    }
  } catch (e) {}

  // Player vs Enemy interactions
  // - Side hit: respawn player at S (like lava)
  // - Stomp from above while falling: kill enemy, respawn after 30s
  const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
  enemies.forEach((enemy, idx) => {
    if (introActiveRef.current) return; // Skip enemy interactions during intro
    
    const enemyRect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
    if (!rectCollision(playerRect, enemyRect)) return;

    const playerBottom = player.y + player.h;
    const enemyTop = enemy.y;
    const isFalling = player.vy > 0;

    // Check stomp: player is falling and their bottom is above enemy top by a small margin
    if (isFalling && playerBottom - enemyTop < TILE * 0.5) {
      // Place player on top of enemy and bounce
      player.y = enemyTop - player.h - 0.01;
      player.vy = -player.jumpForce * 0.6;
      player.onGround = true;

      // Remove enemy
      const removed = enemies.splice(idx, 1)[0];
      if (removed) {
        const rid = (removed as any).id;

        // Play cat death sound
        try {
          const cd = catdedAudioRef.current;
          if (cd) {
            cd.currentTime = 0;
            cd.play().catch(() => {});
          }
        } catch (e) {}

        // Show death GIF where the enemy was. If the enemy has a DOM
        // image (animated GIF), reuse it by swapping src; otherwise
        // create a temporary DOM image positioned over the canvas.
        const showTime = 1200; // ms to show the death animation
        if (rid && enemyImgEls.has(rid)) {
          const iel = enemyImgEls.get(rid)!;
          try {
            // Clone the existing sprite and use the clone for the death GIF so
            // the game's sprite manager (which hides images for removed
            // enemies) doesn't immediately hide it. Remove the original
            // element from the managed map so the render loop no longer
            // controls it.
            const clone = iel.cloneNode(true) as HTMLImageElement;
            clone.src = '/others/catshock.gif';
            clone.style.zIndex = '3';
            clone.style.display = 'block';
            canvasEl.parentElement?.appendChild(clone);
            // remove original from DOM and map so engine stops updating it
            try { iel.remove(); } catch (e) {}
            enemyImgEls.delete(rid);

            // Remove clone after animation finishes
            const removeTimer = window.setTimeout(() => {
              try { clone.remove(); } catch (e) {}
            }, showTime);
            enemyRespawnTimers.push(removeTimer);
          } catch (e) {}
        } else {
          try {
            const temp = document.createElement('img');
            temp.src = '/others/catshock.gif';
            temp.draggable = false;
            temp.style.position = 'absolute';
            temp.style.left = `${Math.round((removed.x - camera.x) * SCALE)}px`;
            temp.style.top = `${Math.round((removed.y - camera.y) * SCALE)}px`;
            temp.style.width = `${Math.round(removed.w * SCALE)}px`;
            temp.style.height = `${Math.round(removed.h * SCALE)}px`;
            temp.style.pointerEvents = 'none';
            temp.style.imageRendering = 'pixelated';
            temp.style.transformOrigin = 'bottom center';
            temp.style.zIndex = '3';
            canvasEl.parentElement?.appendChild(temp);
            const removeTimer = window.setTimeout(() => {
              try { temp.remove(); } catch (e) {}
            }, showTime);
            enemyRespawnTimers.push(removeTimer);
          } catch (e) {}
        }

        // Schedule respawn in 30 seconds on the same level (with DOM sprite)
        const timer = window.setTimeout(() => {
          spawnEnemyWithSprite(removed.spawnTX, removed.spawnTY);
        }, 30000);
        enemyRespawnTimers.push(timer);
      }
      } else {
      // Side hit by enemy: treat as death and play death sequence
      doPlayerDeathSequence("You were hit by an enemy");
    }
  });
}

    // Draw functions
    // Player sprite handled as a DOM <img> over the canvas for GIF animation
    const playerImgEl = playerSpriteRef.current;
    const weaponDomEl = weaponSpriteRef.current;
    // Enemy sprite (drawn into canvas). Load the GIF from public `others`.
    const enemyImg = new Image();
    enemyImg.src = "/others/yapapa.gif";
    // Boss face image (main boss portrait used during boss encounters and cutscenes)
    const bossImg = new Image();
    bossImg.src = "/others/catbossmain.gif";
    // Star image for `P` collectibles
    const starImg = new Image();
    starImg.src = "/images/star.png";
    // Reward GIF for `R`
    const rewardImg = new Image();
    rewardImg.src = "/others/catcry.gif";
    // Weapon images: base pickup (sheriff) and upgraded sniper
    const weaponImg = new Image();
    weaponImg.src = "/images/sheriff.webp";
    const sniperImg = new Image();
    sniperImg.src = "/images/sniper.png";
    const cutterImg = new Image();
    cutterImg.src = "/images/cutter.png";
    // Tile drawing cache to avoid expensive per-frame drawing for repeated tiles
    const tileCache = new Map<string, HTMLCanvasElement>();

    function drawTile(ctx: CanvasRenderingContext2D, t: string, sx: number, sy: number) {
      // Draw based on tile type
      if (t === "#") {
        // Compute tile coords for exposure checks (camera is in scope)
        const tx = Math.floor((sx + camera.x) / TILE);
        const ty = Math.floor((sy + camera.y) / TILE);
        const aboveTile = tileAt(tx, ty - 1);
        const showMoss = !isSolidTile(tx, ty - 1) && !isBridgeTile(tx, ty - 1) && aboveTile !== "L";

        // Use a small deterministic variant index so adjacent tiles look varied
        const variant = showMoss ? ((tx * 31 + ty * 17) & 3) : 0;
        const cacheKey = showMoss ? `#_m_${variant}` : `#_n`;
        // If cached, draw and return
        if (tileCache.has(cacheKey)) {
          const cached = tileCache.get(cacheKey)!;
          ctx.drawImage(cached, sx, sy, TILE, TILE);
          return;
        }

        // Create offscreen canvas to render the detailed tile once
        const off = document.createElement("canvas");
        off.width = TILE;
        off.height = TILE;
        const octx = off.getContext("2d") as CanvasRenderingContext2D;

        // Natural dirt: soil layers, pebbles and subtle roots
        // layered soil gradient for a more organic look
        const baseGrad = octx.createLinearGradient(0, 0, 0, TILE);
        baseGrad.addColorStop(0, "#7a522e");
        baseGrad.addColorStop(0.45, "#6b4326");
        baseGrad.addColorStop(0.9, "#5a381f");
        octx.fillStyle = baseGrad;
        octx.fillRect(0, 0, TILE, TILE);

        // Slight horizontal strata lines to suggest soil layering
        const layers = 3;
        for (let i = 0; i < layers; i++) {
          const y = Math.floor((TILE * 0.3) + (i * (TILE * 0.55 / layers)));
          octx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
          octx.fillRect(0, y, TILE, 2);
        }

        // Deterministic pseudo-random generator for pebbles and roots
        let seed = ((tx & 255) << 8) ^ (ty & 255) ^ (variant << 4);
        function rnd() {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return (seed & 0xffff) / 0xffff;
        }

        // scattered pebbles (subtle / mostly hidden)
        // Fewer, smaller, lower-contrast pebbles placed in the lower
        // portion of the tile to make them look embedded in the soil.
        const pebbleCount = 1 + Math.floor(rnd() * 3); // 1-3 pebbles
        for (let p = 0; p < pebbleCount; p++) {
          const px = Math.floor(2 + rnd() * (TILE - 4));
          // keep pebbles toward the lower half so they appear buried
          const py = Math.floor((TILE * 0.55) + rnd() * (TILE * 0.35));
          const pr = 0.6 + rnd() * 1.4; // smaller radii
          const alpha = 0.22 + rnd() * 0.38; // low alpha to hide most
          const color = rnd() > 0.6 ? `rgba(158,141,122,${alpha.toFixed(2)})` : `rgba(111,91,74,${alpha.toFixed(2)})`;
          octx.fillStyle = color;
          octx.beginPath();
          // Slight random offset/ellipse shape for variety
          octx.ellipse(px + (rnd() - 0.5) * 1.5, py + (rnd() - 0.5) * 1.5, pr, pr * 0.8, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
          octx.fill();
        }

        // subtle root strands
        octx.strokeStyle = "rgba(40,20,10,0.3)";
        octx.lineWidth = 1;
        const rootCount = 2 + Math.floor(rnd() * 3);
        for (let r = 0; r < rootCount; r++) {
          const sxr = Math.floor(rnd() * TILE);
          octx.beginPath();
          octx.moveTo(sxr, Math.floor(TILE * 0.25));
          const cx = sxr + (rnd() > 0.5 ? 6 : -6);
          octx.quadraticCurveTo(cx, Math.floor(TILE * 0.45), sxr + Math.floor((rnd() - 0.5) * 4), TILE - 4);
          octx.stroke();
        }

        // Top grass/moss band if exposed
        if (showMoss) {
          const ggrad = octx.createLinearGradient(0, 0, 0, 10);
          ggrad.addColorStop(0, "#76c96c");
          ggrad.addColorStop(0.6, "#4caf50");
          ggrad.addColorStop(1, "#2f7b2a");
          octx.fillStyle = ggrad;
          octx.fillRect(0, 0, TILE, 10);

          // blades and clumps based on variant
          octx.fillStyle = "#2d7a2b";
          octx.strokeStyle = "#1e5e1c"; octx.lineWidth = 1;
          if (variant === 0) {
            octx.beginPath(); octx.moveTo(4, 8); octx.lineTo(6, 2); octx.lineTo(8, 8); octx.fill();
            octx.beginPath(); octx.moveTo(14, 8); octx.lineTo(16, 3); octx.lineTo(18, 8); octx.fill();
          } else if (variant === 1) {
            octx.beginPath(); octx.moveTo(6, 9); octx.quadraticCurveTo(8, 2, 10, 9); octx.fill();
            octx.beginPath(); octx.moveTo(18, 9); octx.quadraticCurveTo(20, 3, 22, 9); octx.fill();
          } else if (variant === 2) {
            octx.beginPath(); octx.ellipse(8, 6, 4, 3, 0, Math.PI, 2 * Math.PI); octx.fill();
            octx.beginPath(); octx.ellipse(20, 6, 4, 3, 0, Math.PI, 2 * Math.PI); octx.fill();
          } else {
            octx.beginPath(); octx.moveTo(3, 9); octx.lineTo(6, 3); octx.lineTo(9, 9); octx.fill();
            octx.beginPath(); octx.moveTo(15, 9); octx.lineTo(18, 4); octx.lineTo(21, 9); octx.fill();
          }
        }

        // Bottom shadow to ground the block
        octx.fillStyle = "rgba(0,0,0,0.22)";
        octx.fillRect(0, TILE - 5, TILE, 5);

        // Cache and draw
        tileCache.set(cacheKey, off);
        ctx.drawImage(off, sx, sy, TILE, TILE);
        return;
      } else if (t === "&") {
        // Deactivated wall (only visible when not active)
        const wallKey = `${Math.floor(sx/TILE + camera.x/TILE)},${Math.floor(sy/TILE + camera.y/TILE)}`;
        if (!activeDeactivatedWalls.has(wallKey)) {
          ctx.fillStyle = "#a1887f";
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = "#8d6e63";
          ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
        }
      } else if (t === "L") {
          // Lava: on level 5 (index 4) render as a full lava tile; otherwise
          // render bottom-half lava (half-block look).
          const isFullLavaLevel = levelIndex === levels.length - 1;
          if (isFullLavaLevel) {
            // Full tile lava
            ctx.fillStyle = "#ff5722";
            ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = "#ff9800";
            ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
          } else {
            // Half-tile lava (visual only)
            ctx.fillStyle = "#9ad3ff";
            ctx.fillRect(sx, sy, TILE, TILE / 2);
            // Bottom half: lava base
            ctx.fillStyle = "#ff5722";
            ctx.fillRect(sx, sy + TILE / 2, TILE, TILE / 2);
            // Inner lava highlight
            ctx.fillStyle = "#ff9800";
            ctx.fillRect(sx + 4, sy + TILE / 2 + 4, TILE - 8, TILE / 2 - 8);
          }
      } else if (t === "C") {
        // Cutter post / rope anchor (visual only; becomes passable after cut)
        // Draw a wooden post in the center and thin rope lines to neighboring
        // bridge tiles so it visually connects to the bridge.
        const tx = Math.floor((sx + camera.x) / TILE);
        const ty = Math.floor((sy + camera.y) / TILE);
        // post
        ctx.fillStyle = "#6b4226";
        ctx.fillRect(sx + TILE * 0.38, sy + TILE * 0.12, TILE * 0.24, TILE * 0.76);
        // rope to left/right (look for adjacent bridge tiles)
        ctx.strokeStyle = "#a0784f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (tileAt(tx - 1, ty) === "-") ctx.moveTo(sx + TILE * 0.35, sy + TILE * 0.28), ctx.lineTo(sx - TILE * 0.5, sy + TILE * 0.28);
        if (tileAt(tx + 1, ty) === "-") ctx.moveTo(sx + TILE * 0.65, sy + TILE * 0.28), ctx.lineTo(sx + TILE * 1.5, sy + TILE * 0.28);
        ctx.stroke();
        // If a cut is in-progress, draw progress bar on the post
        try {
          const ct = cTileRef.current;
          if (ct && ct.x === tx && ct.y === ty && !ct.cut && ct.progress > 0) {
            const pw = Math.round(TILE * 0.6);
            const ph = 6;
            const px = sx + Math.round((TILE - pw) / 2);
            const py = sy + TILE - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(px, py, pw, ph);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(px + 1, py + 1, Math.max(0, Math.round((pw - 2) * (ct.progress / 1))), ph - 2);
          }
        } catch (e) {}
      } else if (t === "-") {
        // Bridge
        ctx.fillStyle = "#8d6e63";
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = "#6d4c41";
        ctx.fillRect(sx, sy + 2, TILE, 4);
        ctx.fillRect(sx, sy + 10, TILE, 4);
      } else if (t === "T") {
        // Trap
        const trapKey = `${Math.floor(sx/TILE + camera.x/TILE)},${Math.floor(sy/TILE + camera.y/TILE)}`;
        ctx.fillStyle = activatedTraps.has(trapKey) ? "#4caf50" : "#ff9800";
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = "#333";
        ctx.fillRect(sx + 8, sy + 8, TILE - 16, TILE - 16);
      } else if (t === "F") {
        // Finish flag
        ctx.fillStyle = "#8b8b8b";
        ctx.fillRect(sx + TILE / 2 - 2, sy + 4, 4, TILE - 8);
        ctx.fillStyle = "#ff2d55";
        ctx.fillRect(sx + TILE / 2 + 2, sy + 6, TILE / 2 - 4, TILE / 3);

        // Add this to the drawTile function after the existing tile cases
      } else if (t === "@") {
          // Dirt wall that can be passable - decorative wall that doesn't block movement
          const variant = ((Math.floor(sx/TILE + camera.x/TILE) * 17 + Math.floor(sy/TILE + camera.y/TILE) * 13) & 3);
          const cacheKey = `@_${variant}`;
          
          if (tileCache.has(cacheKey)) {
              const cached = tileCache.get(cacheKey)!;
              ctx.drawImage(cached, sx, sy, TILE, TILE);
              return;
          }
          
          // Create offscreen canvas for the passable dirt wall
          const off = document.createElement("canvas");
          off.width = TILE;
          off.height = TILE;
          const octx = off.getContext("2d") as CanvasRenderingContext2D;
          
          // Base dirt color (lighter than solid walls)
          const baseGrad = octx.createLinearGradient(0, 0, 0, TILE);
          baseGrad.addColorStop(0, "#8a6d4b");
          baseGrad.addColorStop(0.45, "#7a5d3b");
          baseGrad.addColorStop(0.9, "#6a4d2b");
          octx.fillStyle = baseGrad;
          octx.fillRect(0, 0, TILE, TILE);
          
          // Subtle horizontal layers to suggest loose dirt
          for (let i = 0; i < 4; i++) {
              const y = Math.floor((TILE * 0.2) + (i * (TILE * 0.6 / 4)));
              octx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
              octx.fillRect(0, y, TILE, 1);
          }
          
          // Random seed for consistent pebble placement
          const tx = Math.floor((sx + camera.x) / TILE);
          const ty = Math.floor((sy + camera.y) / TILE);
          let seed = ((tx & 255) << 8) ^ (ty & 255) ^ (variant << 6);
          function rnd() {
              seed = (seed * 1664525 + 1013904223) >>> 0;
              return (seed & 0xffff) / 0xffff;
          }
          
          // Scattered pebbles (more visible than in solid walls)
          const pebbleCount = 2 + Math.floor(rnd() * 4);
          for (let p = 0; p < pebbleCount; p++) {
              const px = Math.floor(2 + rnd() * (TILE - 4));
              const py = Math.floor((TILE * 0.3) + rnd() * (TILE * 0.6));
              const pr = 0.8 + rnd() * 2.0;
              const alpha = 0.35 + rnd() * 0.4;
              const color = rnd() > 0.5 ? `rgba(178,157,132,${alpha.toFixed(2)})` : `rgba(131,111,94,${alpha.toFixed(2)})`;
              octx.fillStyle = color;
              octx.beginPath();
              octx.ellipse(px + (rnd() - 0.5) * 1.5, py + (rnd() - 0.5) * 1.5, pr, pr * 0.8, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
              octx.fill();
          }
          
          // Small root or vine decorations (subtle)
          octx.strokeStyle = "rgba(80,60,40,0.4)";
          octx.lineWidth = 1;
          const rootCount = 1 + Math.floor(rnd() * 2);
          for (let r = 0; r < rootCount; r++) {
              const sxr = Math.floor(rnd() * TILE);
              octx.beginPath();
              octx.moveTo(sxr, Math.floor(TILE * 0.15));
              const cx = sxr + (rnd() > 0.5 ? 4 : -4);
              octx.quadraticCurveTo(cx, Math.floor(TILE * 0.4), sxr + Math.floor((rnd() - 0.5) * 3), TILE - 6);
              octx.stroke();
          }
          
          // Crack pattern to suggest it's breakable/passable
          octx.strokeStyle = "rgba(60,40,20,0.3)";
          octx.lineWidth = 1;
          octx.beginPath();
          if (variant === 0) {
              octx.moveTo(6, 6);
              octx.lineTo(TILE - 6, TILE - 6);
          } else if (variant === 1) {
              octx.moveTo(TILE - 6, 6);
              octx.lineTo(6, TILE - 6);
          } else if (variant === 2) {
              octx.moveTo(TILE/2, 6);
              octx.lineTo(TILE/2, TILE - 6);
          } else {
              octx.moveTo(6, TILE/2);
              octx.lineTo(TILE - 6, TILE/2);
          }
          octx.stroke();
          
          // Bottom shadow (lighter than solid walls)
          octx.fillStyle = "rgba(0,0,0,0.12)";
          octx.fillRect(0, TILE - 4, TILE, 4);
          
          // Cache and draw
          tileCache.set(cacheKey, off);
          ctx.drawImage(off, sx, sy, TILE, TILE);
      } else if (t === "K") {
        // Half-block big rock - decorative obstacle that doesn't block movement
        const variant = ((Math.floor(sx/TILE + camera.x/TILE) * 19 + Math.floor(sy/TILE + camera.y/TILE) * 7) & 3);
        const cacheKey = `K_${variant}`;
        
        if (tileCache.has(cacheKey)) {
            const cached = tileCache.get(cacheKey)!;
            ctx.drawImage(cached, sx, sy, TILE, TILE);
            return;
        }
        
        // Create offscreen canvas for the half-block rock
        const off = document.createElement("canvas");
        off.width = TILE;
        off.height = TILE;
        const octx = off.getContext("2d") as CanvasRenderingContext2D;
        
        // Rock is only half the tile height (bottom half)
        const rockHeight = TILE / 2;
        const rockTop = TILE - rockHeight;
        
        // Rock base gradient - gray stone colors
        const rockGrad = octx.createLinearGradient(0, rockTop, 0, TILE);
        rockGrad.addColorStop(0, "#6b6b6b");
        rockGrad.addColorStop(0.3, "#5a5a5a");
        rockGrad.addColorStop(1, "#4a4a4a");
        octx.fillStyle = rockGrad;
        
        // Draw rounded rock shape (wider at bottom)
        octx.beginPath();
        const curve = 8; // Corner rounding
        
        // Top curve (more rounded)
        octx.moveTo(curve, rockTop);
        octx.quadraticCurveTo(0, rockTop + curve/2, 0, rockTop + curve);
        octx.lineTo(0, TILE - curve);
        
        // Bottom left corner
        octx.quadraticCurveTo(0, TILE, curve, TILE);
        octx.lineTo(TILE - curve, TILE);
        
        // Bottom right corner
        octx.quadraticCurveTo(TILE, TILE, TILE, TILE - curve);
        octx.lineTo(TILE, rockTop + curve);
        
        // Top right corner
        octx.quadraticCurveTo(TILE, rockTop, TILE - curve, rockTop);
        octx.closePath();
        octx.fill();
        
        // Rock texture - subtle grain
        const tx = Math.floor((sx + camera.x) / TILE);
        const ty = Math.floor((sy + camera.y) / TILE);
        let seed = ((tx & 255) << 8) ^ (ty & 255) ^ (variant << 8);
        function rnd() {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return (seed & 0xffff) / 0xffff;
        }
        
        // Mineral veins and speckles
        const veinCount = 2 + Math.floor(rnd() * 3);
        for (let v = 0; v < veinCount; v++) {
            const startX = Math.floor(rnd() * TILE);
            const startY = rockTop + Math.floor(rnd() * rockHeight);
            const length = 4 + Math.floor(rnd() * 8);
            const thickness = 0.5 + rnd() * 1.5;
            const angle = (rnd() - 0.5) * Math.PI * 0.3;
            
            octx.save();
            octx.translate(startX, startY);
            octx.rotate(angle);
            
            // Vein color variations
            const veinColors = [
                "rgba(150, 180, 220, 0.4)",  // Quartz-like
                "rgba(200, 170, 120, 0.35)", // Iron-like
                "rgba(180, 200, 180, 0.3)",  // Mineral
                "rgba(220, 150, 150, 0.25)", // Rust-like
            ];
            octx.strokeStyle = veinColors[Math.floor(rnd() * veinColors.length)];
            octx.lineWidth = thickness;
            octx.lineCap = "round";
            
            octx.beginPath();
            octx.moveTo(0, 0);
            octx.lineTo(length, 0);
            octx.stroke();
            octx.restore();
        }
        
        // Rock speckles (small mineral spots)
        const speckleCount = 5 + Math.floor(rnd() * 10);
        for (let s = 0; s < speckleCount; s++) {
            const spx = Math.floor(rnd() * TILE);
            const spy = rockTop + Math.floor(rnd() * rockHeight);
            const spr = 0.5 + rnd() * 1.5;
            
            const speckleColors = [
                "rgba(255, 255, 255, 0.6)",  // Quartz
                "rgba(255, 220, 120, 0.5)",  // Pyrite
                "rgba(200, 150, 255, 0.4)",  // Amethyst
                "rgba(150, 255, 150, 0.3)",  // Malachite
            ];
            octx.fillStyle = speckleColors[Math.floor(rnd() * speckleColors.length)];
            octx.beginPath();
            octx.arc(spx, spy, spr, 0, Math.PI * 2);
            octx.fill();
        }
        
        // Moss or lichen on top of rock (darker area)
        octx.fillStyle = "rgba(80, 100, 60, 0.25)";
        octx.beginPath();
        const mossWidth = TILE - 4;
        const mossHeight = 3;
        octx.roundRect(2, rockTop - 1, mossWidth, mossHeight + 1, 2);
        octx.fill();
        
        // Top highlight (subtle)
        const highlightGrad = octx.createLinearGradient(0, rockTop, 0, rockTop + 6);
        highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
        highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        octx.fillStyle = highlightGrad;
        octx.beginPath();
        octx.moveTo(curve, rockTop);
        octx.quadraticCurveTo(TILE/2, rockTop + 1, TILE - curve, rockTop);
        octx.lineTo(TILE - curve, rockTop + 6);
        octx.quadraticCurveTo(TILE/2, rockTop + 5, curve, rockTop + 6);
        octx.closePath();
        octx.fill();
        
        // Shadow under the rock (ground contact)
        octx.fillStyle = "rgba(0, 0, 0, 0.2)";
        octx.beginPath();
        octx.moveTo(0, TILE);
        octx.quadraticCurveTo(TILE/2, TILE - 2, TILE, TILE);
        octx.lineTo(TILE, TILE + 2);
        octx.quadraticCurveTo(TILE/2, TILE, 0, TILE + 2);
        octx.closePath();
        octx.fill();
        
        // Cache and draw
        tileCache.set(cacheKey, off);
        ctx.drawImage(off, sx, sy, TILE, TILE);
      } else {
        // Empty/background: leave transparent so the parallax background
        // (drawBackground) shows through sky areas. We intentionally do
        // not paint a solid rect here.
      }
    }

    function drawPlayer(ctx: CanvasRenderingContext2D, p: any) {
      const px = Math.round(p.x);
      const py = Math.round(p.y);

      // If a death overlay is active, keep the player invisible entirely
      if (deathActiveRef.current) {
        try {
          if (playerImgEl) playerImgEl.style.display = 'none';
          const overlay = playerOverlayRef.current;
          if (overlay) overlay.style.display = 'none';
        } catch (e) {}
        return;
      }

      // Position and flip the DOM GIF sprite relative to camera
      if (playerImgEl) {
        const sx = Math.round((px - camera.x) * SCALE);
        const sy = Math.round((py - camera.y) * SCALE);
        const w = Math.round(p.w * SCALE);
        const h = Math.round(p.h * SCALE);

        const overlay = playerOverlayRef.current;
        const isRight = p.dir > 0;

        // Determine whether the player is moving (small threshold).
        // Treat scripted walk requests as movement so the DOM GIF
        // animates while the player is being moved by the script.
        const moving = Math.abs(p.vx || 0) > 0.5 || (scriptedWalkRemainingRef.current > 0) || (introWalkRemainingRef.current > 0);
        // If the player is standing on the spawn 'S' tile in level 5 (index 4)
        // we want the GIF to stop even during cutscenes. Compute the tile
        // beneath the player's feet and check the map. `map` and `levelIndex`
        // are in-scope from the outer effect and remain current because the
        // enclosing effect re-runs when `levelIndex` changes.
        let standingOnSpawnS = false;
        try {
          const footX = Math.floor((p.x + (p.w || 0) / 2) / TILE);
          const footY = Math.floor((p.y + (p.h || 0) - 1) / TILE);
          if (levelIndex === 4 && map && map[footY] && map[footY][footX] === "S") {
            standingOnSpawnS = true;
          }
        } catch (e) {}

          // During scripted cutscenes we usually keep the animated GIF active
          // even when stationary; however, if we're on the level-5 spawn 'S'
          // tile we explicitly freeze the sprite. After the boss is defeated
          // we want the GIF to always animate (not freeze) even when standing.
          const bossDefeated = (levelIndex === 4) && (!boss || bossHealthRef.current <= 0);
          const showAnimated = bossDefeated || moving || 
        (cutsceneActiveRef.current && !standingOnSpawnS && !freezePlayerAnimRef.current) || 
        (introActiveRef.current && !freezePlayerAnimRef.current);

        if (showAnimated) {
          // Show animated GIF
          playerImgEl.style.left = `${sx}px`;
          playerImgEl.style.top = `${sy}px`;
          playerImgEl.style.width = `${w}px`;
          playerImgEl.style.height = `${h}px`;
          playerImgEl.style.transformOrigin = "bottom center";
          // Apply celebration scale when happy; keep horizontal flip behavior
          try {
            const extraScale = (typeof happyScale !== 'undefined' && happyScale && happyScale > 0) ? happyScale : 1;
            playerImgEl.style.transform = isRight ? `scaleX(-1) scale(${extraScale})` : `scaleX(1) scale(${extraScale})`;
          } catch (e) {
            playerImgEl.style.transform = isRight ? "scaleX(-1)" : "scaleX(1)";
          }
          playerImgEl.style.display = "block";
          if (overlay) {
            overlay.style.display = "none";
            try { overlay.style.transform = 'rotate(0deg)'; } catch (e) {}
          }
          // Position weapon DOM sprite when moving — use the same pickup size
          // so the visible weapon while held matches the on-ground pickup.
          if (weaponDomEl && hasWeaponRef.current && weaponTypeRef.current && !introActiveRef.current) {
            try {
              const img = (weaponTypeRef.current === 'sniper') ? (cutterGivenRef.current ? cutterImg : sniperImg) : (weaponTypeRef.current === 'sheriff' ? (cutterGivenRef.current ? cutterImg : weaponImg) : weaponImg);
              // Compute pickup-sized dimensions (canvas pixels) then scale to DOM
              const desiredWBase = (cutterGivenRef.current) ? SNIPER_PICKUP_WIDTH_PX : ((weaponTypeRef.current === 'sniper') ? SNIPER_PICKUP_WIDTH_PX : WEAPON_PICKUP_WIDTH_PX);
              const cutterScale = ((weaponTypeRef.current === 'sniper' || weaponTypeRef.current === 'sheriff') && cutterGivenRef.current) ? 0.2 : 1;
              const desiredW = Math.round(desiredWBase * cutterScale);
              let desiredH = Math.round((p.h) * 2.2);
              if (img.naturalWidth && img.naturalHeight) {
                const aspect = img.naturalHeight / img.naturalWidth;
                desiredH = Math.max(8, Math.round(desiredW * aspect));
              }
              const weaponDomW = Math.round(desiredW * SCALE);
              const weaponDomH = Math.round(desiredH * SCALE);
              const offsetX = isRight ? Math.round(w - weaponDomW * 0.5) : Math.round(-weaponDomW * 0.5);
              const offsetY = Math.round(h * 0.25);
              weaponDomEl.src = img.src;
              weaponDomEl.style.left = `${sx + offsetX}px`;
              weaponDomEl.style.top = `${sy + offsetY}px`;
              weaponDomEl.style.width = `${weaponDomW}px`;
              weaponDomEl.style.height = `${weaponDomH}px`;
              weaponDomEl.style.transform = isRight ? "scaleX(-1)" : "scaleX(1)";
              weaponDomEl.style.display = 'block';
            } catch (e) {}
          } else if (weaponDomEl) {
            weaponDomEl.style.display = 'none';
          }
        } else {
          // Freeze: draw current GIF frame into an overlay canvas and show that.
          // Expand the overlay horizontally to accommodate the held weapon so
          // it doesn't get clipped when the player is facing left/right.
          if (overlay) {
            try {
              // Prepare weapon dimensions first so we can size the overlay
              let weaponW = 0;
              let weaponH = 0;
              if (hasWeaponRef.current && weaponTypeRef.current && !introActiveRef.current) {
                const img = (weaponTypeRef.current === 'sniper') ? (cutterGivenRef.current ? cutterImg : sniperImg) : (weaponTypeRef.current === 'sheriff' ? (cutterGivenRef.current ? cutterImg : weaponImg) : weaponImg);
                const desiredWBase = (cutterGivenRef.current) ? SNIPER_PICKUP_WIDTH_PX : ((weaponTypeRef.current === 'sniper') ? SNIPER_PICKUP_WIDTH_PX : WEAPON_PICKUP_WIDTH_PX);
                const cutterScale = ((weaponTypeRef.current === 'sniper' || weaponTypeRef.current === 'sheriff') && cutterGivenRef.current) ? 0.2 : 1;
                const desiredW = Math.round(desiredWBase * cutterScale);
                let desiredH = Math.round((p.h) * 2.2);
                if (img.naturalWidth && img.naturalHeight) {
                  const aspect = img.naturalHeight / img.naturalWidth;
                  desiredH = Math.max(8, Math.round(desiredW * aspect));
                }
                weaponW = Math.round(desiredW * SCALE);
                weaponH = Math.round(desiredH * SCALE);
              }

              // Add extra padding on the side the weapon extends to so it
              // remains inside the overlay canvas when drawn.
              const extraLeft = isRight ? 0 : Math.round(weaponW * 0.5);
              const extraRight = isRight ? Math.round(weaponW * 0.5) : 0;

              overlay.width = extraLeft + w + extraRight;
              overlay.height = h;
              const octx = overlay.getContext("2d");
              if (octx) {
                octx.clearRect(0, 0, overlay.width, overlay.height);
                // Draw player image into overlay at x = extraLeft so there's
                // room for weapon on the left when facing left.
                if (isRight) {
                  octx.save();
                  octx.translate(extraLeft + w, 0);
                  octx.scale(-1, 1);
                  try {
                    octx.drawImage(playerImgEl, 0, 0, w, h);
                  } catch (e) {}
                  octx.restore();
                } else {
                  try {
                    octx.drawImage(playerImgEl, extraLeft, 0, w, h);
                  } catch (e) {}
                }

                // Draw held weapon onto overlay when frozen (match pickup size)
                if (hasWeaponRef.current && weaponTypeRef.current && weaponW > 0 && !introActiveRef.current) {
                  try {
                    const img = (weaponTypeRef.current === 'sniper') ? (cutterGivenRef.current ? cutterImg : sniperImg) : (weaponTypeRef.current === 'sheriff' ? (cutterGivenRef.current ? cutterImg : weaponImg) : weaponImg);
                    const offX = extraLeft + (isRight ? Math.round(w - weaponW * 0.5) : Math.round(-weaponW * 0.5));
                    const offY = Math.round(h * 0.25);
                    // When the player is facing right we previously flipped the
                    // player's body by translating+scaling the context and then
                    // restoring it. The weapon must be drawn mirrored too so it
                    // visually matches the player's facing. Draw the weapon
                    // inside a flipped context when `isRight` is true.
                    if (isRight) {
                      octx.save();
                      // Match the transform used for the player: translate to
                      // (extraLeft + w) then scale horizontally by -1.
                      octx.translate(extraLeft + w, 0);
                      octx.scale(-1, 1);
                      // Compute transformed X so the weapon ends up at overlay
                      // coordinate `offX` after the horizontal flip.
                      const tx = Math.round(extraLeft + w - offX - weaponW);
                      octx.drawImage(img, tx, offY, weaponW, weaponH);
                      octx.restore();
                    } else {
                      octx.drawImage(img, offX, offY, weaponW, weaponH);
                    }
                  } catch (e) {}
                }
              }

              // Position the overlay so the player's body aligns with the canvas
              // position `sx`. When we added `extraLeft` padding the overlay's
              // left must shift left by that amount.
              overlay.style.left = `${sx - extraLeft}px`;
              overlay.style.top = `${sy}px`;
              overlay.style.display = "block";
            } catch (e) {}
          }
          // Hide animated GIF so it appears frozen but keep the DOM
          // weapon element visible and positioned so large weapons
          // (like the sniper) are not clipped by the overlay canvas.
          playerImgEl.style.display = "none";
          if (weaponDomEl && hasWeaponRef.current && weaponTypeRef.current && !introActiveRef.current) {
            try {
              const img = (weaponTypeRef.current === 'sniper') ? (cutterGivenRef.current ? cutterImg : sniperImg) : (weaponTypeRef.current === 'sheriff' ? (cutterGivenRef.current ? cutterImg : weaponImg) : weaponImg);
              const desiredWBase = (cutterGivenRef.current) ? SNIPER_PICKUP_WIDTH_PX : ((weaponTypeRef.current === 'sniper') ? SNIPER_PICKUP_WIDTH_PX : WEAPON_PICKUP_WIDTH_PX);
              const cutterScale = ((weaponTypeRef.current === 'sniper' || weaponTypeRef.current === 'sheriff') && cutterGivenRef.current) ? 0.2 : 1;
              const desiredW = Math.round(desiredWBase * cutterScale);
              let desiredH = Math.round((p.h) * 2.2);
              if (img.naturalWidth && img.naturalHeight) {
                const aspect = img.naturalHeight / img.naturalWidth;
                desiredH = Math.max(8, Math.round(desiredW * aspect));
              }
              const weaponDomW = Math.round(desiredW * SCALE);
              const weaponDomH = Math.round(desiredH * SCALE);
              const w = Math.round(p.w * SCALE);
              const h = Math.round(p.h * SCALE);
              const sx = Math.round((px - camera.x) * SCALE);
              const sy = Math.round((py - camera.y) * SCALE);
              const offsetX = isRight ? Math.round(w - weaponDomW * 0.5) : Math.round(-weaponDomW * 0.5);
              const offsetY = Math.round(h * 0.25);
              weaponDomEl.src = img.src;
              weaponDomEl.style.left = `${sx + offsetX}px`;
              weaponDomEl.style.top = `${sy + offsetY}px`;
              weaponDomEl.style.width = `${weaponDomW}px`;
              weaponDomEl.style.height = `${weaponDomH}px`;
              weaponDomEl.style.transform = isRight ? "scaleX(-1)" : "scaleX(1)";
              weaponDomEl.style.zIndex = '3';
              weaponDomEl.style.display = 'block';
            } catch (e) {}
          } else if (weaponDomEl) {
            weaponDomEl.style.display = 'none';
          }
        }
      }

      // Minimal fallback rectangle if sprite element is missing
      if (!playerImgEl) {
        ctx.fillStyle = "#f7c46b";
        ctx.fillRect(px, py, p.w, p.h);
      }
    }

    function drawEnemy(ctx: CanvasRenderingContext2D, e: any) {
      const px = Math.round(e.x);
      const py = Math.round(e.y);

      // Draw a subtle shadow below the enemy (canvas-only)
      ctx.fillStyle = "#2f2f2f";
      ctx.fillRect(px + 2, py + e.h - 6, e.w - 4, 4);

      // If this enemy has a DOM sprite, skip drawing the main body on canvas
      if (e.id && enemyImgEls.has(e.id)) {
        return;
      }

      // Fallback: draw a simple rectangle art
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(px, py, e.w, e.h);

      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(px + 6, py + 6, 4, 4);
      ctx.fillRect(px + e.w - 12, py + 6, 4, 4);
    }

    function drawBoss(ctx: CanvasRenderingContext2D, b: any) {
      // If we've created a DOM image for the boss, skip canvas drawing
      if (bossImgEl) return;
      const px = Math.round(b.x);
      const py = Math.round(b.y);
      // Draw boss using the boss portrait if available, otherwise fall back
      // to the simple placeholder rectangles used previously.
      try {
        if (bossImg && bossImg.complete) {
          ctx.drawImage(bossImg, px, py, b.w, b.h);
          return;
        }
      } catch (e) {}

      ctx.fillStyle = "#8b0000";
      ctx.fillRect(px, py, b.w, b.h);

      ctx.fillStyle = "#dc143c";
      ctx.fillRect(px + 8, py + 8, b.w - 16, b.h - 16);

      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(px + 12, py + 12, 8, 8);
      ctx.fillRect(px + b.w - 20, py + 12, 8, 8);
    }

    

    function drawStar(ctx: CanvasRenderingContext2D, s: any, now: number) {
      if (s.collected) return;
      const px = s.x;
      const py = s.y;
      const w = s.w;
      const h = s.h;

      // Animate: bob and pulse using a slow sine based on time
      const t = now * 0.001; // ms -> seconds
      const bob = Math.sin(t * 2 + (px + py) * 0.001) * 4; // vertical bob in px
      const pulse = 1 + 0.08 * Math.sin(t * 3 + (px + py) * 0.002); // scale
      const rot = 0.08 * Math.sin(t * 2.5 + (px + py) * 0.003); // small rotation

      const centerX = Math.round(px + w / 2);
      const centerY = Math.round(py + h / 2 + bob);

      ctx.save();
      try {
        ctx.translate(centerX, centerY);
        ctx.rotate(rot);
        ctx.scale(pulse, pulse);
        // Draw the star centered
        ctx.drawImage(starImg, -w / 2, -h / 2, w, h);

        // subtle outer glow
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#ffd966";
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.7, h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } catch (e) {
        // fallback: simple pulsing rectangle
        ctx.restore();
        const drawX = Math.round(px);
        const drawY = Math.round(py + bob);
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(drawX + 4, drawY + 4, Math.round(w * pulse) - 8, Math.round(h * pulse) - 8);
        return;
      }
      ctx.restore();
    }
    
    function drawWeapon(ctx: CanvasRenderingContext2D, w: any) {
      if (!w || w.collected) return;
      try {
        const tileX = Math.round(w.x);
        const tileY = Math.round(w.y);
        // Use a fixed pixel width (WEAPON_PICKUP_WIDTH_PX) so the pickup appears
        // wider; preserve the image aspect ratio when possible.
        const desiredW = WEAPON_PICKUP_WIDTH_PX;
        let drawW = desiredW;
        let drawH = Math.round(w.h * 2.2);
        if (weaponImg.naturalWidth && weaponImg.naturalHeight) {
          const aspect = weaponImg.naturalHeight / weaponImg.naturalWidth;
          drawH = Math.max(8, Math.round(drawW * aspect));
        }
        // Center horizontally within the tile and align bottom to sit on tile
        const drawX = tileX + Math.round((TILE - drawW) / 2);
        const drawY = tileY + TILE - drawH - 2; // 2px gap from tile bottom
        // Flip the sheriff pickup horizontally so it faces the other way.
        // Only flip when the pickup image is the sheriff (filename contains 'sheriff').
        try {
          const src = (weaponImg.src || "").toLowerCase();
          if (src.includes("sheriff")) {
            ctx.save();
            // translate to the draw origin + width, scale x by -1 to flip
            ctx.translate(drawX + drawW, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(weaponImg, 0, 0, drawW, drawH);
            ctx.restore();
          } else {
            ctx.drawImage(weaponImg, drawX, drawY, drawW, drawH);
          }
        } catch (e) {
          // fallback to normal draw if any issue
          ctx.drawImage(weaponImg, drawX, drawY, drawW, drawH);
        }
      } catch (e) {
        // fallback: simple rectangle
        const px = Math.round(w.x);
        const py = Math.round(w.y);
        ctx.fillStyle = "#ccc";
        ctx.fillRect(px, py, Math.max(8, Math.round(w.w)), Math.max(8, Math.round(w.h)));
      }
    }

    function drawReward(ctx: CanvasRenderingContext2D, r: any) {
      const px = Math.round(r.x);
      const py = Math.round(r.y);

      // Try to draw the GIF from public/others; fall back to simple shape
      try {
        // If we created a DOM image for the reward, let that DOM element
        // show the animated GIF and avoid drawing the image into the canvas
        // (drawing into canvas freezes GIF frames). Otherwise draw the
        // image into the canvas as a fallback.
        if (!rewardImgEl && rewardImg && rewardImg.complete && rewardImg.naturalWidth) {
          const drawW = r.w * reward_scale;
          const drawH = r.h * reward_scale;
          ctx.drawImage(rewardImg, px, py, drawW, drawH);
        } else if (!rewardImgEl) {
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(px + 4, py + 4, r.w - 8, r.h - 8);
          ctx.fillStyle = "#ff6b00";
          ctx.beginPath();
          ctx.arc(px + r.w/2, py + r.h/2, r.w/3, 0, Math.PI * 2);
          ctx.fill();
        }
      } catch (e) {
        // If anything goes wrong drawing, only draw the fallback shapes
        // when no DOM reward image exists.
        if (!rewardImgEl) {
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(px + 4, py + 4, r.w - 8, r.h - 8);
          ctx.fillStyle = "#ff6b00";
          ctx.beginPath();
          ctx.arc(px + r.w/2, py + r.h/2, r.w/3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Only play the cry sound if the player is within 3 tiles of the reward
      try {
        if (reward) {
          const playerCenterX = player.x + player.w / 2;
          const playerCenterY = player.y + player.h / 2;
          const rewardCenterX = reward.x + reward.w / 2;
          const rewardCenterY = reward.y + reward.h / 2;
          const dist = Math.hypot(playerCenterX - rewardCenterX, playerCenterY - rewardCenterY);
          const proximityPx = TILE * 3; // 3 tiles
          const cry = cryAudioRef.current;
          if (cry) {
            // Only play proximity cry while the boss still exists/is alive
            if (boss && boss.health > 0 && audioAllowedRef.current && dist <= proximityPx && !introActiveRef.current) {
              if (cry.paused) {
                cry.currentTime = 0;
                cry.play().catch(() => {});
              }
            } else {
              if (!cry.paused) cry.pause();
            }
          }
        }
      } catch (e) {}
    }

    // Background helpers: clouds and layered parallax background
    function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.7, size * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + size * 0.5, y + (size * 0.05), size * 0.6, size * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(x - size * 0.4, y + (size * 0.05), size * 0.55, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawBackground(ctx: CanvasRenderingContext2D, now: number) {
      // Sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, canvasEl.height);
      g.addColorStop(0, "#9ed7ff");
      g.addColorStop(0.6, "#bfe9ff");
      g.addColorStop(1, "#cfefff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

      // Sun (parallax slightly with camera)
      const sunX = Math.max(80, Math.min(canvasEl.width - 80, (canvasEl.width * 0.2) - (camera.x * 0.02)));
      const sunY = 70;
      const sunR = 36;
      const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, sunR);
      sg.addColorStop(0, "rgba(255,245,200,1)");
      sg.addColorStop(1, "rgba(255,200,80,0)");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

      // Layered mountains with simple sine-based peaks for silhouette
      const layers = [
        { color: '#9fc6e8', height: 140, par: 0.18 },
        { color: '#80aeda', height: 200, par: 0.36 },
        { color: '#5d86b0', height: 260, par: 0.6 },
      ];

      layers.forEach((layer, li) => {
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        // Triangular peak silhouettes: deterministic peaks with small roughness
        const segments = 3 + li * 2;
        const peakCenters: number[] = [];
        const peakHeights: number[] = [];
        const peakWidths: number[] = [];

        // Deterministic pseudo-random generator per layer (stable across frames)
        const seedBase = li * 37 + Math.floor(camera.x / (canvasEl.width || 1));
        function sRnd(v: number) {
          return (Math.abs(Math.sin(v * 12.9898 + seedBase * 78.233)) * 43758.5453) % 1;
        }

        for (let i = 0; i < segments; i++) {
          const cx = ((i + 0.5) / segments) * canvasEl.width + (sRnd(i) - 0.5) * (canvasEl.width / segments) + ((camera.x * layer.par) % canvasEl.width);
          const ph = 30 + li * 18 + sRnd(i + 4) * 40; // peak height variation
          const pw = canvasEl.width / segments * (0.5 + sRnd(i + 7) * 0.8);
          peakCenters.push(cx);
          peakHeights.push(ph);
          peakWidths.push(pw);
        }

        const step = 2;
        for (let x = 0; x <= canvasEl.width; x += step) {
          let highestY = 0;
          for (let k = 0; k < segments; k++) {
            const dist = Math.abs(x - peakCenters[k]);
            const influence = Math.max(0, peakHeights[k] - (dist * (peakHeights[k] / peakWidths[k])));
            if (influence > highestY) highestY = influence;
          }
          const baseY = canvasEl.height - layer.height;
          const y = baseY - highestY + Math.sin((x + li * 13) * 0.01) * (6 + li * 2); // small roughness
          if (x === 0) ctx.moveTo(0, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(canvasEl.width, canvasEl.height);
        ctx.lineTo(0, canvasEl.height);
        ctx.closePath();
        ctx.fill();
      });

      // Drifting clouds (parallaxed slightly different speeds)
      for (let i = 0; i < 6; i++) {
        const speed = 0.015 + (i % 3) * 0.008;
        const cx = ((i * 260) - (camera.x * speed) + (now * 0.02 * (1 + i * 0.02))) % (canvasEl.width + 400) - 200;
        const cy = 50 + (i % 2) * 22;
        drawCloud(ctx, cx, cy, 40 + (i % 3) * 18);
      }
    }

    // Camera (width/height will be set from actual canvas size each frame)
    const camera = { x: 0, y: 0, width: 0, height: 0 };

    // Player death sequence: freeze the game but keep the map visible, hide the
    // player sprite and overlay a `catded.png` image. Play `death.mp3`. When the
    // sound finishes, show the death message, wait 2s, then respawn the level.
    function doPlayerDeathSequence(reason: string) {
      // Freeze game and clear inputs
      setPaused(true);
      keys.left = keys.right = keys.up = keys.attack = false;

      // Hide the player's regular sprite/overlay so the catded image is shown
        try {
        if (playerSpriteRef.current) playerSpriteRef.current.style.display = 'none';
        if (playerOverlayRef.current) {
          playerOverlayRef.current.style.display = 'none';
          try { playerOverlayRef.current.style.transform = 'rotate(0deg)'; } catch (e) {}
        }
      } catch (e) {}

      const parent = canvasEl.parentElement;
      // Create the overlay image at player's screen position (keep it until respawn)
      let overlayImg: HTMLImageElement | null = null;
      try {
        if (parent) {
          const img = document.createElement('img');
          overlayImg = img;
          img.src = '/images/catded.png';
          img.draggable = false;
          img.style.position = 'absolute';
          const startLeft = Math.round((player.x - camera.x) * SCALE);
          const startTop = Math.round((player.y - camera.y) * SCALE);
          img.style.left = `${startLeft}px`;
          img.style.top = `${startTop}px`;
          img.style.pointerEvents = 'none';
          img.style.imageRendering = 'pixelated';
          img.style.transformOrigin = 'center bottom';
          img.style.zIndex = '9999';
          img.style.width = '70px';
          img.style.height = 'auto';
          parent.appendChild(img);
          // Mark death overlay active so the draw loop keeps the player hidden
          deathActiveRef.current = true;

          const upPx = Math.max(120, Math.round(canvasEl.height * 0.25));
          const upDuration = 700;
          const downDuration = 1000;

          // animate up
          img.style.transition = `top ${upDuration}ms ease-out`;
          // small delay to ensure transition applies
          setTimeout(() => {
            img.style.top = `${startTop - upPx}px`;
          }, 20);

          // then animate down offscreen (visual only)
          setTimeout(() => {
            img.style.transition = `top ${downDuration}ms linear`;
            img.style.top = `${parent.clientHeight + 300}px`;
          }, upDuration + 40);

          // safety removal in case something goes wrong later; will be cleared on respawn
          const safety = window.setTimeout(() => {
            try { deathActiveRef.current = false; } catch (e) {}
            try { img.remove(); } catch (e) {}
          }, upDuration + downDuration + 10000);
          enemyRespawnTimers.push(safety);
        }
      } catch (e) {}

      // Play death audio and wait for it to finish. Only after audio ends show the
      // death message, wait 2s, then reset the level. This preserves the map
      // visually while the death scene plays out.
      try {
        const d = deathAudioRef.current;
          const onEnded = () => {
          try { d && d.removeEventListener('ended', onEnded); } catch (e) {}
          // Wait 2s then respawn (cleanup overlay first)
          const t = window.setTimeout(() => {
            try { if (overlayImg) { deathActiveRef.current = false; overlayImg.remove(); } } catch (e) {}
            setCompletionMessage(null);
            // Reset the level (this will rebuild the map and unpause)
            resetCurrentLevel(reason);
          }, 2000);
          enemyRespawnTimers.push(t);
        };

        if (d) {
          d.currentTime = 0;
          d.play().catch(() => {});
          d.addEventListener('ended', onEnded);
          // Fallback: if duration is available but 'ended' doesn't fire, schedule
          // the handler after the duration + small buffer
          if (!isFinite(d.duration) || d.duration <= 0) {
            // unknown duration, rely on ended event only
          } else {
            const fallback = window.setTimeout(() => {
              try { onEnded(); } catch (e) {}
            }, Math.max(0, Math.floor(d.duration * 1000)) + 200);
            enemyRespawnTimers.push(fallback);
          }
        } else {
          // No audio element: show message immediately then wait 2s
          const t2 = window.setTimeout(() => {
            try { if (overlayImg) { deathActiveRef.current = false; overlayImg.remove(); } } catch (e) {}
            setCompletionMessage(null);
            resetCurrentLevel(reason);
          }, 2000);
          setCompletionMessage(`${reason}`);
          enemyRespawnTimers.push(t2);
        }
      } catch (e) {
        // On error, fallback to immediate respawn
        try { if (overlayImg) overlayImg.remove(); } catch (e) {}
        resetCurrentLevel(reason);
      }
    }

    function loop(now: number) {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;
      
      // Intro sequence handling
      if (introActiveRef.current) {
        // Handle intro walking
        if (introWalkRemainingRef.current > 0) {
          const move = Math.min(120 * dt, introWalkRemainingRef.current);
          
          // --- ADDED: Play footsteps while walking ---
          try {
            const fs = footstepsAudioRef.current;
            if (fs && audioAllowedRef.current && fs.paused) {
              fs.play().catch(() => {});
            }
          } catch (e) {}
          // -------------------------------------------

          try {
            // FIX: Always move right (+move) and face right (dir = 1)
            player.x = (player.x || 0) + move; 
            player.dir = 1; 
          } catch (e) {}
          
          introWalkRemainingRef.current -= move;
          
          if (introWalkRemainingRef.current <= 0) {
            introWalkRemainingRef.current = 0;
            
            // --- ADDED: Stop footsteps when walking finishes ---
            try {
              const fs = footstepsAudioRef.current;
              if (fs && !fs.paused) {
                fs.pause();
                fs.currentTime = 0;
              }
            } catch (e) {}
            // --------------------------------------------------

            const nextAction = introWalkNextActionRef.current;
            introWalkNextActionRef.current = null;
            
            if (nextAction === 'first_dialog') {
              // Player has reached S tile, freeze GIF and show first dialog
              setTimeout(() => {
                // Freeze the player GIF on S tile
                try { freezePlayerAnimRef.current = true; } catch (e) {}
                // Show first dialogue
                customDialogLinesRef.current = INTRO_DIALOG_LINES.slice(0, 1);
                customDialogOnCompleteRef.current = () => {
                  // After first dialog, walk 6 blocks left
                  introWalkRemainingRef.current = 6 * TILE;
                  introWalkNextActionRef.current = 'second_dialog';
                  // Unfreeze for walking
                  try { freezePlayerAnimRef.current = false; } catch (e) {}
                };
                setDialogVisible(true);
                startTyping(0);
              }, 500);
            } else if (nextAction === 'second_dialog') {
              // After walking 6 blocks left, show second dialogue
              setTimeout(() => {
                // Freeze GIF again for dialog
                try { freezePlayerAnimRef.current = true; } catch (e) {}
                customDialogLinesRef.current = INTRO_DIALOG_LINES.slice(1, 4);
                customDialogOnCompleteRef.current = () => {
                  // After second dialog, walk 2 blocks right
                  introWalkRemainingRef.current = 5 * TILE;
                  introWalkNextActionRef.current = 'fall_sequence';
                  // Unfreeze for walking
                  try { freezePlayerAnimRef.current = false; } catch (e) {}
                };
                setDialogVisible(true);
                startTyping(0);
              }, 500);
            } else if (nextAction === 'fall_sequence') {
              // After walking 2 blocks right, perform fall + spin sequence
              // (shorter delay so Banana Cat falls quicker)
              setTimeout(() => {
                try { freezePlayerAnimRef.current = true; } catch (e) {}

                // Ensure the player GIF is hidden so we can use the overlay canvas
                try { if (playerImgEl) playerImgEl.style.display = 'none'; } catch (e) {}

                // Helper: convert 1-based tile coordinates to player top-left px
                const toPx = (col: number, row: number) => ({
                  x: col * TILE,
                  y: row * TILE - (player.h || 0)
                });

                // Build spin path (1-based cols/rows from user spec)
                const path: Array<{x:number,y:number}> = [];
                // 17..25 at row 12
                for (let c = 17; c <= 25; c++) path.push(toPx(c, 12));
                path.push(toPx(27,13));
                path.push(toPx(28,14));
                path.push(toPx(29,15));
                path.push(toPx(30,15));
              path.push(toPx(31,16));
                path.push(toPx(37,16));

                // Small fall animation: nudge player down and draw face-down briefly
                const overlayEl = playerOverlayRef.current;
                if (overlayEl) {
                  overlayEl.style.display = 'block';
                  overlayEl.style.transformOrigin = 'center center';
                }

                const doFall = (onDone: () => void) => {
                  const startY = player.y;
                  const down = 8;
                  const dur = 150; // faster fall
                  const start = performance.now();
                  const tick = (t: number) => {
                    const p = Math.min(1, (t - start) / dur);
                    player.y = startY + down * p;
                    // rotate overlay slightly to mimic face-down tumble
                    try { if (overlayEl) overlayEl.style.transform = `rotate(${90 * p}deg)`; } catch (e) {}
                    if (p < 1) requestAnimationFrame(tick);
                    else {
                      try {
                        const b = bonkAudioRef.current;
                        if (b) {
                          try { b.currentTime = 0; } catch (e) {}
                          b.play().catch(() => {});
                        }
                      } catch (e) {}
                      onDone();
                    }
                  };
                  requestAnimationFrame(tick);
                };

                // Animate along the path with continuous spin
                const animatePath = (pts: Array<{x:number,y:number}>, onDone: () => void) => {
                  let i = 0;
                  const stepDur = 120; // ms per step
                  const spinInterval = 20; // ms for spin update
                  let spinAngle = 0;
                  // Start roll audio while spinning
                  try {
                    const r = rollAudioRef.current;
                    if (r) {
                      try { r.currentTime = 0; } catch (e) {}
                      r.play().catch(() => {});
                    }
                  } catch (e) {}

                  const spinTimer = window.setInterval(() => {
                    spinAngle = (spinAngle + 30) % 360;
                    try { if (overlayEl) overlayEl.style.transform = `rotate(${spinAngle}deg)`; } catch (e) {}
                  }, spinInterval);

                  const nextStep = () => {
                    if (i >= pts.length) {
                      clearInterval(spinTimer);
                      // stop roll audio when spinning ends
                      try {
                        const r = rollAudioRef.current;
                        if (r) {
                          r.pause();
                          try { r.currentTime = 0; } catch (e) {}
                        }
                      } catch (e) {}
                      onDone();
                      return;
                    }
                    const tgt = pts[i++];
                    const sx = player.x;
                    const sy = player.y;
                    const start = performance.now();
                    const tick = (now2: number) => {
                      const t = Math.min(1, (now2 - start) / stepDur);
                      player.x = sx + (tgt.x - sx) * t;
                      player.y = sy + (tgt.y - sy) * t;
                      if (t < 1) requestAnimationFrame(tick);
                      else setTimeout(nextStep, 10);
                    };
                    requestAnimationFrame(tick);
                  };
                  nextStep();
                };

                // Sequence: fall -> spin along path -> show narrator dialog -> continue intro fade
                doFall(() => {
                  // slight pause then spin
                  setTimeout(() => {
                    animatePath(path, () => {
                      // Hide overlay and restore GIF visibility state
                      try {
                        if (overlayEl) {
                          overlayEl.style.display = 'none';
                          try { overlayEl.style.transform = 'rotate(0deg)'; } catch (e) {}
                        }
                      } catch (e) {}
                      try { if (playerImgEl) playerImgEl.style.display = 'block'; } catch (e) {}
                      try { freezePlayerAnimRef.current = true; } catch (e) {}

                      // Show narrator line about falling after the spin
                      customDialogLinesRef.current = INTRO_DIALOG_LINES.slice(4, 5);
                      customDialogOnCompleteRef.current = () => {
                        // Fade out black transition and then initialize level 1
                        setBlackOverlay(true);
                        let opacity = 0;
                        const fadeInterval = setInterval(() => {
                          opacity += 0.02;
                          setBlackOverlayOpacity(opacity);
                          if (opacity >= 1) {
                            clearInterval(fadeInterval);
                            setTimeout(() => {
                              setIntroActive(false);
                              setBlackOverlay(false);
                              setShowHUD(false);
                              try { freezePlayerAnimRef.current = false; } catch (e) {}
                              map = makeMap(levels[levelIndex]);
                              initializeLevel(map, false);
                              setTimeout(() => {
                                customDialogLinesRef.current = INTRO_DIALOG_LINES.slice(5);
                                customDialogOnCompleteRef.current = () => {
                                  setShowHUD(true);
                                  setPaused(false);
                                };
                                setDialogVisible(true);
                                startTyping(0);
                              }, 500);
                            }, 1000);
                          }
                        }, 100);
                      };
                      setDialogVisible(true);
                      startTyping(0);
                    });
                  }, 200);
                });
              }, 50);
            }
          }
        }
      }
      
      // Scripted player walk (requested from UI) — perform before normal physics
      if (scriptedWalkRemainingRef.current > 0) {
        const move = Math.min(scriptedWalkSpeedRef.current * dt, scriptedWalkRemainingRef.current);
        try {
          player.x = (player.x || 0) - move;
          player.dir = -1;
        } catch (e) {}
        scriptedWalkRemainingRef.current -= move;
        if (scriptedWalkRemainingRef.current <= 0) {
          scriptedWalkRemainingRef.current = 0;
          const nl = scriptedWalkNextLineRef.current;
          scriptedWalkNextLineRef.current = null;
          // After finishing the scripted walk, freeze the GIF before the
          // next dialog (hostage line) shows. Keep the player's current
          // facing (left) so the hostage sees the player still looking left.
          // Disable the broader cutscene 'animated' behavior so the GIF
          // will be frozen (drawPlayer will only animate when moving).
          // Freeze the player's DOM GIF animation but keep the cutscene active
          // so player input remains blocked until dialog finishes.
          try { freezePlayerAnimRef.current = true; } catch (e) {}
          // small pause then open dialog for next line
          window.setTimeout(() => {
            setDialogVisible(true);
            if (nl !== null) startTyping(nl);
          }, 120);
        }
      }
      // One-time scripted facing change (requested from dialog handlers)
      if (scriptedFaceRef.current !== null) {
        try { player.dir = scriptedFaceRef.current; } catch (e) {}
        scriptedFaceRef.current = null;
      }
      // Use the ref so toggling pause doesn't re-run this entire effect
      // (which would recreate DOM elements and briefly clear the scene).
      if (!pausedRef.current && !introActiveRef.current) {
        moveAndCollide(dt);

        // Keep camera dimensions in sync with the canvas (full-map view)
        camera.width = canvasEl.width;
        camera.height = canvasEl.height;

        // Camera follow
        camera.x = player.x + player.w / 2 - camera.width / 2;
        camera.y = player.y + player.h / 2 - camera.height / 2;

        const maxX = map[0].length * TILE - camera.width;
        const maxY = map.length * TILE - camera.height;
        camera.x = Math.max(0, Math.min(maxX, camera.x));
        camera.y = Math.max(0, Math.min(maxY, camera.y));
      } else if (introActiveRef.current) {
        // During intro, center camera on player
        camera.width = canvasEl.width;
        camera.height = canvasEl.height;
        camera.x = player.x + player.w / 2 - camera.width / 2;
        camera.y = player.y + player.h / 2 - camera.height / 2;
        const maxX = map[0].length * TILE - camera.width;
        const maxY = map.length * TILE - camera.height;
        camera.x = Math.max(0, Math.min(maxX, camera.x));
        camera.y = Math.max(0, Math.min(maxY, camera.y));
      }

        // Position DOM enemy sprites (they are CSS-scaled by `SCALE` to match canvas)
        enemyImgEls.forEach((img, id) => {
          const en = enemies.find(e => (e as any).id === id) as any | undefined;
          if (!en) {
            img.style.display = "none";
            return;
          }
          const sx = Math.round((en.x - camera.x) * SCALE);
          const sy = Math.round((en.y - camera.y) * SCALE);
          const w = Math.round(en.w * SCALE);
          const h = Math.round(en.h * SCALE);
          img.style.left = `${sx}px`;
          img.style.top = `${sy}px`;
          img.style.width = `${w}px`;
          img.style.height = `${h}px`;
          img.style.transform = en.dir > 0 ? "scaleX(-1)" : "scaleX(1)";
          img.style.zIndex = "2";
          const visible = sx >= -w && sx <= (camera.width * SCALE) + w && sy >= -h && sy <= (camera.height * SCALE) + h;
          img.style.display = visible ? "block" : "none";
        });

          // Position boss DOM sprite above canvas (if present)
          try {
            if (boss && bossImgEl) {
              const sx = Math.round((boss.x - camera.x) * SCALE);
              const sy = Math.round((boss.y - camera.y) * SCALE);
              const w = Math.round(boss.w * SCALE);
              const h = Math.round(boss.h * SCALE);
              bossImgEl.style.left = `${sx}px`;
              bossImgEl.style.top = `${sy}px`;
              bossImgEl.style.width = `${w}px`;
              bossImgEl.style.height = `${h}px`;
              bossImgEl.style.zIndex = '3';
              const visible = sx >= -w && sx <= (camera.width * SCALE) + w && sy >= -h && sy <= (camera.height * SCALE) + h;
              bossImgEl.style.display = visible ? 'block' : 'none';
            } else if (bossImgEl) {
              bossImgEl.style.display = 'none';
            }
          } catch (e) {}

        // Position reward DOM sprite (keeps GIF animated). Show/hide based on camera visibility.
        try {
          if (reward && rewardImgEl) {
            const sx = Math.round((reward.x - camera.x) * SCALE);
            const sy = Math.round((reward.y - camera.y) * SCALE);
            const w = Math.round(reward.w * SCALE * reward_scale);
            const h = Math.round(reward.h * SCALE * reward_scale);
            rewardImgEl.style.left = `${sx}px`;
            rewardImgEl.style.top = `${sy}px`;
              rewardImgEl.style.width = `60px`;
              rewardImgEl.style.height = `${h}px`;
            const visible = sx >= -w && sx <= (camera.width * SCALE) + w && sy >= -h && sy <= (camera.height * SCALE) + h;
            rewardImgEl.style.display = visible ? "block" : "none";
            rewardImgEl.style.zIndex = "2";
          } else if (rewardImgEl) {
            rewardImgEl.style.display = "none";
          }
        } catch (e) {}

        // Sheriff pickup speech bubble: create/position when requested by dialog
        try {
        // First-star speech bubble (level 1 only): prompt the player to collect stars
        if (showFirstStarBubbleRef.current && levelIndex === 0 && stars && stars.length > 0 && !stars[0].collected) {
          // ensure bob animation style exists (reuse sheriff style)
          if (!document.getElementById('sheriff-bubble-style')) {
            const st = document.createElement('style');
            st.id = 'sheriff-bubble-style';
            st.textContent = `@keyframes sheriff-bob { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }`;
            document.head.appendChild(st);
          }
          if (!starBubbleEl) {
            const div = document.createElement('div');
            div.textContent = 'Collect stars (it might be useful later)';
            div.style.position = 'absolute';
            div.style.pointerEvents = 'none';
            div.style.zIndex = '9998';
            div.style.padding = '6px 8px';
            div.style.background = 'rgba(255,255,255,0.95)';
            div.style.color = '#000';
            div.style.borderRadius = '12px';
            div.style.border = '2px solid #222';
            div.style.font = '12px monospace';
            div.style.whiteSpace = 'nowrap';
            div.style.transform = 'translateY(0)';
            div.style.animation = 'sheriff-bob 900ms ease-in-out infinite';
            canvasEl.parentElement?.appendChild(div);
            starBubbleEl = div;
          }
          // position bubble centered above star pickup
          const sx = Math.round((stars[0].x - camera.x) * SCALE);
          const sy = Math.round((stars[0].y - camera.y) * SCALE);
          const w = Math.round(stars[0].w * SCALE);
          const bubW = starBubbleEl.getBoundingClientRect().width || 80;
          starBubbleEl.style.left = `${sx + Math.round((w - bubW) / 2)}px`;
          starBubbleEl.style.top = `${sy - 28}px`;
          starBubbleEl.style.display = 'block';
        } else if (starBubbleEl) { // ADDED: Logic to remove the star bubble element
          // Remove the star bubble if the conditions are not met (star collected or not level 0)
          try {
            starBubbleEl.remove();
            starBubbleEl = null;
          } catch (e) {}
        }

          if (showSheriffBubbleRef.current && weapon && !weapon.collected) {
            // create style for bubble animation if not present
            if (!document.getElementById('sheriff-bubble-style')) {
              const st = document.createElement('style');
              st.id = 'sheriff-bubble-style';
              st.textContent = `@keyframes sheriff-bob { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }`;
              document.head.appendChild(st);
            }
            // create bubble element if missing
            if (!sheriffBubbleEl) {
              const div = document.createElement('div');
              div.textContent = 'Pick this sheriff';
              div.style.position = 'absolute';
              div.style.pointerEvents = 'none';
              div.style.zIndex = '9998';
              div.style.padding = '6px 8px';
              div.style.background = 'rgba(255,255,255,0.95)';
              div.style.color = '#000';
              div.style.borderRadius = '12px';
              div.style.border = '2px solid #222';
              div.style.font = '12px monospace';
              div.style.whiteSpace = 'nowrap';
              div.style.transform = 'translateY(0)';
              div.style.animation = 'sheriff-bob 900ms ease-in-out infinite';
              canvasEl.parentElement?.appendChild(div);
              sheriffBubbleEl = div;
            }

            // position bubble centered above weapon pickup
            const sx = Math.round((weapon.x - camera.x) * SCALE);
            const sy = Math.round((weapon.y - camera.y) * SCALE);
            const w = Math.round(weapon.w * SCALE);
            const bubW = sheriffBubbleEl.getBoundingClientRect().width || 80;
            sheriffBubbleEl.style.left = `${sx + Math.round((w - bubW) / 2)}px`;
            sheriffBubbleEl.style.top = `${sy - 28}px`;
            sheriffBubbleEl.style.display = 'block';
          } else if (sheriffBubbleEl) {
            // remove bubble when weapon picked up or no longer requested
            try { if (weapon && weapon.collected) { sheriffBubbleEl.remove(); sheriffBubbleEl = null; showSheriffBubbleRef.current = false; } else { sheriffBubbleEl.style.display = 'none'; } } catch (e) {}
          }
        } catch (e) {}

        // If the player has a sheriff and it's completely out of ammo (mag=0, reserve=0),
        // trigger the empty-sheriff flow: stop the boss and play a custom dialog sequence
        try {
          const wtype = weaponTypeRef.current;
          const cur = ammoRef.current;
          if (wtype === 'sheriff' && cur.mag === 0 && cur.reserve === 0 && boss && !sheriffEmptyHandledRef.current && !introActiveRef.current) {
            sheriffEmptyHandledRef.current = true;
            // hide reload hint in this case
            setShowReloadHint(false);
            // stop boss movement
            try { bossCanMoveRef.current = false; } catch (e) {}
            // stop player movement immediately so the dialog sequence starts
            try { keys.left = false; keys.right = false; keys.up = false; } catch (e) {}
            try { if (player) player.vx = 0; } catch (e) {}

            const starCount = collectedStarsRef.current || 0;
            const lines: Array<{speaker:string,text:string,img:string}> = [
              { speaker: 'Hostage', text: 'Nice, the boss is starting to get weak.', img: '/others/catcry.gif' },
              { speaker: 'Banana Cat', text: 'What now? I dont have bullets anymore!', img: '/others/bananacat.gif' },
              { speaker: 'Hostage', text: 'Hmm, have you collected any stars in your adventure?', img: '/others/catcry.gif' },
              { speaker: 'Banana Cat', text: `I collected ${starCount} amount of stars!`, img: '/others/bananacat.gif' },
            ];

            if (starCount === TOTAL_STARS) {
              setShowUpgradeHint(true);
              showUpgradeHintRef.current = true;
              // DON'T set bossCanMoveRef.current = true here - it should only move after F is pressed
              // and the specific dialog line completes
            } 
            // Remove the else block entirely - don't startCustomDialog here

            // After the dialog closes, either show the upgrade hint (if enough stars)
            // or resume the boss and open the urgent follow-up dialog.
            startCustomDialog(lines, () => {
              if (starCount === TOTAL_STARS) {
                setShowUpgradeHint(true);
                showUpgradeHintRef.current = true;
              } else {
                // Resume boss movement
                try { bossCanMoveRef.current = true; } catch (e) {}
                // Open follow-up urgent hostage dialog
                startCustomDialog([
                  { speaker: 'Hostage', text: "The boss started moving again. Come here!! Quick!! I'll give something to you!!", img: '/others/catcry.gif' }
                ], () => {
                  // Enable boss movement after this specific hostage dialog completes
                  try { bossCanMoveRef.current = true; } catch (e) {}
                });
              }
            });
          }
        } catch (e) {}

      // Update tracers (advance projectiles and check collisions)
      try {
        if (!pausedRef.current && !introActiveRef.current) {
          for (let ti = tracers.length - 1; ti >= 0; ti--) {
            const tr = tracers[ti];
            tr.x += tr.vx * dt;
            tr.y += tr.vy * dt;
            tr.age += dt;

            // Check collision with enemies
            let hit = false;
            for (let ei = 0; ei < enemies.length; ei++) {
              const en = enemies[ei];
              if (rectCollision({ x: tr.x - tr.r, y: tr.y - tr.r, w: tr.r * 2, h: tr.r * 2 }, en)) {
                enemies.splice(ei, 1);
                tracers.splice(ti, 1);
                hit = true;
                try { const cd = catdedAudioRef.current; if (cd) { cd.currentTime = 0; cd.play().catch(() => {}); } } catch (e) {}
                break;
              }
            }
            if (hit) continue;

            // Check collision with boss
            if (boss && rectCollision({ x: tr.x - tr.r, y: tr.y - tr.r, w: tr.r * 2, h: tr.r * 2 }, boss)) {
              try {
                const newHealth = Math.max(0, bossHealthRef.current - tr.damage);
                setBossHealth(newHealth);
                bossHealthRef.current = newHealth;
                if (newHealth <= 0) boss = null;
              } catch (e) {}
              tracers.splice(ti, 1);
              continue;
            }

            // Lifetime / out-of-bounds
            if (tr.age > tr.life || tr.x < -TILE || tr.x > map[0].length * TILE + TILE || tr.y < -TILE || tr.y > map.length * TILE + TILE) {
              tracers.splice(ti, 1);
            }
          }
        }
      } catch (e) {}

      // Draw background (sky, sun, mountains, clouds)
      drawBackground(ctx, now);

      // Draw tiles
      const startCol = Math.floor(camera.x / TILE);
      const endCol = Math.ceil((camera.x + camera.width) / TILE);
      const startRow = Math.floor(camera.y / TILE);
      const endRow = Math.ceil((camera.y + camera.height) / TILE);

      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          const t = tileAt(c, r);
          const sx = Math.round((c * TILE) - camera.x);
          const sy = Math.round((r * TILE) - camera.y);
          drawTile(ctx, t, sx, sy);
        }
      }


      // Draw player
      drawPlayer(ctx, player);

      // Draw enemies
      enemies.forEach(enemy => {
        const sx = Math.round(enemy.x - camera.x);
        const sy = Math.round(enemy.y - camera.y);
        if (sx >= -TILE && sx <= camera.width + TILE && sy >= -TILE && sy <= camera.height + TILE) {
          drawEnemy(ctx, { ...enemy, x: sx, y: sy });
        }
      });

      // Draw boss
      if (boss) {
        const sx = Math.round(boss.x - camera.x);
        const sy = Math.round(boss.y - camera.y);
        if (sx >= -boss.w && sx <= camera.width + boss.w && sy >= -boss.h && sy <= camera.height + boss.h) {
          drawBoss(ctx, { ...boss, x: sx, y: sy });
        }
      }

      // Draw weapon
      if (weapon) {
        const sx = Math.round(weapon.x - camera.x);
        const sy = Math.round(weapon.y - camera.y);
        if (sx >= -TILE && sx <= camera.width + TILE && sy >= -TILE && sy <= camera.height + TILE) {
          drawWeapon(ctx, { ...weapon, x: sx, y: sy });
        }
      }

      // Draw reward
      if (reward) {
        const sx = Math.round(reward.x - camera.x);
        const sy = Math.round(reward.y - camera.y);
        if (sx >= -TILE && sx <= camera.width + TILE && sy >= -TILE && sy <= camera.height + TILE) {
          drawReward(ctx, { ...reward, x: sx, y: sy });
        }
      } else {
        // Pause cry audio if no reward present
        try {
          const cry = cryAudioRef.current;
          if (cry && !cry.paused) cry.pause();
        } catch (e) {}
      }

      // Check proximity to the hostage reward for the cutter handover prompt
      try {
        if (reward && cTileRef.current && !cTileRef.current.cut) {
          const rtx = Math.floor(reward.x / TILE);
          const rty = Math.floor(reward.y / TILE);
          const playerTileX_now = Math.floor((player.x + player.w / 2) / TILE);
          const playerTileY_now = Math.floor((player.y + player.h - 1) / TILE);
          const near = (Math.abs(playerTileX_now - rtx) <= 1) && (Math.abs(playerTileY_now - rty) <= 0);
          nearHostageAcceptRef.current = near;
          try { setShowHostagePrompt(near && showHUDRef.current && (seenHostage1Ref.current || seenHostage2Ref.current)); } catch (e) {}
        } else {
          nearHostageAcceptRef.current = false;
          try { setShowHostagePrompt(false); } catch (e) {}
        }
      } catch (e) {}

      // Draw tracers (projectiles)
      try {
        tracers.forEach((tr) => {
          const sx = tr.x - camera.x;
          const sy = tr.y - camera.y;
          // compute a short previous point for a streak effect based on
          // tracer's trail length and velocity direction
          const vlen = Math.hypot(tr.vx, tr.vy) || 1;
          const nx = tr.vx / vlen;
          const ny = tr.vy / vlen;
          const prevX = sx - nx * (tr.trail || 20);
          const prevY = sy - ny * (tr.trail || 20);
          const p1x = Math.round(prevX);
          const p1y = Math.round(prevY);
          const p2x = Math.round(sx);
          const p2y = Math.round(sy);
          const alpha = Math.max(0.15, 1 - (tr.age / tr.life));
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineWidth = tr.type === 'sniper' ? 3 : 2;
          // gradient head->tail for a brighter yellow tracer look
          const grad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
          // Use vivid yellow palette for both tracer types. Sheriff will be
          // more vibrant (stronger glow), sniper will share the yellow hue
          // but be thinner and have a longer streak (more distance).
          grad.addColorStop(0, `rgba(255,250,160,${0.0 * alpha})`);
          grad.addColorStop(0.4, `rgba(255,220,80,${0.9 * alpha})`);
          grad.addColorStop(1, `rgba(255,255,140,${1.0 * alpha})`);
          if (tr.type === 'sniper') {
            // sniper: long thin streak but still yellow
            ctx.lineWidth = 2.8;
            ctx.shadowColor = `rgba(255,230,140,${0.7 * alpha})`;
            ctx.shadowBlur = 6;
          } else {
            // sheriff: short but very vibrant flash
            ctx.lineWidth = 3.6;
            ctx.shadowColor = `rgba(255,245,160,${1.0 * alpha})`;
            ctx.shadowBlur = 12;
          }
          ctx.strokeStyle = grad;
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();
          // small bright head dot
          ctx.fillStyle = tr.type === 'sniper' ? `rgba(220,255,255,${1.0 * alpha})` : `rgba(255,255,140,${1.0 * alpha})`;
          ctx.beginPath(); ctx.arc(p2x, p2y, tr.type === 'sniper' ? 1.8 : 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
      } catch (e) {}

      // Draw stars (collectibles)
      stars.forEach((s) => {
        if (s.collected) return;
        const sx = Math.round(s.x - camera.x);
        const sy = Math.round(s.y - camera.y);
        const visible = sx >= -TILE && sx <= camera.width + TILE && sy >= -TILE && sy <= camera.height + TILE;
        if (visible) drawStar(ctx, { ...s, x: sx, y: sy }, now);
      });

      // HUD
      // For level 5 (index 4) with a boss cutscene, hide HUD until the
      // cutscene/dialogue has fully completed (controlled by
      // `level5CutsceneDoneRef`).
      if (showHUDRef.current && !(levelIndex === 4 && !level5CutsceneDoneRef.current) && !introActiveRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(8, 8, 350, 68);
        ctx.fillStyle = "#fff";
        ctx.font = "14px monospace";
        ctx.fillText(`Level: ${levelIndex + 1} / ${levels.length}`, 16, 28);
        ctx.fillText(`Health: ${health}`, 16, 48);
        if (boss) {

          // Draw boss health bar centered at top
          try {
            const barW = 300;
            const barH = 12;
            const barX = Math.round((canvasEl.width - barW) / 2);
            const barY = 12;
            const pct = Math.max(0, Math.min(1, bossHealthRef.current / 1500));

            // background
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
            // empty bar
            ctx.fillStyle = '#550000';
            ctx.fillRect(barX, barY, barW, barH);
            // filled portion
            ctx.fillStyle = '#ff4d4d';
            ctx.fillRect(barX, barY, Math.round(barW * pct), barH);

            // boss label
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(`Boss`, barX + 6, barY + barH + 12);
            // boss health percent (e.g., 75%) — draw right-aligned below the bar
            try {
              const pctText = `${Math.round(pct * 100)}%`;
              ctx.font = '12px monospace';
              const textW = ctx.measureText(pctText).width;
              ctx.fillText(pctText, barX + barW - 6 - textW, barY + barH + 12);
            } catch (e) {}
          } catch (e) {}
        }
        const wt = weaponTypeRef.current;
        const hudWeapon = hasWeaponRef.current ? (wt === 'sheriff' ? 'Sheriff' : wt === 'sniper' ? 'Operator' : 'Yes (F to attack)') : 'None';
        ctx.fillText(`Weapon: ${hudWeapon}`, 16, 68);
        ctx.fillText("A & D: Move left and right", 140, 28);
        ctx.fillText("Space: Jump", 140, 48);
        ctx.fillText(`Stars: ${collectedStarsRef.current} / ${TOTAL_STARS}`, 140, 68);
      }

      raf = requestAnimationFrame(loop);
    }

    // Initialize current level
    initializeLevel(map, introActive);

    // If this level includes a boss and we haven't shown its cutscene yet,
    // play the scripted walk-into-scene before starting dialogue.
    if (boss && !shownCutscenesRef.current[levelIndex] && !introActiveRef.current) {
      shownCutscenesRef.current[levelIndex] = true;
      // Keep the game loop running so the map, enemies and DOM sprites
      // are created and animate while the cat walks into the scene.
      setPaused(false);
      setCutsceneActive(true);
      setDialogVisible(false);
      // place player at leftmost side
      try { player.x = 0; } catch (e) {}
      const targetX = (playerSpawn as any) ? (playerSpawn as any).x * TILE : player.x;
      const speed = 120; // px per second for cutscene walk
      // small interval animation while game is paused (render loop still runs)
      if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; }
      moveTimerRef.current = window.setInterval(() => {
        try {
          const dx = speed * 0.016;
          player.x = Math.min(targetX, (player.x || 0) + dx);
          if (player.x >= targetX - 0.5) {
            if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; }
            // small pause then start dialogue
            const t = window.setTimeout(() => {
              setDialogVisible(true);
              startTyping(0);
            }, 420);
            enemyRespawnTimers.push(t);
          }
        } catch (e) {}
      }, 16);
      // ensure the interval is tracked for cleanup
      if (moveTimerRef.current) enemyRespawnTimers.push(moveTimerRef.current);
    }
    raf = requestAnimationFrame(loop);

    // Check for level changes
    let lastLevel = levelIndex;
    const levelCheckInterval = setInterval(() => {
        if (lastLevel !== levelIndex) {
        lastLevel = levelIndex;
        map = makeMap(levels[levelIndex]);
        initializeLevel(map, false);
      }
    }, 60);

    // Cleanup
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(levelCheckInterval);
      // Clear any pending enemy respawn timers
      enemyRespawnTimers.forEach((t) => clearTimeout(t));
      // Remove any enemy DOM images
      enemyImgEls.forEach((img) => img.remove());
      enemyImgEls.clear();
      // Remove reward DOM image if present
      try { if (rewardImgEl) { rewardImgEl.remove(); rewardImgEl = null; } } catch (e) {}
      // Remove boss DOM image if present
      try { if (bossImgEl) { bossImgEl.remove(); bossImgEl = null; } } catch (e) {}
      // Remove sheriff bubble if present
      try { if (sheriffBubbleEl) { sheriffBubbleEl.remove(); sheriffBubbleEl = null; } } catch (e) {}
      try {
        if (starBubbleEl) {
          starBubbleEl.remove();
          starBubbleEl = null;
        }
      } catch (e) {}
      // Clear dialog/move timers used by the cutscene
      try { if (dialogTimerRef.current) { clearInterval(dialogTimerRef.current); dialogTimerRef.current = null; } } catch (e) {}
      try { if (moveTimerRef.current) { clearInterval(moveTimerRef.current); moveTimerRef.current = null; } } catch (e) {}
      // Clear reload timer if active
      try { if (reloadTimerRef.current) { clearTimeout(reloadTimerRef.current); reloadTimerRef.current = null; } } catch (e) {}
      try {
        canvasEl.removeEventListener('pointerdown', pointerDownHandler);
        canvasEl.removeEventListener('contextmenu', ctxMenuHandler);
      } catch (e) {}
      try { window.removeEventListener('pointerup', pointerUpHandler); } catch (e) {}
      window.removeEventListener("keydown", keydownHandler);
      window.removeEventListener("keyup", keyupHandler);
    };
  }, [levelIndex]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(/others/bg.gif)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: 16,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Black overlay for transitions */}
      {blackOverlay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(0, 0, 0, ${blackOverlayOpacity})`,
            zIndex: 10000,
            pointerEvents: "none",
            transition: "opacity 0.1s linear",
          }}
        />
      )}
      {/* End screen shown after final fade completes */}
      {showEndScreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 6 }}>THE END</div>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                marginTop: 22,
                padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
      
      <img
        src="/images/back.png"
        alt="Back"
        role="button"
        aria-label="Back"
        tabIndex={0}
        draggable={false}
        onClick={() => (window.location.href = "/")}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.href = "/";
          }
        }}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          width: 180,
          height: "auto",
          imageRendering: "pixelated",
          cursor: "pointer",
          zIndex: 9999,
        }}
      />

      <div style={{ width: "100%", maxWidth: Math.max(canvasSize.w * SCALE + 78, 720), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                borderWidth: 52,
                borderStyle: "solid",
                borderImage: "url(/images/border.png) 38 round",
                boxSizing: "content-box",
                zIndex: 9999,
              }}
            >
              <canvas ref={canvasRef} style={{ imageRendering: "pixelated", display: "block", width: canvasSize.w * SCALE, height: canvasSize.h * SCALE }} />
              {/* Animated GIF sprite overlayed on canvas */}
              <img
                ref={playerSpriteRef}
                src="/others/bananacat.gif"
                alt="Player"
                draggable={false}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: TILE, // will be overridden live
                  height: TILE, // will be overridden live
                  imageRendering: "pixelated",
                  transformOrigin: "center",
                  pointerEvents: "none",
                  display: "none",
                } as any}
              />
              {/* Weapon sprite attached to player (positioned in render loop) */}
              <img
                ref={weaponSpriteRef}
                src="/images/sheriff.webp"
                alt="Weapon"
                draggable={false}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: TILE,
                  height: TILE,
                  imageRendering: "pixelated",
                  transformOrigin: "center",
                  pointerEvents: "none",
                  display: "none",
                  zIndex: 2,
                } as any}
              />
              {/* Overlay canvas used to show a frozen frame when not moving */}
              <canvas
                ref={playerOverlayRef}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  pointerEvents: "none",
                  display: "none",
                  zIndex: 1,
                  imageRendering: "pixelated",
                } as any}
              />
              {/* Ammo HUD */}
              {hasWeapon && weaponType && showHUD && (
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    zIndex: 10001,
                    padding: '6px 8px',
                    background: 'rgba(20,20,20,0.9)',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    borderRadius: 6,
                    userSelect: 'none',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  Ammo: {ammo.mag}/{ammo.reserve}
                </div>
              )}
              {/* Aim hint (top-center: above mountains, below clouds) */}
              {showAimHint && levelIndex === 4 && showHUD && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 88,
                    zIndex: 10000,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    borderRadius: 10,
                    pointerEvents: 'none',
                    border: '1px solid rgba(0,0,0,0.12)'
                  }}
                >
                  Left-click and aim at the boss to kill it
                </div>
              )}

              {/* Reload hint: show when sheriff mag is empty */}
              {showReloadHint && showHUD && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 128,
                    zIndex: 10000,
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    borderRadius: 8,
                    pointerEvents: 'none',
                    border: '1px solid rgba(0,0,0,0.12)'
                  }}
                >
                  Press R to reload the sheriff
                </div>
              )}
              {/* Upgrade hint: show when we want player to press F */}
              {showUpgradeHint && showHUD && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 128,
                    zIndex: 10000,
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    borderRadius: 8,
                    pointerEvents: 'none',
                    border: '1px solid rgba(0,0,0,0.12)'
                  }}
                >
                  Press F to upgrade the sheriff
                </div>
              )}
              {showHostagePrompt && showHUD && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 160,
                    zIndex: 10000,
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    borderRadius: 8,
                    pointerEvents: 'none',
                    border: '1px solid rgba(0,0,0,0.12)'
                  }}
                >
                  Press F to accept
                </div>
              )}
              {completionMessage && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.4)",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 18px",
                      background: "rgba(255,255,255,0.9)",
                      borderRadius: 8,
                      fontFamily: "monospace",
                      fontSize: 18,
                      color: "#222",
                      border: "1px solid rgba(0,0,0,0.2)",
                    }}
                  >
                    {completionMessage}
                  </div>
                </div>
              )}
              {/* Cutscene Dialogue Overlay */}
              {dialogVisible && (
                <div
                  role="button"
                  onClick={() => onDialogClick()}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 12,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    zIndex: 10002,
                  }}
                >
                  <div
                    style={{
                      width: '92%',
                      maxWidth: 980,
                      background: 'rgba(10,10,10,0.92)',
                      color: '#fff',
                      borderRadius: 12,
                      padding: '18px 20px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ width: 148, height: 148, flex: '0 0 148px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={(customDialogLinesRef.current ?? (introActive ? INTRO_DIALOG_LINES : DIALOG_LINES))[dialogLineIndex]?.img}
                        alt={(customDialogLinesRef.current ?? (introActive ? INTRO_DIALOG_LINES : DIALOG_LINES))[dialogLineIndex]?.speaker}
                        draggable={false}
                        style={{ width: 148, height: 148, objectFit: 'cover', imageRendering: 'pixelated', borderRadius: 8 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{(customDialogLinesRef.current ?? (introActive ? INTRO_DIALOG_LINES : DIALOG_LINES))[dialogLineIndex]?.speaker}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 20, lineHeight: 1.3, minHeight: 58 }}>{dialogDisplayed}</div>
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Click to progress</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
