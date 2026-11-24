---
name: test-setup
description: "Sets up the test framework and CI: tests/ directory, engine runner, GitHub Actions workflow. Use once, before the first sprint."
---

> **DSH adapter.** Converted from Donchitos/Claude-Code-Game-Studios (MIT) for DeepSeek Harness; the workflow steps are unchanged.
> Tool mapping: `subagent_type: X` -> `ccgs_role` then `subagent`; `AskUserQuestion` -> `ask_user_question`; `Skill(<name>)` -> the `skill` tool; Read/Write/Edit/Glob/Grep/Bash -> this host's file, search and shell tools.
> Studio helpers (`.claude/scripts/*.sh`, `.claude/hooks/*.sh`) need a POSIX bash. Where bash is unavailable, read state with `ccgs_state` and make the same writes with the file tools instead.
> Run `ccgs_init({path})` once per project so `.claude/` and `project.yaml` exist; use `ccgs_doc` to read studio docs and `ccgs_role` for the 49 studio role briefs.

!`bash "${CLAUDE_SKILL_DIR}/../../hooks/yaml-helper.sh" resolve_config --keys automation,workflow,qa.level`

**Automation mode**: Resolve `modes.automation` (`project.local.yaml` →
`project.yaml` → default `collaborative`). Every question and
every file write follows `.claude/docs/automation-modes.md`
(collaborative asks always · guided major-only · autonomous logs and proceeds;
`automation_always_ask` categories always prompt).

# Test Setup

This skill scaffolds the automated testing infrastructure for the project.
It detects the configured engine, generates the appropriate test runner
configuration, creates the standard directory layout, and wires up CI/CD
so tests run on every push.

Run this once during the Technical Setup phase, before any implementation
begins. A test framework installed at sprint start costs 30 minutes.
A test framework installed at sprint four costs 3 sprints.

**Output:** `tests/` directory structure + `.github/workflows/tests.yml`

---

## Phase 1: Detect Engine and Existing State

**Read `references/1-detect.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 2: Present Plan

**Read `references/2-plan.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 3: Create Directory Structure

**Read `references/3-directories.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 4: Create CI/CD Workflow

**Read `references/4-ci.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 5: Create Smoke Test Seed

**Read `references/5-smoke-seed.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Phase 6: Post-Setup Summary

**Read `references/6-summary.md` now and follow it** — this phase's steps are in that file, not here. Read it again if the conversation was compacted or resumed during this phase.

## Collaborative Protocol

- **Never overwrite existing test files** — only create files that are missing.
  If a test runner file exists, leave it as-is.
- **Always ask before creating files** — Phase 2 requires explicit approval.
- **Engine detection is non-negotiable** — if the engine is not configured,
  stop and redirect to `/setup-engine`. Do not guess.
- **`force` flag skips the "already exists" early-exit but never overwrites.**
  It means "create any missing files even if the directory already exists."
- For Unity CI, note that the `UNITY_LICENSE` secret must be configured
  manually. Do not attempt to automate license management.
