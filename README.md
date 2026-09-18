# Cattachasm

---

## Overview

**Cattachasm** is a 2D platformer game originally created as a personal gift for an online friend who loves cats, memes, and video games. What started as a small passion project quickly grew into something I am genuinely proud of and decided to include in my portfolio.

The game was developed in **five days**, and while it does not follow perfect architectural practices, it demonstrates creativity, rapid problem-solving, and the ability to turn an idea into a fully playable experience within a short timeframe.

---

## Project Background

This project was initially never intended for public release. Development was done rapidly, resulting in a monolithic structure where most of the game mechanics were implemented in a single file. At the time, the goal was to build a short mini-game rather than a full project.

As development progressed, the project evolved into a complete experience featuring a short story, a boss fight, and a clear objective. The game draws inspiration from **Terraria**, **Mario**, and various cat memes commonly seen across social media platforms.

Although the game still contains known bugs and areas for improvement, it stands as a completed project that reflects growth, experimentation, and commitment to finishing what was started.

The codebase has since been restructured. The original core was a single 4,756-line React component — roughly 94% of all source code — in which one `useEffect` of 3,436 lines held the physics, rendering, audio, cutscenes and level data together. That component has been broken apart into a typed engine, a rendering layer, a set of per-frame systems and a thin React shell, without changing how the game plays.

---

## Project Structure

```
src/
  app/          Router and application shell
  pages/        One component per screen
  components/   Presentational UI (game overlays, shared controls)
  game/         The engine — plain TypeScript, no React
    core/       Map, physics, camera, collision, entities, tracers, world
    systems/    Per-frame rules (traps, pickups, combat, enemies, boss)
    render/     Canvas drawing (tiles, background, sprites, HUD, scene)
    audio/      Audio manager and the sound table
    dom/        Animated sprites layered over the canvas
    scripted/   Intro and boss-fight sequences
    engine/     Game session, input, and the bridge back into React
    data/       Level layouts, dialogue, tile vocabulary
  hooks/        React bindings (useGameEngine, useDialogue)
  styles/       CSS, split by page and component
```

Animated characters are DOM `<img>` elements positioned over the canvas each
frame: drawing a GIF into a canvas freezes it on its first frame, so anything
that needs to animate lives in `game/dom/` rather than `game/render/`.

---

## Gameplay Summary

You play as a cat on a mission to rescue another trapped cat, guarded by a boss enemy. The gameplay combines classic platformer mechanics with lighthearted humor and meme-inspired elements.

---

## Development Notes

- Development Time: **5 days** (original build)
- Code Structure: **Modular — engine, systems, rendering and UI separated**
- Current Status: **Playable with known bugs**
- Planned Improvements:
  - Bug fixes and performance optimizations
  - Gameplay balancing and visual polish

---

## Technologies Used

- React 19
- TypeScript
- Vite
- HTML5 Canvas 2D (the game renders to a canvas; React only frames it)
- Plain CSS, split per page and component

No game engine, router or UI library — everything above the browser APIs is
hand-written.

---

## Running Locally

```bash
npm install
npm run dev      # development server
npm run build    # type-check and produce a production build
npm run lint     # ESLint
```

### Controls

| Key | Action |
| --- | --- |
| `A` / `D` | Move left and right |
| `Space` | Jump |
| `F` | Shoot, accept an item, or take an upgrade |
| `R` | Reload the sheriff |
| Left click | Aim and fire at the boss; hold to cut the bridge rope |

---
