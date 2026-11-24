# Game studio

The **Claude Code Game Studios** framework as a DeepSeek Harness bundle:
78 workflow skills, 49 studio role briefs, the studio reference corpus, project
scaffolding and a read-only state reader. Upstream:
[Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) (MIT).

This packaging lives at [y0n9/dsh-ccgs-studio](https://github.com/y0n9/dsh-ccgs-studio);
install it from that folder (`plugin_manager action=install_bundle` with the absolute
path, or `github:y0n9/dsh-ccgs-studio`). The full guide, including the stage gates and
the `project.yaml` keys, is in `README.md`.

## What it adds

| Surface | Content |
| --- | --- |
| Skills (78) | `start`, `prototype`, `next-step`, `gate-check`, `quick-design`, `map-systems`, `create-architecture`, `create-epics`, `create-stories`, `dev-story`, `story-done`, `design-review`, `code-review`, `qa-plan`, `smoke-check`, `soak-test`, `perf-profile`, `security-audit`, `balance-check`, `art-bible`, `ux-design`, `team-*` pipelines, `sprint-plan`, `release-checklist`, `launch-checklist`, `localize`, `retrospective`, `hotfix`, `day-one-patch`, and the rest of the studio flow. Bodies are the upstream text, unchanged except for tool names and one adapter note. |
| `ccgs_state` | Reads `project.yaml`, resolves `project.stage` (`project.yaml`, else `production/stage.txt`) and reports which `design/`, `docs/`, `production/` and test artifacts exist. Observation only — no writes, no verdicts. |
| `ccgs_init` | Copies the corpus into `<project>/.claude/`, writes `project.yaml`, creates the design/docs/tests/production skeleton, an `AGENTS.md` entry point and `production/session-state/active.md`. Existing files are skipped unless `overwrite` is true. |
| `ccgs_role` | Lists or reads the 49 role briefs (`creative-director`, `lead-programmer`, `qa-lead`, `unity-specialist`, …) to hand to a subagent. |
| `ccgs_doc` | Lists, reads and searches the shipped corpus (`docs/`, `rules/`, `genres/`, `engines/`, `scripts/`, `repo-docs/`). |

## Using it

1. In a game project, run `ccgs_init` once. That creates `.claude/` (agents, docs,
   engines, genres, hooks, rules, scripts), `project.yaml` and the skeleton.
2. Start with `/start` for guided onboarding (goal, rigor, engine, first step) or
   `/prototype` to get a playable game immediately.
3. After that, `/next-step` names the one next action for the current stage;
   `/gate-check` decides whether the project may advance a stage.

`project.yaml` is the configuration store. `project.stage` moves
`Concept → Systems Design → Technical Setup → Pre-Production → Production → Polish → Release`
and is written only by `/start` and `/gate-check` (a PASS, or CONCERNS whose risks
you accept). `production/stage.txt` mirrors it, and `project.yaml` wins when they
disagree. `modes.rigor` (`minimal` | `standard` | `full`) expands
`modes.workflow`, `docs.density`, `qa.level`, `modes.story_granularity`,
`modes.review_mode` and `team.size`; `modes.automation`
(`collaborative` | `guided` | `autonomous`) relaxes the ask-first protocol.

## Limits

- The studio shell helpers under `.claude/scripts/` and `.claude/hooks/` need a
  POSIX bash. Where the host has none (Windows WSL without a distro, sandboxes
  that block pipes), follow the same contract by hand: read state with
  `ccgs_state`, edit `project.yaml` and the artifact files with the file tools.
- Skill bodies keep their upstream wording, so they still say "read
  `.claude/docs/...`" and "run `bash .claude/scripts/...`". Both work after
  `ccgs_init` where bash exists; `ccgs_doc` reads the same files from the bundle
  when it does not.
- 49 roles are briefs, not running agents: delegation is `ccgs_role` → `subagent`.
- The bundle registers its skills in the global layer, so they are visible in
  every session of this profile; disable the bundle to hide them.

## Credits

Skills, role briefs and corpus: Claude Code Game Studios by Donchitos, MIT
licensed. This bundle only converts the packaging (frontmatter, tool names, one
adapter note per skill) and adds the DSH tools around it.
