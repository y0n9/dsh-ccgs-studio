---
name: settings
description: "Old name of /project-settings. Prints one line, then runs /project-settings."
---

> **DSH adapter.** Converted from Donchitos/Claude-Code-Game-Studios (MIT) for DeepSeek Harness; the workflow steps are unchanged.
> Tool mapping: `subagent_type: X` -> `ccgs_role` then `subagent`; `AskUserQuestion` -> `ask_user_question`; `Skill(<name>)` -> the `skill` tool; Read/Write/Edit/Glob/Grep/Bash -> this host's file, search and shell tools.
> Studio helpers (`.claude/scripts/*.sh`, `.claude/hooks/*.sh`) need a POSIX bash. Where bash is unavailable, read state with `ccgs_state` and make the same writes with the file tools instead.
> Run `ccgs_init({path})` once per project so `.claude/` and `project.yaml` exist; use `ccgs_doc` to read studio docs and `ccgs_role` for the 49 studio role briefs.

# /settings — old name of /project-settings

Several AI tools keep `/settings` for a command of their own, so this skill is now
`/project-settings`.

1. Print this line exactly, as the first line of your reply:

   /settings is now /project-settings. Running /project-settings.

2. Run the `project-settings` skill with the Skill tool, passing these arguments unchanged
   (none, if this is empty): $ARGUMENTS

Do nothing else here: `/project-settings` does the work.
