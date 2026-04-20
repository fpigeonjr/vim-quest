# Vim Quest

Vim Quest is a browser-based puzzle adventure inspired by Vim Adventures and old-school Zelda structure. You play as a blinking cursor and learn Vim motions by moving through short text-driven rooms.

## Current State

- 3 playable levels
- Canvas-based browser game with keyboard-only controls
- Normal, insert, visual, and command-style interactions
- Direct level jump commands for testing and demos

## Play Locally

You can open `index.html` directly, but a local server is more reliable for development.

### Install dependencies

```bash
corepack enable
corepack pnpm install
```

### Run the Phaser app

```bash
corepack pnpm dev
```

### Build for production

```bash
corepack pnpm build
```

## Play Online

**Live at:** https://vim-quest.pages.dev/

## Deploy

The site is hosted on Cloudflare Pages. To deploy updates:

```bash
pnpm deploy
```

Or manually:

```bash
pnpm build
wrangler pages deploy dist
```

### Note

The old single-file prototype has been replaced by the Phaser rewrite. Current development now happens in `src/`, and the app should be run through Vite.

## Controls

### Movement

- `h` move left
- `j` move down
- `k` move up
- `l` move right
- `w` jump to the next word start on the current line
- `b` jump to the previous word start on the current line
- `0` jump to the start of the current line
- `$` jump to the end of the current line

### Actions

- `x` remove a nearby obstacle
- `i` enter insert mode
- `Esc` leave insert, visual, or command mode

### Level 2 Editing

- `dd` delete the current line
- `yy` yank the current line
- `p` paste below the current line
- `u` undo the last change

### Level 3 Commands

- `/word` then `Enter` search forward
- `?word` then `Enter` search backward
- `fx` then `Enter` find a character forward on the current line
- `Fx` then `Enter` find a character backward on the current line
- `v` enter visual mode
- `:s/old/new` then `Enter` substitute on the current line

### Level Jump Commands

- `/1` then `Enter` go to Level 1
- `/2` then `Enter` go to Level 2
- `/3` then `Enter` go to Level 3

## Project Files

- `index.html` Vite entry HTML
- `src/` Phaser scenes, game systems, and content
- `docs/spec.md` product and architecture roadmap
- `docs/tasks.md` execution board

## Roadmap

- Improve puzzle clarity and level scripting
- Make command behavior closer to real Vim
- Add a title screen and better in-game onboarding
- Add tests for room logic and command parsing

## Planning Docs

- `docs/spec.md` product spec and phased roadmap
- `docs/tasks.md` lightweight execution board
