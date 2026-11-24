# Changelog

All notable changes to this bundle. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 1.0.0 — 2026-11-24

First public release, packaging Claude Code Game Studios (commit `abc0de7`,
framework 1.3.0) for DeepSeek Harness.

### Added

- 78 workflow skills registered through a borrowed `skills` provider: 75 studio
  skills plus the `help` / `settings` / `changelog` aliases.
- 49 role briefs available through `ccgs_role`, and the full studio corpus
  (`studio/`: docs, engines, genres, hooks, rules, scripts, agents, repo docs).
- Tools: `ccgs_state` (project + stage + artifact observation), `ccgs_init`
  (scaffold), `ccgs_role` (role briefs), `ccgs_doc` (corpus list/read/search).
- `ccgs_init` writes `.claude/`, `project.yaml`, the design/docs/tests/production
  skeleton, a DSH-flavoured `AGENTS.md` and `production/session-state/active.md`.
- Display metadata: `icon.svg`, `locale/en.json`, `locale/zh.json`, `docs/DETAIL.md`.
- Self-test suite (`test/bundle.test.mjs`) running the bundle against a fake
  context and real files, and a CI workflow for it.
- `scripts/build-from-upstream.mjs`, the deterministic generator for `skills/`
  and `studio/`.

### Known limits

- Studio shell helpers (`.claude/scripts/*.sh`, `.claude/hooks/*.sh`) need a
  POSIX bash; without one, state reads go through `ccgs_state` and writes through
  the host file tools.
- Claude Code hooks, settings and slash-command dispatch are not ported.
