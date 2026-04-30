# Vim Quest Task Board

Use this file as the lightweight execution checklist derived from `docs/spec.md`.

## Current Focus

- Build Wave 1 on top of the new Phaser foundation ✅
- Expand the scrolling overworld into the first real tutorial region ✅
- Add the first dungeon entrance and scripted lesson flow ✅
- **Implement Zone 2 (Word Woods) word-jump mechanics** ✅

## Completed

- [x] Replatform to Phaser + TypeScript + Vite
- [x] Level 1: Cursor Meadow — complete with shrines, crates, bridge, flag
- [x] Level 1: Cursor Shrine dungeon — 3-room dungeon with relic
- [x] Save/load system with localStorage
- [x] Slash command warp system
- [x] Zone 2 data layout — 7 regions, transitions, collision features
- [x] Zone 2 word-jump mechanics — w/b/e along defined word lanes
- [x] Zone 2 lane transitions — cross from B→C1/C2, C1/C2→D, D→E→FG
- [x] Zone 2 gate system — tutorial pads open branch gates, tokens open D gate
- [x] Zone 2 hazard system — dead branches, overshoot loops, reset rails
- [x] Zone 2 e-shrine unlock — e command unlocked at Echo Arbor (68,28)
- [x] Zone 2 anchor snaps — 0/$ snap to lane start/end
- [x] Zone 2 automated playthrough script (27-step validation)

## Ready Next

- [ ] Natural Zone 2 entrance from Level 1 completion (not just slash command)
- [ ] Add NPC mentor dialogue in Zone 2 arrival clearing
- [ ] Region E precision terrace puzzles — mixed w/b/e with 0/$ reset rails
- [ ] Region FG lexeme shrine — final mastery gate before returning to hub
- [ ] Add enemies/pressure encounters to Word Woods
- [ ] Replace generated textures with a proper tileset pass

## Later

- Zone 3: Line Ruins (0 $)
- Zone 4: Insert Caverns (i a)
- Zone 5: Operator Keep (x dd yy p u)
- Sound and animation polish
- Accessibility and tuning
