# dsh-ccgs-studio · 游戏工作室

把 [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) 的整套游戏工作室协作体系，打包成 **DeepSeek Harness（DSH）** 可安装的 bundle。

装好之后，你在 DSH 里就有：**78 个工作流技能**、**49 份岗位角色简报**、一套工作室语料（引擎笔记、品类芯片、规则、文档），以及 4 个 `ccgs_*` 工具负责读取项目状态、搭建脚手架、检索语料。你不需要 Claude Code。

- 许可：MIT（上游 MIT，打包部分 MIT）
- 上游版本：`abc0de7`（framework `1.3.0`）
- 验证环境：DSH `0.2.2-rc.5` · desktop profile · Windows 11
- 自检：`node test/bundle.test.mjs` → 7/7 通过
- 安装实测：本地目录安装在该 profile 上端到端跑通（78 个技能进入技能目录、4 个工具实时可调）；`github:` 直装已验证 pnpm 能解析并装出 1.0.0（见[安装](#安装)）

---

## 目录

- [这是什么](#这是什么)
- [来源与背景](#来源与背景)
- [内容清单](#内容清单)
- [安装](#安装)
- [快速开始](#快速开始)
- [四个工具](#四个工具)
- [项目结构与 project.yaml](#项目结构与-projectyaml)
- [移植说明](#移植说明)
- [与 Claude Code 版的差异](#与-claude-code-版的差异)
- [常见问题](#常见问题)
- [开发与升级](#开发与升级)
- [许可与致谢](#许可与致谢)

---

## 这是什么

DSH 的插件单位叫 **bundle**：一个普通 npm 包，用 `cordis.patch.yml` 往运行时里插入一行，由 `index.js` 导出 `apply(ctx, config)` 注册资源。本仓库就是这样一个包：

```
dsh-ccgs-studio/
├── index.js              # bundle 入口：注册 78 个技能 + 4 个工具
├── cordis.patch.yml      # 往 DSH 运行时插入本 bundle
├── package.json          # dsh.bundle.patch 指向上面的 patch 文件
├── skills/               # 78 个 DSH 技能（每个一个 SKILL.md，+ manifest.json）
├── studio/               # 工作室语料（376 个文件）与 49 份角色简报
├── templates/AGENTS.md   # ccgs_init 写给新项目的入口说明
├── locale/               # 插件页标题与描述（英文 / 中文）
├── icon.svg              # 插件图标
├── docs/DETAIL.md        # 插件详情页
└── test/bundle.test.mjs  # 自检
```

装上之后，"游戏工作室"不是一个黑盒工具，而是**一堆可以被调用的流程技能**：你做概念、写 GDD、做架构决策、拆 epic、写 story、跑 QA、发版，每一步都有一个技能在手，并且共享同一套 `project.yaml` 状态与阶段门禁。

## 来源与背景

上游 **Claude Code Game Studios**（作者 **Donchitos**，MIT）是一个刻意模仿真实游戏工作室组织架构的 agent 系统：

- **49 个岗位 subagent**：创意总监、制作人、技术总监、lead programmer、关卡设计、叙事、音频、QA、发布经理，以及 Godot / Unity / Unreal 的引擎专科岗位；
- **75 个工作流技能**（另有 3 个兼容别名，共 78 个）覆盖从概念到上线的完整流程；
- **一份协作系统**：`project.yaml` 单一配置源、7 个开发阶段与阶段门禁、ADR 与 GDD 互相追溯、trunk-based 的提交与评审约定、会话检查点 `production/session-state/active.md`；
- **一套语料**：引擎适配笔记、品类芯片（genre chipsets）、目录结构、编码规范、效果映射表等。

它的价值不在"一次生成一个游戏"，而在**流程纪律**：先问再选、先草案再批准，每一步都有制品、有门禁、有可追溯的决策记录。

原来它只能跑在 Claude Code 里（依赖 Claude Code 的 subagent、`AskUserQuestion`、hook、slash command、以及 `.claude/scripts/*.sh`）。本仓库把它搬到了 DSH：

| 能力 | 在 DSH 上的实现 |
| --- | --- |
| 工作流技能 | `skills` 服务的 provider，78 个技能进入技能目录，可 `/start`、`/gate-check` 这样直接调用 |
| 岗位角色 | 49 份简报通过 `ccgs_role` 读取，交给 `subagent` 使用，保留"分工"语义 |
| slash command 派发 | 技能本身即入口，名字与上游命令一致 |
| 状态与门禁脚本 | `ccgs_state` 直接读 `project.yaml` / `production/stage.txt` / 制品目录，不依赖 bash |
| 脚手架 | `ccgs_init` 一次写入 `.claude/`、`project.yaml`、`AGENTS.md` 与骨架目录 |
| 语料检索 | `ccgs_doc` 按路径读、按词搜（376 个文件） |

上游技能正文**逐字保留**（只做工具名替换），所以文档、术语、门禁判据都与上游一致。

## 内容清单

### 78 个技能（按用途分组）

| 分组 | 数量 | 技能 |
| --- | --- | --- |
| 入门与导航 | 10 | `start` `next-step` `help` `onboard` `adopt` `project-stage-detect` `project-settings` `settings` `gate-check` `setup-engine` |
| 概念与设计 | 12 | `brainstorm` `quick-design` `design-system` `design-review` `map-systems` `review-all-gdds` `consistency-check` `propagate-design-change` `reverse-document` `cut` `scope-check` `estimate` |
| 美术、UX 与音频 | 7 | `art-bible` `asset-spec` `asset-audit` `ux-design` `ux-review` `team-audio` `team-ui` |
| 架构与代码质量 | 7 | `create-architecture` `architecture-decision` `architecture-review` `create-control-manifest` `code-review` `tech-debt` `security-audit` |
| 计划与实现 | 9 | `create-epics` `create-stories` `story-readiness` `dev-story` `story-done` `sprint-plan` `sprint-status` `vertical-slice` `prototype` |
| 测试与度量 | 14 | `qa-plan` `smoke-check` `soak-test` `test-setup` `test-helpers` `test-evidence-review` `test-flakiness` `regression-suite` `bug-report` `bug-triage` `playtest-report` `perf-profile` `balance-check` `content-audit` |
| 团队流水线 | 7 | `team-combat` `team-level` `team-narrative` `team-polish` `team-qa` `team-release` `team-live-ops` |
| 发布与运营 | 10 | `release-checklist` `launch-checklist` `day-one-patch` `hotfix` `patch-notes` `write-changelog` `changelog` `localize` `retrospective` `milestone-review` |
| 元技能 | 2 | `skill-test` `skill-improve` |

> 上游 README 写的是"75 个工作流技能"；仓库里实际有 78 个目录，多出的 3 个是兼容别名（`help` → `next-step`、`settings` → `project-settings`、`changelog` → `write-changelog`）。本包全部收录。

### 49 份岗位简报（`ccgs_role`）

accessibility-specialist、ai-programmer、analytics-engineer、art-director、audio-director、community-manager、creative-director、devops-engineer、economy-designer、engine-programmer、game-designer、gameplay-programmer、godot-csharp-specialist、godot-gdextension-specialist、godot-gdscript-specialist、godot-shader-specialist、godot-specialist、lead-programmer、level-designer、live-ops-designer、localization-lead、narrative-director、network-programmer、performance-analyst、producer、prototyper、qa-lead、qa-tester、release-manager、security-engineer、sound-designer、systems-designer、technical-artist、technical-director、tools-programmer、ue-blueprint-specialist、ue-gas-specialist、ue-replication-specialist、ue-umg-specialist、ui-programmer、unity-addressables-specialist、unity-dots-specialist、unity-shader-specialist、unity-specialist、unity-ui-specialist、unreal-specialist、ux-designer、world-builder、writer。

每份简报保留上游的 `model` 提示（`opus` / `sonnet` / `inherit`），你可以据此决定派给哪个模型。

### 工作室语料（`studio/`，376 个文件）

| 目录 | 文件数 | 用途 |
| --- | --- | --- |
| `studio/docs/` | 134 | 协作规则、目录结构、编码规范、效果映射表、导演门禁、自动化模式、配置解析等 |
| `studio/genres/` | 74 | 品类芯片与混搭建议 |
| `studio/scripts/` | 54 | 上游状态/门禁脚本（需要 POSIX bash，见[常见问题](#常见问题)） |
| `studio/agents/` | 49 | 角色简报原文 + `index.json`（生成的花名册） |
| `studio/engines/` | 28 | 引擎适配笔记 |
| `studio/hooks/` | 18 | 上游 hook 脚本与辅助库（参考用） |
| `studio/rules/` | 14 | 提交、评审、记忆等硬规则 |
| `studio/repo-docs/` | 4 | `WORKFLOW-GUIDE.md`、`COLLABORATIVE-DESIGN-PRINCIPLE.md`、`tr-registry.yaml`、`VERSION.md` |
| `studio/CLAUDE.md` `studio/project.yaml` | 2 | 上游主配置与 `project.yaml` 模板 |

### 其它

- `templates/AGENTS.md`：`ccgs_init` 写入新项目的入口说明（协作协议、`project.yaml` 键、目录约定、工具用法、bash 缺失时的替代路径）。
- `docs/DETAIL.md`：DSH 插件详情页。
- `locale/{en,zh}.json`、`icon.svg`：插件列表里的标题、描述与图标。

## 安装

### 前置要求

- 一份支持 bundle 与 `skills` 服务的 **DeepSeek Harness**（本包在 `0.2.2-rc.5` 上验证；更早的版本可能没有 `skills.registerProvider`）。
- Node.js ≥ 20（DSH 自带运行时即可，仅在你要跑自检/重建时需要本地 Node）。
- 一个可写的 profile（默认 `desktop`）。

### 方式 A：从本仓库本地安装（推荐，已验证）

```bash
git clone https://github.com/y0n9/dsh-ccgs-studio.git
```

然后在 DSH 里：

1. 打开 **Plugins（插件）** 面板 → **Add plugin（添加插件）**；
2. 选择 **本地目录**，指向上面克隆出来的 `dsh-ccgs-studio` 文件夹；
3. 安装并启用。

也可以在任意 DSH 会话里让 agent 代装（需要放开权限）：

```text
plugin_manager action=install_bundle target="<绝对路径>/dsh-ccgs-studio"
```

安装成功后会出现：

- 插件列表里多一项 **游戏工作室 / Game studio**（带图标与详情页）；
- 技能目录新增 78 条（`start`、`prototype`、`gate-check`……）；
- 工具列表出现 `ccgs_init`、`ccgs_state`、`ccgs_role`、`ccgs_doc`。

> **不要删除克隆下来的目录。** 本地目录安装是 pnpm 的 `link:` 依赖，profile 里存的是指向它的链接；删掉目录，插件就失效。想换位置，先移动目录再重新安装一次。
>
> 如果安装后没有立刻出现：重新加载页面；仍然没有就重启 DSH（替换已安装的同名包需要重启才生效）。

### 方式 B：从 Git URL 安装

如果你的 DSH 版本接受包名/spec，可以直接给仓库地址：

```text
plugin_manager action=install_bundle target="github:y0n9/dsh-ccgs-studio"
```

参数顺序与路径安装相同。这条路径依赖 pnpm 能从 GitHub 拉包——已实测：`pnpm add github:y0n9/dsh-ccgs-studio` 在 pnpm 10.15.1 上装出 `dsh-ccgs-studio 1.0.0`，`skills/`、`studio/`、`templates/`、`locale/`、`docs/` 与 `index.js`、`cordis.patch.yml`、`icon.svg` 都在（`package.json` 的 `files` 已声明），DSH 的 `install_bundle` 就是把这个 spec 交给 profile 的 pnpm。若你的网络需要代理，请先配好 pnpm 的代理，或改用方式 A。

### 安装后自检

在一个新会话里跑：

```text
ccgs_role list=true          → count: 49
ccgs_doc  query="stage gate" → 命中效果映射表与 workflow 目录
ccgs_state                    → 报告当前目录有没有 project.yaml
```

## 快速开始

以一个全新的游戏项目为例（`my-game/` 为空目录）：

1. **搭脚手架**

   ```text
   ccgs_init path="C:/work/my-game"
   ```

   得到 `.claude/`（49 份简报 + 语料 + 脚本）、`project.yaml`、`AGENTS.md`、`production/session-state/active.md`，以及 `design/{gdd,narrative,levels,balance}`、`docs/engine-reference`、`tests/{unit,integration}`、`tools`、`prototypes`、`production/{session-state,session-logs}`、`assets`。

2. **首次进场**：`/start`

   问你目标（jam / learn / hobby / portfolio / sell / early_access / publisher / mobile）、引擎（默认 web，可选 Godot 4 / Unity / Unreal 5）、规模与严谨档位；写入 `project.yaml` 的 `modes.rigor` / `modes.automation`，产出 `design/gdd/game-concept.md` 与设计支柱、视觉锚点。

3. **想先玩到东西**：`/prototype`

   几轮问答收敛成一页 brief，然后产出一个可直接在浏览器打开的可玩原型（或按所选引擎的纸面/引擎原型），给出 proceed / pivot / kill 判断。

4. **往下推**：`/next-step`

   它读 `ccgs_state` 看到的东西（阶段、已有制品、缺口），只给你**下一个**该做的动作。

5. **过门禁**：`/gate-check`

   PASS / CONCERNS / NOT ASSESSED / FAIL，列出阻塞项与缺失制品；PASS（或你明确接受 CONCERNS 的风险）才会推进阶段。

之后按需：`/map-systems` → `/design-system <system>` → `/design-review` → `/create-architecture` → `/architecture-decision` → `/create-epics` → `/create-stories` → `/dev-story` → `/qa-plan` → `/smoke-check` → `/release-checklist`；需要多人视角时用 `/team-combat`、`/team-level`、`/team-qa` 这类流水线技能。

**每个新会话**：先 `ccgs_state`，或读 `production/session-state/active.md`——文件才是记忆，对话不是。

## 四个工具

### `ccgs_state`

只读观察，不做判断，不写文件。

| 参数 | 说明 |
| --- | --- |
| `path` | 项目根目录，默认当前工作目录 |
| `limit` | 每个目录列出的条目上限（默认 40，5–200） |

返回 `{ root, projectYaml: { path, exists, values }, stage: { value, source, legacyMirror }, engine, files, dirs, notes }`。`stage.source` 是 `project.yaml:project.stage` 或 `production/stage.txt`；`notes` 会指出"阶段与制品不一致""没有 project.yaml，先跑 ccgs_init"之类的事实。

### `ccgs_init`

| 参数 | 说明 |
| --- | --- |
| `path` | 项目根目录，默认当前工作目录 |
| `overwrite` | 是否覆盖已存在文件（默认 `false`，已存在则跳过并在 `skipped` 里报告） |

返回 `{ root, copied, skipped, written, existing, next }`。可重复执行——第二次只会补缺，不会踩掉你的改动。

### `ccgs_role`

| 参数 | 说明 |
| --- | --- |
| `list` | 列出 49 个岗位（名称、一句话摘要、model 提示） |
| `role` | 读某一份简报，如 `creative-director`、`qa-lead`、`unity-specialist` |
| `maxChars` | 读取上限（默认 24000，2000–60000） |

配合 DSH 的 `subagent` 使用：先 `ccgs_role role="qa-lead"` 取简报，再把简报作为子 agent 的职责说明——这样保留上游"岗位分工"的语义。

### `ccgs_doc`

| 参数 | 说明 |
| --- | --- |
| `list` | 列出语料目录与文件数 |
| `folder` | 配合 `list`，只看某个子目录，如 `genres/chipsets` |
| `path` | 读一份文档，studio 相对路径，如 `docs/config-resolution.md` |
| `query` | 按词检索（大小写不敏感，多词 AND），返回 `{path,line,text}` 命中 |
| `maxChars` | 读取上限（默认 32000，2000–80000） |

技能正文里写"读 `.claude/docs/xxx.md`"的地方，用 `ccgs_doc path="docs/xxx.md"` 即可；不必猜路径。

## 项目结构与 project.yaml

`ccgs_init` 后的目录（与上游 `.claude/docs/directory-structure.md` 一致）：

```
my-game/
├── AGENTS.md                     # DSH 入口说明
├── project.yaml                  # 单一配置源（阶段、引擎、模式）
├── project.local.yaml            # 个人偏好（gitignored，可选）
├── CLAUDE.md                     # 上游主配置（保留原样，供参考）
├── .claude/
│   ├── CLAUDE.md  agents/  docs/  engines/  genres/  hooks/  rules/  scripts/
├── design/{gdd,narrative,levels,balance}/
├── docs/engine-reference/
├── tests/{unit,integration}/
├── tools/  prototypes/  assets/
└── production/
    ├── session-state/active.md    # 会话检查点
    └── session-logs/
```

**代码根**取决于引擎：Godot → `src/`；Unity → `Assets/`（Unity 只编译 `Assets/` 与 `Packages/`）；Unreal → `Source/<Module>/`（内容放 `Content/`）；Web → `src/`。可用 `project.yaml` 的 `engine.code_root` / `engine.test_root` 覆盖。

### 阶段（`project.stage`）

 `Concept` → `Systems Design` → `Technical Setup` → `Pre-Production` → `Production` → `Polish` → `Release`

| 阶段 | 门禁要求（`/gate-check` 判据） |
| --- | --- |
| Concept | 一页概念、设计支柱、视觉锚点 |
| Systems Design | `systems-index.md`、全部 MVP GDD 通过评审、跨 GDD 一致性 |
| Technical Setup | 引擎配置完成、art-bible 前 4 节（`standard` 档及以上）、≥3 份 ADR、架构文档、追溯索引、测试框架、可访问性与交互模式文档 |
| Pre-Production | epics、首个 sprint 计划、UX 规范、control manifest（建议加 vertical slice） |
| Production | 核心机制可玩、主路径贯通、smoke check 通过、QA 签核 |
| Polish | 功能与内容齐备、本地化、安全审计、无开放 S1–S3 bug |
| Release | 发布清单与上线检查全部通过 |

阶段只由 `/start`（进场）与 `/gate-check`（PASS，或你明确接受 CONCERNS 的风险）写入；`/gate-check` 同时双写 `project.yaml` 与旧位置 `production/stage.txt`。**不要手动改**，除非是在纠正一次错误的自动探测。

### `project.yaml` 关键键

`ccgs_init` 写入的是上游模板（27 行，只有 `schema_version` 与 `framework`）。`/start` 之后会补上 `project.*` 与 `modes.rigor` / `modes.automation`：

```yaml
schema_version: 1
framework:
  version: 1.3.0
project:
  name: my-game
  genre: roguelite
  engine: web            # web | godot | unity | unreal
  engine_version: "4.4"
  code_root: src
  stage: Concept         # 见上表
  goal: portfolio        # jam | learn | hobby | portfolio | sell | early_access | publisher | mobile | other
modes:
  rigor: standard        # minimal | standard | full
  automation: collaborative   # collaborative | guided | autonomous
```

- **六个旋钮必须保持缺席**：`modes.review_mode`、`modes.workflow`、`docs.density`、`qa.level`、`modes.story_granularity`、`team.size`。它们由 `modes.rigor` 展开得到；写进文件就把值钉死，之后改 rigor 不再生效。
- 个人偏好写 `project.local.yaml`，不要写进 `project.yaml`。
- 完整 schema 见 `ccgs_doc path="docs/effects-map.md"`；解析优先级见 `docs/config-resolution.md`。

## 移植说明

| 上游写法 | DSH 上怎么写 |
| --- | --- |
| frontmatter `argument-hint` / `user-invocable` / `allowed-tools` / `model` | 丢弃（DSH 技能只认 `name` + `description`）；上游值保留在 `skills/manifest.json` 的 `upstreamTools` / `upstreamModel` 里 |
| `AskUserQuestion` | `ask_user_question` |
| `Skill(<name>)` | `skill` 工具，参数为该技能名 |
| `subagent_type: <role>` | `ccgs_role({role})` 取简报 → `subagent` 派发 |
| Read / Write / Edit / Glob / Grep / Bash | 宿主自带的文件、搜索、shell 工具 |
| `.claude/scripts/*.sh`、`.claude/hooks/*.sh` | 有 bash 就能直接用；没有就用 `ccgs_state` 读、用文件工具写 |

每个 `SKILL.md` 顶部有 4 行 DSH 适配说明，正文是上游原文。技能目录里还有一个 `skills/manifest.json`（名称、描述、文件清单、上游 model/tools），`skills` provider 就是按它注册的。

## 与 Claude Code 版的差异

| | Claude Code 版 | 本包（DSH） |
| --- | --- | --- |
| 技能入口 | slash command | 同名技能（`/start`、`/gate-check`……） |
| 49 个岗位 | 原生 subagent 类型 | `ccgs_role` 简报 + `subagent` |
| 阶段/状态脚本 | `.claude/scripts/*.sh` + bash | `ccgs_state`（无需 bash） |
| 脚手架 | `/start` 内联建目录 | `ccgs_init` 显式、可重入 |
| hooks、`.claude/settings.json`、statusline | 生效 | **未移植**（没有对应的 DSH 钩子链） |
| slash command 派发表 | `.claude/commands` | 不适用（技能本身即入口） |
| 项目入口文件 | `CLAUDE.md` | `AGENTS.md`（`CLAUDE.md` 同时保留，供参考） |

## 常见问题

**技能/工具没出现？**
先刷新页面；还不行就重启 DSH。首次安装通常靠 HMR 就能生效，但"替换一个已安装的同名包"需要重启。

**`ccgs_init` 说跳过了一些文件？**
这是设计：默认 `overwrite: false`，只补缺不覆盖。确认要重置再加 `overwrite: true`（会覆盖 `.claude/` 下的语料与 `project.yaml`）。

**`/gate-check` 报 NOT ASSESSED？**
表示没有足够制品来判断，不是失败。按它列出的缺失项补制品，再跑一次。

**bash 相关技能跑不动（Windows）？**
工作室内置脚本是 POSIX bash。DSH 沙箱下 Windows 的 WSL `bash.exe` 不可用，Git Bash 也起不来（命名管道被拦）。替代路径：状态用 `ccgs_state`，文档用 `ccgs_doc`，写文件用宿主文件工具；需要跑门禁脚本时，在宿主机自己的终端里执行 `studio/scripts/*.sh`。

**技能太多，和别的技能包重名吗？**
本包技能名与上游一致（`start`、`prototype`、`gate-check`……）。如果你已装了同名的第三方技能，DSH 会按层取第一个；本包的 provider 是 `ccgs-studio`，在插件详情里能看到来源。DSH 内置的 `dsh-doc`、`skill`、`find-skills` 等不会冲突。

**怎么临时停用/卸载？**
Plugins 面板里关掉或移除；也可以 `plugin_manager action=set_bundle target="dsh-ccgs-studio" enabled=false` / `action=remove_bundle`。停用后 78 个技能与 4 个工具一起消失，项目里已写的制品不受影响。

**能在已经开工的项目上用吗？**
可以：在项目根跑 `ccgs_init`（补脚手架），再 `/project-stage-detect` 让它根据现有制品推断阶段，然后 `/adopt` 做一次合规审计。

## 开发与升级

```bash
node test/bundle.test.mjs        # 自检（7 项）
node scripts/build-from-upstream.mjs --repo <上游 checkout> --commit <sha>
```

- 自检用假 ctx 真文件跑一遍：注册表、provider 列表、`ccgs_state`/`ccgs_init` 往返、`ccgs_role`、`ccgs_doc`、包元数据；不依赖 DSH 运行时。
- 重建脚本是确定性的：对同一上游提交重复运行产出逐字节相同的 `skills/` 与 `studio/`，所以升级就是一次可 review 的 diff。
- 升级上游：`git clone https://github.com/Donchitos/Claude-Code-Game-Studios.git upstream/` → 跑上面的构建脚本 → `node test/bundle.test.mjs` → 提交；`CHANGELOG.md` 记一行。

目录职责：`index.js`（入口/工具/技能注册）、`templates/`（手写模板）、`locale/`、`docs/DETAIL.md`、`test/`、`scripts/` 是手写维护的；`skills/`、`studio/` 由构建脚本生成，不要手改。

## 许可与致谢

- 本仓库（打包、`index.js`、工具、文档）：MIT，Copyright (c) 2026 y0n9
- 上游技能、角色简报与语料：MIT，Copyright (c) 2026 **Donchitos** — [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
- 详见 [LICENSE](./LICENSE) 与 [CREDITS.md](./CREDITS.md)

"Claude Code" 是 Anthropic 的商标，"DeepSeek Harness" 属于 DeepSeek。本项目是独立的移植工作，与上述双方均无隶属或背书关系。

---

English: [README.en.md](./README.en.md)
