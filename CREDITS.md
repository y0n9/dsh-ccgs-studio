# Credits and provenance

## Upstream

- **Project:** Claude Code Game Studios
- **Author:** Donchitos
- **Repository:** https://github.com/Donchitos/Claude-Code-Game-Studios
- **License:** MIT (`Copyright (c) 2026 Donchitos`)
- **Pinned commit at packaging time:** `abc0de79d6ceb0b5d7aa693945849b3937afbe6a` (`main`)
- **Framework version recorded in the upstream `project.yaml`:** `framework.version: 1.3.0`

Claude Code Game Studios is an agent architecture that mirrors a real game studio:
49 role subagents, a workflow-skill library, a coordination system with stage
gates, and a reference corpus (engine notes, genre chipsets, rules, docs).

## What this repository is

A **DeepSeek Harness (DSH) bundle** that packages the upstream studio for DSH:

- 78 workflow skills (75 skills + 3 compatibility aliases) as DSH skills
- 49 role briefs as readable material for DSH subagents
- the studio corpus (`.claude/docs`, `engines`, `genres`, `hooks`, `rules`, `scripts`, `agents`)
- four `ccgs_*` tools: `ccgs_state`, `ccgs_init`, `ccgs_role`, `ccgs_doc`
- a project scaffold (`ccgs_init`) and an `AGENTS.md` entry point

## What was changed

Only packaging was changed. Skill and role wording is upstream text.

| Area | Change |
| --- | --- |
| Skill frontmatter | Kept `name` and `description`. Dropped `argument-hint`, `user-invocable`, `allowed-tools`, `model` (Claude Code-only keys). |
| Skill body | One adapter note prepended. `AskUserQuestion` → `ask_user_question`, `Skill(<name>)` → `skill(<name>)`, ``subagent_type: <role>`` → `ccgs_role` + `subagent`. Everything else verbatim. |
| Corpus | Copied verbatim into `studio/`, plus `agents/index.json` (a generated roster with name/description/model/tools). |
| Packaging | New: `index.js`, `package.json`, `cordis.patch.yml`, `icon.svg`, `locale/`, `docs/DETAIL.md`, `templates/AGENTS.md`, `test/`, `scripts/build-from-upstream.mjs`. |
| Not ported | Claude Code hooks, `.claude/settings.json`, statusline, slash-command dispatch. Their intent is covered by the `ccgs_*` tools and by the skills themselves. |

The generator that produced `skills/` and `studio/` is
`scripts/build-from-upstream.mjs`; the transformation is deterministic, so an
upstream update can be re-applied by re-running it.

## Trademarks

"Claude Code" and "Claude" are trademarks of Anthropic. "DeepSeek Harness" and
"DeepSeek" belong to DeepSeek. This repository is an independent packaging effort
and is not affiliated with or endorsed by Donchitos, Anthropic or DeepSeek.
