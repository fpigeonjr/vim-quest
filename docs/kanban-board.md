# Vim Quest - Level 2 "Word Woods" Kanban Board

> **Note**: This is a markdown-based kanban board. For a real GitHub Project, create a new project in your repo and add these issues in the suggested order.

## Board Columns

### 1. 📋 Backlog (Planned but not started)
- Issues that are defined but not yet started

### 2. ⏳ In Progress
- Currently active issues being worked on

### 3. ✅ Done / Complete  
- Issues that have been completed

---

## Issue Cards (In Logical Workflow Order)

### 🟢 Story #2: Author Zone 2 map layout data (A-G regions)
**Status:** ✅ **Done** (Closed Apr 22, 2026)

**Acceptance Criteria:**
- [x] Region data for A, B, C1, C2, D, E, F/G with plan bounds
- [x] Transition links match Zone 2 flow
- [x] Collision/layout supports C1 dead-branch and C2 overshoot loops
- [x] Arrival Clearing checkpoint + hint obelisk metadata

**Validation:** ✅ Test report in `docs/test-reports/zone2-map-layout/`

---

### 🟡 Story #3: Implement tutorial + branch token gating (B/C1/C2/D)
**Status:** ⏳ **Current Task** (Next up!)

**Acceptance Criteria:**
- [ ] In B, split branches locked until 3 marker pads cleared
- [ ] Completing C1 awards canopy token + records completion
- [ ] Completing C2 awards root token + records completion  
- [ ] Entry to D locked until both tokens exist + feedback
- [ ] Gating aligns with LO-2.1 (w progression) and LO-2.2 (b recovery)

**Dependencies:** ✅ Story #2 complete

**Validation:** Need to create `docs/test-reports/zone2-gating/`

---

### 🟣 Story #4: Add Echo Arbor shrine unlock for e
**Status:** 📋 Backlog

**Acceptance Criteria:**
- [ ] `e` command unlock at Echo Arbor shrine with visual feedback
- [ ] Micro-test requires landing on word ends with `e`
- [ ] HUD updates to show `e` as available command
- [ ] Command works in subsequent zones

**Dependencies:** ⏳ Story #3 (requires D unlock system)

**Validation:** Save evidence in `docs/test-reports/zone2-shrine-unlock/`

---

### 🔵 Story #5: Build Precision Terraces + Sentence Gate mastery flow
**Status:** 📋 Backlog

**Acceptance Criteria:**
- [ ] Mixed lanes combining `w b e` with occasional `0/$` reset rails
- [ ] Clear 4 terrace runes to open mini-shrine in E
- [ ] Final Sentence Gate validates command fluency under pressure
- [ ] Zone completion unlocks route back to hub

**Dependencies:** ⏳ Story #4 (requires `e` command)

**Validation:** Save evidence in `docs/test-reports/zone2-mastery/`

---

### 🟠 Story #6: Implement optional side quests SQ1-SQ3
**Status:** 📋 Backlog

**Acceptance Criteria:**
- [ ] SQ1: Lost Lexicon Pages in North canopy hidden spurs
- [ ] SQ2: Echo Seed Time Trial in South root loop
- [ ] SQ3: Caret Cartographer in Precision terraces
- [ ] All side quests are non-blocking to main path

**Dependencies:** ⏳ Story #5 (requires E terraces)
**Can be worked on in parallel with Story #7**

**Validation:** Save evidence in `docs/test-reports/zone2-side-quests/`

---

### 🟤 Story #7: Add LO-2 telemetry hooks and pass/fail tracking
**Status:** 📋 Backlog

**Acceptance Criteria:**
- [ ] Telemetry hooks for LO-2.1 through LO-2.6
- [ ] Capture attempt counts and invalid-command metrics
- [ ] Emit pass/fail signals at checkpoints
- [ ] Output format consumable by test scripts

**Dependencies:** ⏳ Stories #3, #4, #5 (requires all checkpoints)
**Can be worked on in parallel with Story #6**

**Validation:** Save artifacts in `docs/test-reports/zone2-telemetry/`

---

### 🔴 Story #8: Add Zone 2 scripted playthrough + regression report
**Status:** 📋 Backlog

**Acceptance Criteria:**
- [ ] Main-path script covers A→B→C1/C2→D→E→F/G
- [ ] Optional branch coverage includes SQ1, SQ2, SQ3
- [ ] Script output includes reproducible artifacts
- [ ] Regression report summarizes build result + telemetry

**Dependencies:** ⏳ All previous stories (#2-7)

**Validation:** Consolidated report in `docs/test-reports/zone2-playthrough/`

---

### 🟢 Epic #1: Zone 2: Word Woods - Epic
**Status:** 📋 Backlog (parent epic for all stories)

**Scope:** Complete Zone 2 implementation as per plan
**Completed when:** All Stories #2-8 are done

---

## Workflow Dependencies Graph

```
Story #2 (Map Layout) ──────┐
    ↓                        │
Story #3 (Tutorial Gating)  │
    ├── Story #4 (e Shrine) │ Can be parallel
    ├── Story #5 (Terraces) │ development
    │    ├── Story #6 (Side Quests) 
    │    └── Story #7 (Telemetry)
    └── Story #8 (Playthrough)
```

## Recommended Sprint Order

1. **Current Sprint:** Story #3 (Tutorial Gating)
2. **Next Sprint:** Story #4 (e Shrine) + Story #5 (Terraces)
3. **Next Sprint:** Story #6 (Side Quests) + Story #7 (Telemetry)  
4. **Final Sprint:** Story #8 (Playthrough)

## How to Use This Board

1. **Update statuses** as you work through issues
2. **Check off acceptance criteria** when complete
3. **Add validation links** to test reports
4. **Create GitHub Project** from this template if desired
5. **Use `/` command palette** in-game to test Zone 2

---

*Last updated: 2026-04-23*