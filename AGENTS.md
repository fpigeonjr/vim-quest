# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the game code. Scene entry points live in `src/scenes/` (`TitleScene.ts`, `WorldScene.ts`, `DungeonScene.ts`), shared game state is in `src/game/`, and reusable map helpers are in `src/systems/`. Static assets live under `public/assets/`. Automation and scripted walkthroughs live in `scripts/`. Product notes and captured reports belong in `docs/`, especially `docs/spec.md`, `docs/tasks.md`, and `docs/test-reports/`.

## Build, Test, and Development Commands

- `corepack pnpm dev` starts the Vite dev server for local playtesting.
- `corepack pnpm build` runs TypeScript compilation and produces a production bundle in `dist/`.
- `corepack pnpm preview` serves the built app locally.
- `node scripts/playthrough.mjs` runs the Level 1 scripted walkthrough against a running dev server.
- `node scripts/cave-playthrough.mjs` runs the cave regression walkthrough and writes screenshots to `docs/test-reports/cave-playthrough/`.

Use `corepack pnpm install` to install dependencies if the workspace is not initialized.

## Coding Style & Naming Conventions

Write TypeScript with 2-space indentation, semicolons, and single quotes, matching the existing code. Use `PascalCase` for scene classes, `camelCase` for functions and fields, and `UPPER_SNAKE_CASE` for module constants like tile sizes or map dimensions. Keep changes local to the system you are touching; do not refactor unrelated scenes during bug fixes. Prefer small helper methods over deeply nested scene logic.

## Testing Guidelines

There is no formal unit-test suite yet. Validation is currently build-and-walkthrough based:

- Always run `corepack pnpm build` after code changes.
- For gameplay changes, run the most relevant scripted flow under `scripts/`.
- Save new visual evidence or HTML reports under `docs/test-reports/` when documenting regressions or fixes.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commit messages such as `Improve cave flow and report` and `Fix Level 1 bugs and add polish improvements`. Follow that pattern: lead with the user-facing change, keep it concise, and avoid noisy prefixes.

Pull requests should include a brief summary, note any gameplay or scene-flow changes, list validation commands run, and attach screenshots or report links for visual changes.

## Security & Configuration Tips

Do not commit secrets or local-only credentials. The Playwright scripts assume a running local server, usually `http://127.0.0.1:8080/`, and dev-only automation hooks are exposed only in Vite dev mode.
