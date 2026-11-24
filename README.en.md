# dsh-ccgs-studio · Game studio

[Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) packaged as a **DeepSeek Harness (DSH)** bundle.

Installing it gives you **78 workflow skills**, **49 role briefs**, the studio corpus
(engine notes, genre chipsets, rules, docs) and four `ccgs_*` tools that read project
state, scaffold a project, and search the corpus. No Claude Code required.

- License: MIT (upstream MIT, packaging MIT)
- Upstream: commit `abc0de7`, framework `1.3.0`
- Verified on DSH `0.2.2-rc.5`, desktop profile, Windows 11
- Self-test: `node test/bundle.test.mjs` → 7/7

Chinese documentation: [README.md](./README.md)

## What it is

A DSH **bundle**: a plain package whose `cordis.patch.yml` inserts one loader row and
whose `index.js` exports `apply(ctx, config)` to register resources.

```
index.js              bundle entry: registers 78 skills + 4 tools
cordis.patch.yml      inserts this bundle into the DSH runtime
skills/               78 DSH skills (one SKILL.md each) + manifest.json
studio/               studio corpus (376 files) and the 49 role briefs
templates/AGENTS.md   entry-point doc written by ccgs_init
locale/ icon.svg      plugin list title, description, icon
docs/DETAIL.md        plugin detail page
test/bundle.test.mjs  self-test
```

## Background

The upstream project models a real game studio: 49 role subagents, a workflow-skill
library for the whole pipeline, a coordination system built on one `project.yaml`,
seven development stages with gates, ADR/GDD traceability and a session checkpoint.
Its value is process discipline rather than one-shot generation.

It originally ran only in Claude Code (subagents, `AskUserQuestion`, hooks, slash
commands, POSIX helper scripts). This bundle ports it:

| Capability | In DSH |
| --- | --- |
| Workflow skills | registered through the `skills` provider; call them as `/start`, `/gate-check`, … |
| Role briefs | `ccgs_role` returns the upstream brief to hand to `subagent` |
| Slash-command dispatch | skills are the entry points, same names as upstream |
| State and gate scripts | `ccgs_state` reads `project.yaml`, `production/stage.txt` and artifacts directly; no bash needed |
| Scaffolding | `ccgs_init` writes `.claude/`, `project.yaml`, `AGENTS.md` and the directory skeleton |
| Corpus search | `ccgs_doc` lists, reads and searches the 376 shipped files |

Skill bodies are upstream text, verbatim apart from tool-name adaptation.

## Contents

78 skills: getting started and navigation 10, concept and design 12, art/UX/audio 7,
architecture and code quality 7, planning and implementation 9, QA and measurement 14,
team pipelines 7, release and live ops 10, skill meta 2.

49 role briefs: creative-director, producer, technical-director, lead-programmer,
game-designer, level-designer, narrative-director, art-director, audio-director,
qa-lead, qa-tester, release-manager, security-engineer, performance-analyst,
economy-designer, live-ops-designer, community-manager, localization-lead, writer,
world-builder, systems-designer, gameplay-programmer, engine-programmer, ai-programmer,
network-programmer, tools-programmer, technical-artist, ui-programmer, sound-designer,
prototyper, analytics-engineer, devops-engineer, accessibility-specialist,
ux-designer, godot-specialist, godot-gdscript-specialist, godot-csharp-specialist,
godot-shader-specialist, godot-gdextension-specialist, unity-specialist,
unity-ui-specialist, unity-shader-specialist, unity-dots-specialist,
unity-addressables-specialist, unreal-specialist, ue-blueprint-specialist,
ue-gas-specialist, ue-replication-specialist, ue-umg-specialist.

Corpus: `docs/` 134, `genres/` 74, `scripts/` 54, `agents/` 49, `engines/` 28,
`hooks/` 18, `rules/` 14, plus `repo-docs/`, `CLAUDE.md`, `project.yaml`.

## Install

Requirements: a DSH release with bundle support and the `skills` service
(verified on `0.2.2-rc.5`), Node.js ≥ 20 for the self-test, and a writable profile.

**A. From a local clone (verified path)**

```bash
git clone https://github.com/y0n9/dsh-ccgs-studio.git
```

Then in DSH: **Plugins → Add plugin → local directory**, choose the cloned folder,
install and enable. From an agent session you can do the same with
`plugin_manager action=install_bundle target="<abs path>/dsh-ccgs-studio"`.

After installing you should see the **Game studio / 游戏工作室** row, 78 new skills,
and the `ccgs_init`, `ccgs_state`, `ccgs_role`, `ccgs_doc` tools.

> Local installs are pnpm `link:` dependencies, so keep the cloned folder where it is.
> If nothing appears, reload the page; if it still does not, restart DSH (replacing an
> already-installed package of the same name requires a restart).

**B. From Git**

```text
plugin_manager action=install_bundle target="github:y0n9/dsh-ccgs-studio"
```

This relies on pnpm being able to fetch from GitHub — tested: `pnpm add
github:y0n9/dsh-ccgs-studio` installs `dsh-ccgs-studio 1.0.0` with `skills/`, `studio/`,
`templates/`, `locale/`, `docs/`, `index.js`, `cordis.patch.yml` and `icon.svg` present
(the `files` list in `package.json`); DSH's `install_bundle` hands the same spec to the
profile's pnpm. Configure a proxy if your network needs one, or use path A.

**Check the install**

```text
ccgs_role list=true        → 49 roles
ccgs_doc query="stage gate" → corpus hits
ccgs_state                  → does this folder have a project.yaml?
```

## Quick start

1. Scaffold: `ccgs_init path="C:/work/my-game"` — writes `.claude/`, `project.yaml`,
   `AGENTS.md`, `production/session-state/active.md` and the skeleton directories.
2. Onboard: `/start` — asks goal, engine (web by default, or Godot 4 / Unity / Unreal 5),
   size and rigor; writes `modes.rigor` / `modes.automation`, a concept page, pillars
   and a visual anchor.
3. Play something: `/prototype` — converges on a one-page brief and builds a playable
   prototype, then asks proceed / pivot / kill.
4. Keep going: `/next-step` names the single next action from the artifacts that exist.
5. Gate: `/gate-check` — PASS / CONCERNS / NOT ASSESSED / FAIL with blockers and
   missing artifacts; only PASS (or accepted CONCERNS) advances the stage.

Then `/map-systems`, `/design-system <system>`, `/design-review`, `/create-architecture`,
`/architecture-decision`, `/create-epics`, `/create-stories`, `/dev-story`, `/qa-plan`,
`/smoke-check`, `/release-checklist`; team pipelines such as `/team-combat`,
`/team-level` and `/team-qa` when you want several roles in one flow.

Start every new session with `ccgs_state` or by reading
`production/session-state/active.md`: the file is the memory, not the conversation.

## Tools

| Tool | Parameters | Returns |
| --- | --- | --- |
| `ccgs_state` | `path?`, `limit?` (40, 5–200) | `{root, projectYaml, stage:{value,source,legacyMirror}, engine, files, dirs, notes}` — read-only |
| `ccgs_init` | `path?`, `overwrite?` (false) | `{root, copied, skipped, written, existing, next}` — idempotent |
| `ccgs_role` | `list?`, `role?`, `maxChars?` (24000) | role list, or one brief with its upstream model hint |
| `ccgs_doc` | `list?`, `folder?`, `path?`, `query?`, `maxChars?` (32000) | folder counts, one document, or `{path,line,text}` search hits |

## Project layout and `project.yaml`

`ccgs_init` produces `AGENTS.md`, `project.yaml`, `CLAUDE.md`, `.claude/`, `design/`,
`docs/engine-reference/`, `tests/{unit,integration}/`, `tools/`, `prototypes/`,
`assets/`, `production/{session-state,session-logs}/`. The code root follows the engine:
Godot `src/`, Unity `Assets/`, Unreal `Source/<Module>/`, Web `src/` (override with
`engine.code_root` / `engine.test_root`).

Stages: `Concept` → `Systems Design` → `Technical Setup` → `Pre-Production` →
`Production` → `Polish` → `Release`. Only `/start` and `/gate-check` write
`project.stage`; `/gate-check` also mirrors it to `production/stage.txt`.

`/start` fills in `project.*` (`name`, `genre`, `engine`, `engine_version`, `code_root`,
`stage`, `goal`) and `modes.rigor` (`minimal|standard|full`) plus `modes.automation`
(`collaborative|guided|autonomous`). Six knobs must stay absent because `modes.rigor`
expands into them: `modes.review_mode`, `modes.workflow`, `docs.density`, `qa.level`,
`modes.story_granularity`, `team.size`. Per-developer preferences go to
`project.local.yaml`.

## Conversion notes

| Upstream | Here |
| --- | --- |
| `argument-hint`, `user-invocable`, `allowed-tools`, `model` frontmatter | dropped (kept in `skills/manifest.json` as `upstreamTools` / `upstreamModel`) |
| `AskUserQuestion` | `ask_user_question` |
| `Skill(<name>)` | the `skill` tool |
| `subagent_type: <role>` | `ccgs_role` then `subagent` |
| Read / Write / Edit / Glob / Grep / Bash | host file, search and shell tools |
| `.claude/scripts/*.sh`, `.claude/hooks/*.sh` | usable with POSIX bash; otherwise `ccgs_state` + host file tools |

Not ported: Claude Code hooks, `.claude/settings.json`, statusline, slash-command
dispatch. `CLAUDE.md` is kept for reference; `AGENTS.md` is the DSH entry point.

## Troubleshooting

- **Nothing appears**: reload, then restart DSH if you were replacing an install.
- **`ccgs_init` skipped files**: by design; pass `overwrite: true` to reset.
- **`/gate-check` says NOT ASSESSED**: not a failure — artifacts are missing for a verdict.
- **bash-dependent skills on Windows**: WSL bash and Git Bash do not run inside the DSH
  sandbox (named pipes are blocked). Use `ccgs_state`, `ccgs_doc` and host file tools;
  run `studio/scripts/*.sh` in your own terminal when you need them.
- **Uninstall**: disable or remove the bundle in Plugins; artifacts already written into
  your project stay.

## Development

```bash
node test/bundle.test.mjs
node scripts/build-from-upstream.mjs --repo <upstream checkout> --commit <sha>
```

`skills/` and `studio/` are generated (deterministic: same upstream commit, identical
output). `index.js`, `templates/`, `locale/`, `docs/DETAIL.md`, `test/` and `scripts/`
are maintained by hand.

## License

MIT for both layers — see [LICENSE](./LICENSE) and [CREDITS.md](./CREDITS.md).
Upstream skills, role briefs and corpus: Copyright (c) 2026 Donchitos.
"Claude Code" is an Anthropic trademark; "DeepSeek Harness" belongs to DeepSeek.
This is an independent port, not affiliated with or endorsed by either.
