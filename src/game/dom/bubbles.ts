import { SCALE } from "../constants";
import type { Camera, Rect } from "../types";

/**
 * A floating hint that bobs above a pickup.
 *
 * Kept as a DOM node rather than React state because it is positioned from the
 * render loop, at frame rate, and re-rendering React for that would be wasteful.
 */
export class SpeechBubble {
  private readonly parent: HTMLElement;
  private readonly text: string;
  private el: HTMLDivElement | null = null;

  constructor(parent: HTMLElement, text: string) {
    this.parent = parent;
    this.text = text;
  }

  get isMounted(): boolean {
    return this.el !== null;
  }

  private mount(): HTMLDivElement {
    const div = document.createElement("div");
    div.textContent = this.text;
    div.className = "game-bubble";
    this.parent.appendChild(div);
    this.el = div;
    return div;
  }

  /** Centres the bubble above `target` and shows it. */
  showAbove(target: Rect, camera: Camera): void {
    const el = this.el ?? this.mount();

    const screenX = Math.round((target.x - camera.x) * SCALE);
    const screenY = Math.round((target.y - camera.y) * SCALE);
    const targetWidth = Math.round(target.w * SCALE);
    const bubbleWidth = el.getBoundingClientRect().width || 80;

    el.style.left = `${screenX + Math.round((targetWidth - bubbleWidth) / 2)}px`;
    el.style.top = `${screenY - 28}px`;
    el.style.display = "block";
  }

  hide(): void {
    if (this.el) this.el.style.display = "none";
  }

  remove(): void {
    this.el?.remove();
    this.el = null;
  }
}
