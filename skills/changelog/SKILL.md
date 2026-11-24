---
name: changelog
description: "Old name of /write-changelog. Prints one line, then runs /write-changelog."
---

> **DSH adapter.** Converted from Donchitos/Claude-Code-Game-Studios (MIT) for DeepSeek Harness; the workflow steps are unchanged.
> Tool mapping: `subagent_type: X` -> `ccgs_role` then `subagent`; `AskUserQuestion` -> `ask_user_question`; `Skill(<name>)` -> the `skill` tool; Read/Write/Edit/Glob/Grep/Bash -> this host's file, search and shell tools.
> Studio helpers (`.claude/scripts/*.sh`, `.claude/hooks/*.sh`) need a POSIX bash. Where bash is unavailable, read state with `ccgs_state` and make the same writes with the file tools instead.
> Run `ccgs_init({path})` once per project so `.claude/` and `project.yaml` exist; use `ccgs_doc` to read studio docs and `ccgs_role` for the 49 studio role briefs.

# /changelog — old name of /write-changelog

Several AI tools keep `/changelog` for a command of their own, so this skill is now
`/write-changelog`.

1. Print this line exactly, as the first line of your reply:

   /changelog is now /write-changelog. Running /write-changelog.

2. Run the `write-changelog` skill with the Skill tool, passing these arguments unchanged
   (none, if this is empty): $ARGUMENTS

Do nothing else here: `/write-changelog` does the work.
