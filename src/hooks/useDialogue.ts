import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioManager } from "../game/audio/AudioManager";
import { TIMINGS } from "../game/constants";
import type { DialogueLine } from "../game/types";

export interface DialogueCues {
  /** Runs before any advance, to cut voice clips that are still playing. */
  onAdvanceRequested?: () => void;
  /** Runs as each line starts typing. */
  onLineStart?: (line: DialogueLine) => void;
  /**
   * Chance to take over an advance inside the built-in sequence, for beats
   * that move the player instead of showing the next line. Return true to
   * suppress the default behaviour.
   */
  interceptAdvance?: (currentIndex: number, nextIndex: number) => boolean;
  /** Runs when the built-in sequence reaches its end. */
  onBuiltInEnd?: () => void;
}

export interface DialogueController {
  visible: boolean;
  lineIndex: number;
  /** The characters typed so far. */
  displayed: string;
  /** The sequence currently playing. */
  lines: DialogueLine[];
  currentLine: DialogueLine | undefined;
  /** Starts a one-off sequence and shows the box. */
  startSequence: (lines: DialogueLine[], onComplete?: () => void) => void;
  /** Loads a sequence without showing it, for scripted beats that show later. */
  queueSequence: (lines: DialogueLine[], onComplete?: () => void) => void;
  /** Shows the box and starts typing the given line of the active sequence. */
  showFrom: (lineIndex: number) => void;
  /** Click handler: finishes the current line, or moves to the next. */
  advance: () => void;
  /** Hides the box and drops any queued sequence. */
  reset: () => void;
  setVisible: (visible: boolean) => void;
}

/**
 * Drives the typewriter dialogue box.
 *
 * A sequence is either the built-in one passed as `defaultLines` or a one-off
 * passed to `startSequence`. Only the latter reports completion, which is how
 * the scripted beats chain together.
 */
export const useDialogue = (
  defaultLines: DialogueLine[],
  audio: AudioManager | null,
  cues: DialogueCues = {},
): DialogueController => {
  const [visible, setVisible] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [customLines, setCustomLines] = useState<DialogueLine[] | null>(null);

  const onCompleteRef = useRef<(() => void) | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const charIndexRef = useRef(0);

  // The cues close over fresh state each render; the typing timer must not, so
  // they are reached through a ref that is refreshed after every commit.
  const cuesRef = useRef(cues);
  useEffect(() => {
    cuesRef.current = cues;
  });

  const lines = customLines ?? defaultLines;
  /** The sequence the timer and click handler act on. */
  const linesRef = useRef<DialogueLine[]>(defaultLines);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current !== null) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    audio?.stop("dialogue");
  }, [audio]);

  const typeLine = useCallback(
    (index: number) => {
      const line = linesRef.current[index];
      if (!line) return;

      cuesRef.current.onLineStart?.(line);

      setLineIndex(index);
      setDisplayed("");
      charIndexRef.current = 0;

      if (typingTimerRef.current !== null) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      if (audio?.isUnlocked) audio.play("dialogue");

      typingTimerRef.current = window.setInterval(() => {
        const next = Math.min(line.text.length, charIndexRef.current + 1);
        charIndexRef.current = next;
        setDisplayed(line.text.slice(0, next));

        if (next >= line.text.length) stopTyping();
      }, TIMINGS.dialogueCharMs);
    },
    [audio, stopTyping],
  );

  const startSequence = useCallback(
    (sequence: DialogueLine[], onComplete?: () => void) => {
      linesRef.current = sequence;
      setCustomLines(sequence.slice());
      onCompleteRef.current = onComplete ?? null;
      setVisible(true);
      typeLine(0);
    },
    [typeLine],
  );

  const queueSequence = useCallback(
    (sequence: DialogueLine[], onComplete?: () => void) => {
      linesRef.current = sequence;
      setCustomLines(sequence.slice());
      onCompleteRef.current = onComplete ?? null;
    },
    [],
  );

  const showFrom = useCallback(
    (index: number) => {
      setVisible(true);
      typeLine(index);
    },
    [typeLine],
  );

  const reset = useCallback(() => {
    stopTyping();
    setCustomLines(null);
    linesRef.current = defaultLines;
    onCompleteRef.current = null;
    setVisible(false);
    setDisplayed("");
    setLineIndex(0);
    charIndexRef.current = 0;
  }, [defaultLines, stopTyping]);

  const advance = useCallback(() => {
    cuesRef.current.onAdvanceRequested?.();

    const activeLines = linesRef.current;
    const line = activeLines[lineIndex];
    if (!line) return;

    // Still typing: a click completes the line rather than skipping it.
    if (charIndexRef.current < line.text.length) {
      stopTyping();
      charIndexRef.current = line.text.length;
      setDisplayed(line.text);
      return;
    }

    const next = lineIndex + 1;
    const isCustom = customLines !== null;

    if (next < activeLines.length) {
      if (!isCustom && cuesRef.current.interceptAdvance?.(lineIndex, next)) return;
      typeLine(next);
      return;
    }

    if (isCustom) {
      const onComplete = onCompleteRef.current;
      setCustomLines(null);
      linesRef.current = defaultLines;
      onCompleteRef.current = null;
      setVisible(false);
      onComplete?.();
    } else {
      cuesRef.current.onBuiltInEnd?.();
    }
  }, [customLines, defaultLines, lineIndex, stopTyping, typeLine]);

  useEffect(() => stopTyping, [stopTyping]);

  return {
    visible,
    lineIndex,
    displayed,
    lines,
    currentLine: lines[lineIndex],
    startSequence,
    queueSequence,
    showFrom,
    advance,
    reset,
    setVisible,
  };
};
