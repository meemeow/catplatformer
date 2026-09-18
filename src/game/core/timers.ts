/**
 * Tracks every timer the engine schedules so a level change or unmount can
 * cancel all of them at once.
 *
 * The original loop kept a loose array of ids and cleared them by hand in
 * several places, which is how stale respawns survived a level reset.
 */
export class TimerBag {
  private readonly timeouts = new Set<number>();
  private readonly intervals = new Set<number>();

  setTimeout(handler: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this.timeouts.delete(id);
      handler();
    }, ms);
    this.timeouts.add(id);
    return id;
  }

  setInterval(handler: () => void, ms: number): number {
    const id = window.setInterval(handler, ms);
    this.intervals.add(id);
    return id;
  }

  clearTimeout(id: number | null): void {
    if (id === null) return;
    window.clearTimeout(id);
    this.timeouts.delete(id);
  }

  clearInterval(id: number | null): void {
    if (id === null) return;
    window.clearInterval(id);
    this.intervals.delete(id);
  }

  clearAll(): void {
    for (const id of this.timeouts) window.clearTimeout(id);
    for (const id of this.intervals) window.clearInterval(id);
    this.timeouts.clear();
    this.intervals.clear();
  }
}
