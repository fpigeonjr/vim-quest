# Vim Quest Spec

This document is the working product spec and implementation plan for turning Vim Quest from a small browser prototype into a Zelda-like learning adventure built with Phaser.

## Vision

Vim Quest is a top-down 2D browser adventure inspired by Vim Adventures and classic Zelda games. The player explores a connected world, unlocks new Vim commands as abilities, and uses them for traversal, puzzles, and mastery challenges.

The goal is not just to expose commands, but to teach them through repeated, meaningful use in an interactive world.

## Product Goals

- Build a real-feeling adventure game with exploration, discovery, and progression
- Teach Vim motions and commands in a deliberate order
- Make command unlocks feel like Zelda items or powers
- Reuse previously learned commands in new puzzle contexts
- Support a clean content pipeline so additional zones and dungeons are easy to add

## Design Pillars

### Exploration

- Overworld traversal with towns, shrines, dungeons, shortcuts, and secrets
- Camera-following movement and room-to-room or smooth map scrolling
- Revisiting old areas with new commands reveals new paths

### Skill Building

- Each command is introduced in isolation
- Then practiced safely
- Then combined with earlier commands in higher-pressure spaces
- Then tested in a dungeon or mastery room

### Command-as-Ability

- Unlocking a Vim command should feel like acquiring a tool
- Commands are represented in-world as relics, lessons, shrines, or mentor gifts
- The HUD should clearly show unlocked commands and current mode

### Strong Feedback

- Immediate response for valid and invalid inputs
- Clear mode changes
- Readable puzzle state
- Fast reset/retry loops for learning

## Target Experience

- Browser-based
- Keyboard-first
- Top-down 2D adventure built with Phaser 3
- Visual direction: minimal text-and-glyph world with stylish 2D tiles
- Tone: playful, exploratory, a little mystical, never dry or tutorial-heavy

## Audience

- People new to Vim who want an interactive learning path
- Developers who enjoy puzzle/adventure games
- Experienced Vim users who want challenge content and speed mastery

## Platform and Tech Direction

### Runtime

- Browser game
- Phaser 3
- TypeScript
- Vite for local development and bundling

### Why Phaser

- Scene system
- Camera and scrolling support
- Tilemap workflow
- Collision and entity handling
- Better long-term structure than a single-file canvas prototype

## High-Level Game Structure

### Overworld Hub

- Safe starting area
- NPC mentors introduce mechanics
- Gates point toward command-specific regions
- Acts as a return point between zones

### Regions

Each region teaches one command family and includes:

- tutorial area
- low-pressure practice spaces
- environmental puzzle rooms
- optional side challenge
- mini-dungeon or shrine
- command mastery gate or boss encounter

### Dungeons

- Focus on recombining skills already learned
- Introduce higher-stakes traversal and puzzle logic
- End in a challenge that proves command understanding

## Command Progression

### Tier 1: Basic Movement

- `h`
- `j`
- `k`
- `l`
- `Esc`

### Tier 2: Navigation

- `w`
- `b`
- `e`
- `0`
- `$`

### Tier 3: Editing Basics

- `x`
- `i`
- `a`

### Tier 4: Operators and Recovery

- `dd`
- `yy`
- `p`
- `u`

### Tier 5: Search and Find

- `/`
- `?`
- `n`
- `N`
- `f`
- `F`
- `t`
- `T`

### Tier 6: Selection and Combos

- `v`
- `dw`
- `cw`
- simple text objects

### Tier 7: Advanced Mastery

- substitutions
- macros
- combo shrines and challenge rooms

## World Plan

### Zone 1: Cursor Meadow

- teaches `h j k l`
- small safe area
- introduces walls, switches, paths, and doors
- final shrine grants movement certification

### Zone 2: Word Woods

- teaches `w b e`
- traversal across word-based stepping stones or branch platforms
- optional puzzles reward precise word targeting

### Zone 3: Line Ruins

- teaches `0 $`
- horizontal traversal and line-end warps
- puzzles about reaching extremes and bouncing between anchors

### Zone 4: Insert Caverns

- teaches `i` and possibly `a`
- activate runes, place symbols, restore bridges, awaken mechanisms

### Zone 5: Operator Keep

- teaches `x`, `dd`, `yy`, `p`, `u`
- remove hazards, alter structures, copy patterns, recover from mistakes

### Zone 6: Search Catacombs

- teaches `/ ? n N f F t T`
- hidden routes, pressure encounters, target acquisition puzzles

### Zone 7: Visual Citadel

- teaches `v` and higher-order combinations
- multi-tile selection puzzles and advanced editing sequences

### Final Dungeon

- combines movement, search, editing, and mode transitions
- tests fluency, not memorization alone

## Core Systems

### Engine and Scene Management

- boot scene
- preload scene
- title scene
- world scene
- dungeon scene(s)
- UI scene
- pause / inventory scene later

### Input System

- keyboard-first input router
- mode-aware command handling
- command buffering and parsing
- quick feedback for partial, invalid, and complete commands

### Vim System

- mode state machine
- unlock registry
- parser and executor
- command history hooks for tutorials and analytics later

### World System

- tilemap loading
- collision layers
- triggers and puzzle regions
- interactable objects
- NPC conversation points

### Save System

- browser local storage first
- unlocked commands
- checkpoint / room progress
- optional challenge completion

### UI System

- HUD for mode and unlocked commands
- command line / input buffer
- dialogue boxes
- hint system
- puzzle state messaging

## Content Architecture

The current hardcoded room layout should be replaced with data-driven content.

### Recommended Structure

- `src/main.ts`
- `src/game/config.ts`
- `src/scenes/`
- `src/entities/`
- `src/systems/input/`
- `src/systems/vim/`
- `src/systems/save/`
- `src/ui/`
- `src/content/maps/`
- `src/content/puzzles/`
- `src/content/dialogue/`

### Content Format Goals

- tilemaps for overworld and dungeons
- JSON or TS data for puzzle triggers
- dialogue files separate from scene logic
- unlock requirements defined as data, not hand-wired logic

## Immediate Replatform Plan

The current project is a prototype. We should not keep layering major systems on top of the single-file runtime.

### Phase 0: Replatform to Phaser

- add Phaser, TypeScript, and Vite
- replace the current single-file runtime with a scene-based app shell
- create boot, preload, and world scenes
- establish asset and map folders

### Phase 1: Core Vertical Slice Foundation

- top-down player movement
- camera follow and map boundaries
- collisions and interactable triggers
- HUD for mode, area, and unlocked commands
- command parser wired into player interactions

### Phase 2: First Playable Vertical Slice

- one overworld region
- one dungeon
- unlock path for `h j k l`, `w b`, `0 $`, `x`, `i`
- one NPC mentor loop
- one mastery gate
- save progress in local storage

### Phase 3: Content and Teaching Polish

- better onboarding and guided dialogue
- stronger feedback for failed commands
- retry/reset affordances
- clearer puzzle visual language

### Phase 4: Expansion

- additional zones
- enemy interactions
- side challenges
- revisitation shortcuts
- advanced command families

### Phase 5: Release Polish

- sound and animation polish
- title/menu flow
- accessibility and tuning
- balancing and QA passes

## Vertical Slice Definition

The vertical slice is the most important milestone. It should prove the game is fun as an adventure game and effective as a Vim learning tool.

### Vertical Slice Must Include

- Phaser-based architecture
- scrolling overworld area
- one dungeon or shrine
- mode-aware HUD
- command unlock flow
- at least three puzzle patterns using the same commands differently
- save/load of unlocked progression

### Commands Included in Slice

- `h j k l`
- `w b`
- `0 $`
- `x`
- `i`

### Success Criteria

- movement feels good
- camera and map readability feel adventure-game quality
- command unlocks are intuitive and exciting
- puzzles reinforce commands instead of just naming them
- the slice feels replayable and expandable

## Risks

### Scope Risk

- building too many command families too early

### Engine Risk

- trying to evolve the prototype instead of replatforming cleanly

### Content Risk

- adding systems faster than we can design good teaching puzzles

### UX Risk

- making commands feel academic instead of playful and physical

## Working Principles

- build one polished vertical slice before broad expansion
- keep new systems data-driven where possible
- prefer short feedback loops and playable milestones
- do not add advanced commands until earlier ones feel good
- keep the Vim fantasy strong in UI, worldbuilding, and puzzle design

## Current Status

### Done

- Phaser + TypeScript + Vite architecture
- scrolling overworld (Cursor Meadow / Zone 1)
- tilemap pipeline with generated textures
- entity system with physics collision
- save system via localStorage
- structured content pipeline (`src/content/`)
- Zelda-like progression loop with gates, shrines, and relics
- slash command warp system
- **Zone 2 (Word Woods) word-jump mechanics** — w/b/e along data-driven lanes
- hazard system with checkpoint respawn

### In Progress

- Zone 2 polish: NPC dialogue, natural entrance from Level 1, E/FG regions
- Zone 3+ planning

### Not Done

- Proper tileset art pass (still using generated textures)
- Enemy/pressure encounters
- Sound and music polish
- Accessibility features

## Next Tasks

1. ~~Replatform to `Phaser + TypeScript + Vite`~~ ✅
2. ~~Create scene skeletons and app bootstrap~~ ✅
3. ~~Build one scrolling overworld test map~~ ✅
4. ~~Add player controller and camera follow~~ ✅
5. ~~Add a command HUD and unlock registry~~ ✅
6. ~~Port the first set of commands into the new architecture~~ ✅
7. ~~Build the first tutorial region and one dungeon~~ ✅
8. ~~Build Zone 2 word-jump mechanics~~ ✅
9. Add natural Zone 2 entrance from Level 1 completion
10. Add Zone 2 NPC mentor and dialogue beats
11. Build Region E precision terrace puzzles
12. Build Region FG lexeme shrine mastery gate

## Progress Tracker

### Milestone 0: Replatform

- [x] Add Phaser
- [x] Add TypeScript
- [x] Add Vite
- [x] Create scene structure
- [x] Replace prototype entrypoint

### Milestone 1: Engine Foundation

- [x] Camera follow
- [x] Tilemap loading
- [x] Collision layers
- [x] Player entity
- [x] UI scene
- [x] Slash command warp system

### Milestone 2: Vertical Slice

- [x] Overworld region (Cursor Meadow)
- [x] First dungeon (Cursor Shrine — 3 rooms)
- [x] Unlock progression (h/j/k/l → w/b → 0/$ → x → i)
- [x] Save/load
- [x] Puzzle scripting (crate breaking, bridge building, flag capture)

### Milestone 3: Zone 2 — Word Woods

- [x] Data-driven region layout (A through FG)
- [x] Word-jump mechanics (w, b, e)
- [x] Anchor snaps (0, $)
- [x] Lane transitions across region boundaries
- [x] Gate progression (tutorial pads → branch gates → tokens → D gate)
- [x] Hazard system (dead branches, overshoot loops, reset rails)
- [x] e-shrine unlock at Echo Arbor
- [x] Automated playthrough validation
- [ ] Natural entrance from Level 1 (currently slash-only)
- [ ] NPC mentor dialogue in arrival clearing
- [ ] Region E precision terrace puzzles
- [ ] Region FG lexeme shrine mastery gate

### Milestone 4: Teaching Polish

- [x] NPC guidance (Level 1 mentor)
- [x] Hint system (HUD hint text)
- [x] Command feedback (toast messages, locked command warnings)
- [x] Reset/retry flow (hazard checkpoint respawn)
- [ ] Better onboarding for Zone 2
- [ ] Zone 2 dialogue and teaching beats
