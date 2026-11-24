# Game Studio — DeepSeek Harness entry point

This project uses the **Claude Code Game Studios** structure (49 roles, 78 workflow
skills, stage gates) adapted to DeepSeek Harness. Read this file before studio work.

## How work happens here

Every task runs **Question → Options → Decision → Draft → Approval**:

- Ask before writing: name the file and its purpose, and wait for a yes.
- Show the draft or the summary before requesting approval; multi-file changes get
  one approval for the whole changeset.
- A skipped or dismissed question is not an answer. Re-ask in plain text and wait.
- No commits without an explicit instruction.

`modes.automation` relaxes this on purpose: `collaborative` (default) keeps the
protocol, `guided` recommends and asks less, `autonomous` recommends and proceeds.

## The session checkpoint is a file, not the chat

`production/session-state/active.md` is the memory of the project. Rewrite it as
the work moves; read it first after a compaction, a crash, or a cleared context.

## Configuration: `project.yaml`

`project.yaml` at the root is the single source of truth; `project.local.yaml`
(never committed) overrides it for one person.

- `project.stage`: `Concept` → `Systems Design` → `Technical Setup` →
  `Pre-Production` → `Production` → `Polish` → `Release`. Written only by
  `/start` and `/gate-check` (a PASS, or CONCERNS whose risks you accept); the
  legacy mirror is `production/stage.txt`, kept in sync by `gate-check`.
- `project.goal`: `jam`, `learn`, `hobby`, `portfolio`, `sell`, `early_access`,
  `publisher`, `mobile`, `other`.
- `modes.rigor`: `minimal` | `standard` | `full` — expands the six knobs below.
- `modes.automation`: `collaborative` | `guided` | `autonomous`.
- Deliberately unset until a need picks them: `modes.workflow`, `docs.density`,
  `qa.level`, `modes.story_granularity`, `team.size`, `modes.review_mode`.

`engine.name` selects the code root and test root: Godot → `src/`,
Unity → `Assets/`, Unreal → `Source/<Module>/`, Web → `src/`.

## Layout

```text
.claude/          studio corpus: agents, docs, engines, genres, hooks, rules, scripts
design/           gdd/, narrative/, levels/, balance/
docs/             architecture, ADRs, engine-reference/<engine>/, traceability
production/       session-state/active.md, session-logs/, epics/, sprints/
tests/            unit/, integration/
prototypes/  tools/  assets/  src/ (or Assets/, Source/)
```

## Tools in DSH

- `ccgs_state` — read project.yaml keys, the resolved stage and the artifact
  inventory (read-only; use it instead of the bash helpers).
- `ccgs_init` — scaffold `.claude/`, `project.yaml`, the skeleton and this file.
- `ccgs_role` — the 49 role briefs; hand one to a subagent.
- `ccgs_doc` — the studio corpus: list, read `docs/<name>.md`, or search by words.

The studio shell helpers under `.claude/scripts/` and `.claude/hooks/` need a
POSIX bash. When the host has none, read state with `ccgs_state` and do the same
writes with the file tools; never invent a config value the helpers would have
resolved.

## Skills

78 studio skills are installed by the `dsh-ccgs-studio` bundle. Start with
`/start` (guided onboarding) or `/prototype` (make a playable game now); then
`/next-step`, `/gate-check`, `/sprint-plan`, `/team-<discipline>`.
