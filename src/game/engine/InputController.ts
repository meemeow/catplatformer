import { TILE } from "../constants";
import type { BossSequence } from "../scripted/bossSequence";
import { bossAimPoint, isPointOnBoss } from "../systems/combat";
import type { GameSession } from "./GameSession";

/**
 * Keyboard and pointer handling.
 *
 * Movement keys are sampled into `session.input` and read by the physics step;
 * everything else acts immediately. All input is ignored while a cutscene or
 * dialogue is on screen.
 */
export class InputController {
  private readonly session: GameSession;
  private readonly boss: BossSequence;

  constructor(session: GameSession, boss: BossSequence) {
    this.session = session;
    this.boss = boss;
  }

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("pointerup", this.onPointerUp);
    this.session.elements.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.session.elements.canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.session.elements.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.session.elements.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

  private readonly onKeyDown = (event: KeyboardEvent) => this.onKey(event, true);
  private readonly onKeyUp = (event: KeyboardEvent) => this.onKey(event, false);

  private onKey(event: KeyboardEvent, down: boolean): void {
    const { session } = this;
    if (session.inputsBlocked) return;

    const key = event.key.toLowerCase();
    if (key === "a") session.input.left = down;
    if (key === "d") session.input.right = down;

    if (event.code === "Space" || event.key === " ") {
      session.input.up = down;
      if (down) event.preventDefault();
    }

    if (key === "f") this.onActionKey(down);
    if (key === "r" && down) session.startReload();
  }

  /** F is context-sensitive: take the cutter, take the upgrade, or shoot. */
  private onActionKey(down: boolean): void {
    const { flags, input } = this.session;

    const canAcceptCutter =
      down &&
      flags.nearHostage &&
      (flags.seenHostageOutOfBullets || flags.seenHostageBossMoving);

    if (canAcceptCutter) {
      this.boss.acceptCutter();
      return;
    }

    if (down && flags.showUpgradeHint && flags.weaponType === "sheriff") {
      this.boss.upgradeToSniper();
      return;
    }

    input.attack = down;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const { session } = this;
    if (session.inputsBlocked || event.button !== 0) return;

    const { world, elements } = session;
    const canvas = elements.canvas;
    const rect = canvas.getBoundingClientRect();

    // The canvas is CSS-scaled, so screen pixels have to be converted back
    // into canvas pixels before they mean anything in world space.
    const worldX =
      world.camera.x + (event.clientX - rect.left) * (canvas.width / rect.width);
    const worldY =
      world.camera.y + (event.clientY - rect.top) * (canvas.height / rect.height);

    if (this.boss.beginCut(Math.floor(worldX / TILE), Math.floor(worldY / TILE))) {
      event.preventDefault();
      return;
    }

    if (world.boss && isPointOnBoss(world.boss, worldX, worldY)) {
      if (session.canFireNow()) {
        const aim = bossAimPoint(world.boss);
        session.fireAt(aim.x, aim.y, session.flags.weaponType ?? "sheriff");
      } else {
        // Out of ammo or still cooling down: fall through to a forward shot.
        session.input.attack = true;
      }
      event.preventDefault();
      return;
    }

    session.input.attack = true;
    event.preventDefault();
  };

  private readonly onPointerUp = (): void => {
    this.session.input.attack = false;
    this.boss.endCut();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };
}
