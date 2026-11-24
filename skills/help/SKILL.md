---
name: help
description: "Old name of /next-step. Prints one line, then runs /next-step."
---

> **DSH adapter.** Converted from Donchitos/Claude-Code-Game-Studios (MIT) for DeepSeek Harness; the workflow steps are unchanged.
> Tool mapping: `subagent_type: X` -> `ccgs_role` then `subagent`; `AskUserQuestion` -> `ask_user_question`; `Skill(<name>)` -> the `skill` tool; Read/Write/Edit/Glob/Grep/Bash -> this host's file, search and shell tools.
> Studio helpers (`.claude/scripts/*.sh`, `.claude/hooks/*.sh`) need a POSIX bash. Where bash is unavailable, read state with `ccgs_state` and make the same writes with the file tools instead.
> Run `ccgs_init({path})` once per project so `.claude/` and `project.yaml` exist; use `ccgs_doc` to read studio docs and `ccgs_role` for the 49 studio role briefs.

# /help — old name of /next-step

Most AI tools keep `/help` for a command of their own, so this skill is now
`/next-step`.

1. Print this line exactly, as the first line of your reply:

   /help is now /next-step. Running /next-step.

2. Run the `next-step` skill with the Skill tool, passing these arguments unchanged
   (none, if this is empty): $ARGUMENTS

Do nothing else here: `/next-step` does the work.
