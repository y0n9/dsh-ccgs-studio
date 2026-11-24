// dsh-ccgs-studio — DeepSeek Harness host bundle for Claude Code Game Studios.
//
// Registers:
//   - the 78 studio workflow skills, through a borrowed `skills` provider
//   - ccgs_state   read-only project observation (project.yaml + artifact inventory)
//   - ccgs_init    scaffold .claude/ + project.yaml + skeleton dirs into a project
//   - ccgs_role    list / read the 49 studio agent role briefs
//   - ccgs_doc     list / read / search the shipped studio corpus
//
// Upstream: https://github.com/Donchitos/Claude-Code-Game-Studios (MIT).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-ccgs-studio';
export const inject = ['tools'];

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = path.join(here, 'skills');
const STUDIO_ROOT = path.join(here, 'studio');
const UPSTREAM = 'Donchitos/Claude-Code-Game-Studios';

const MAX_READ = 40000;
const CORPUS_TEXT = /\.(md|markdown|txt|ya?ml|tsv|json|sh|bash|awk|py)$/i;

/* ------------------------------------------------------------------ helpers */

function jsonOutput(schema = { type: 'object', additionalProperties: true }) {
  return {
    schema,
    render(args, value) {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      return [{ type: 'text', text }];
    },
  };
}

function readTextSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function cap(text, max) {
  if (typeof text !== 'string' || text.length <= max) return { text: text ?? '', truncated: false };
  return { text: text.slice(0, max) + `\n… [truncated, ${text.length - max} characters remain]`, truncated: true };
}

function listNames(dir, limit) {
  if (!isDir(dir)) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const names = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).sort();
  const shown = names.slice(0, limit);
  return { count: names.length, shown, omitted: Math.max(0, names.length - shown.length) };
}

async function walkFiles(dir, base = dir, acc = [], depth = 0) {
  if (depth > 8) return acc;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkFiles(full, base, acc, depth + 1);
    else if (e.isFile()) acc.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return acc;
}

// Tolerant reader for the studio's hand-formatted project.yaml: flattens one level
// of nesting into `section.key`, keeps comments out, and preserves raw strings.
function parseProjectYaml(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  let section = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const top = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (top) {
      const key = top[1];
      const value = top[2].trim();
      if (value === '') {
        section = key;
      } else {
        section = null;
        out[key] = value;
      }
      continue;
    }
    const child = /^[ \t]+([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (child && section) {
      const value = child[2].trim();
      if (value !== '') out[`${section}.${child[1]}`] = value;
    }
  }
  return out;
}

function stripQuotes(v) {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

async function resolveRoot(ctx, exec, requested) {
  const wd = ctx.get('workingDirectory');
  let cwd;
  try {
    cwd = wd ? await wd.ensure(exec?.agent, exec?.signal) : undefined;
  } catch {
    cwd = undefined;
  }
  if (typeof cwd !== 'string' || cwd === '') cwd = process.cwd();
  if (typeof requested === 'string' && requested.trim() !== '') return path.resolve(cwd, requested.trim());
  return cwd;
}

/* ------------------------------------------------------------ skills provider */

const manifest = JSON.parse(fs.readFileSync(path.join(SKILLS_ROOT, 'manifest.json'), 'utf8'));

function createProvider() {
  const byName = new Map(manifest.skills.map((s) => [s.name, s]));
  return {
    name: 'ccgs-studio',
    async list() {
      return manifest.skills.map((s, index) => ({
        name: s.name,
        description: s.description,
        invocation: s.invocation,
        source: 'bundled',
        provider: 'ccgs-studio',
        rank: index,
        locator: s.dir,
        path: path.join(SKILLS_ROOT, s.dir, 'SKILL.md'),
        resourceBase: { kind: 'directory', path: path.join(SKILLS_ROOT, s.dir) },
        metadata: { upstream: UPSTREAM, files: s.files, upstreamModel: s.upstreamModel },
      }));
    },
    async get(candidate) {
      const entry = byName.get(candidate?.name) ?? byName.get(candidate?.locator);
      if (!entry) return undefined;
      const raw = await fsp.readFile(path.join(SKILLS_ROOT, entry.dir, 'SKILL.md'), 'utf8');
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      return {
        name: candidate?.name ?? entry.name,
        description: entry.description,
        invocation: entry.invocation,
        source: 'bundled',
        provider: 'ccgs-studio',
        path: path.join(SKILLS_ROOT, entry.dir, 'SKILL.md'),
        resourceBase: { kind: 'directory', path: path.join(SKILLS_ROOT, entry.dir) },
        content: body,
      };
    },
  };
}

/* -------------------------------------------------------------------- tools */

export function apply(ctx) {
  const skills = ctx.get('skills');
  if (skills && typeof skills.registerProvider === 'function') {
    ctx.effect(() => skills.registerProvider(() => createProvider()));
  }

  ctx.effect(() =>
    ctx.tools.register({
      name: 'ccgs_state',
      description:
        'Read the Game Studio state of a project: project.yaml keys, the resolved project.stage (project.yaml, else production/stage.txt), and which design/, docs/, production/ and test artifacts actually exist. Read-only observation, no writes, no verdicts. Use it before stage work (start, gate-check, next-step, project-stage-detect) instead of the studio bash helpers when bash is unavailable.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project root. Defaults to the session working directory.' },
          limit: { type: 'number', description: 'Directory entries shown per folder (default 40, max 200).' },
        },
        required: [],
      },
      output: jsonOutput(),
      async execute(args, exec) {
        const root = await resolveRoot(ctx, exec, args?.path);
        const limit = Math.max(5, Math.min(200, Math.floor(typeof args?.limit === 'number' ? args.limit : 40)));
        const yamlPath = path.join(root, 'project.yaml');
        const yamlText = readTextSafe(yamlPath);
        const values = yamlText ? parseProjectYaml(yamlText) : {};
        const pick = (key) => (values[key] === undefined ? undefined : stripQuotes(values[key]));

        const stageYaml = pick('project.stage');
        const stageTxtRaw = readTextSafe(path.join(root, 'production', 'stage.txt'));
        const stageTxt = stageTxtRaw ? stageTxtRaw.trim() : null;
        const stage = stageYaml || stageTxt || null;
        const stageSource = stageYaml ? 'project.yaml:project.stage' : stageTxt ? 'production/stage.txt' : null;

        const notes = [];
        if (stageYaml && stageTxt && stageYaml.toLowerCase() !== stageTxt.toLowerCase()) {
          notes.push(`project.stage (${stageYaml}) and production/stage.txt (${stageTxt}) disagree; project.yaml wins.`);
        }
        if (!stage) notes.push('No stage recorded yet: /start runs onboarding, and /gate-check writes the stage when it passes.');
        const workspaceDocs = pick('workspace.documents');
        if (workspaceDocs) notes.push(`workspace.documents = ${workspaceDocs}`);
        if (!yamlText) notes.push('No project.yaml at the root; run ccgs_init to scaffold the studio, or copy studio/project.yaml.');

        const dirs = {};
        for (const rel of [
          '.claude',
          '.claude/agents',
          '.claude/docs',
          '.claude/rules',
          '.claude/scripts',
          'design',
          'design/gdd',
          'docs',
          'docs/engine-reference',
          'production',
          'production/session-state',
          'production/epics',
          'production/sprints',
          'tests',
          'prototypes',
          'src',
          'Assets',
          'Source',
          'assets',
        ]) {
          const full = path.join(root, rel);
          if (!isDir(full)) continue;
          dirs[rel] = listNames(full, limit);
        }

        const files = {};
        for (const rel of [
          'CLAUDE.md',
          'AGENTS.md',
          'project.yaml',
          'project.local.yaml',
          'production/session-state/active.md',
          'design/CLAUDE.md',
          'docs/CLAUDE.md',
        ]) {
          if (isFile(path.join(root, rel))) {
            files[rel] = true;
          }
        }

        const engine =
          pick('engine.name') ||
          (isDir(path.join(root, 'Assets')) ? 'Unity? (Assets/ present)' : '') ||
          (isDir(path.join(root, 'Source')) ? 'Unreal? (Source/ present)' : '') ||
          (isDir(path.join(root, 'src')) ? 'Web or Godot? (src/ present)' : '') ||
          null;

        return {
          root,
          projectYaml: { path: yamlPath, exists: Boolean(yamlText), values },
          stage: { value: stage, source: stageSource, legacyMirror: stageTxt },
          engine,
          files,
          dirs,
          notes,
        };
      },
    }),
  );

  ctx.effect(() =>
    ctx.tools.register({
      name: 'ccgs_init',
      description:
        'Scaffold a Game Studio project: copy the studio corpus (.claude/agents, docs, engines, genres, hooks, rules, scripts and CLAUDE.md), write project.yaml, create the design/docs/tests/production skeleton directories and an AGENTS.md entry point. Existing files are skipped unless overwrite is true. Run once per project before the studio skills write artifacts.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project root. Defaults to the session working directory.' },
          overwrite: { type: 'boolean', description: 'Replace existing files instead of skipping them (default false).' },
        },
        required: [],
      },
      output: jsonOutput(),
      async execute(args, exec) {
        const root = await resolveRoot(ctx, exec, args?.path);
        const overwrite = args?.overwrite === true;
        const report = { root, copied: 0, skipped: 0, written: [], existing: [] };

        const copyFile = async (from, to) => {
          if (!overwrite && isFile(to)) {
            report.skipped += 1;
            return;
          }
          await fsp.mkdir(path.dirname(to), { recursive: true });
          await fsp.copyFile(from, to);
          report.copied += 1;
        };
        const copyTree = async (from, to) => {
          for (const e of await fsp.readdir(from, { withFileTypes: true })) {
            const src = path.join(from, e.name);
            const dest = path.join(to, e.name);
            if (e.isDirectory()) await copyTree(src, dest);
            else if (e.isFile()) await copyFile(src, dest);
          }
        };

        await fsp.mkdir(root, { recursive: true });
        for (const dir of ['agents', 'docs', 'engines', 'genres', 'hooks', 'rules', 'scripts']) {
          const from = path.join(STUDIO_ROOT, dir);
          if (isDir(from)) await copyTree(from, path.join(root, '.claude', dir));
        }
        await copyFile(path.join(STUDIO_ROOT, 'CLAUDE.md'), path.join(root, '.claude', 'CLAUDE.md'));

        const yamlTo = path.join(root, 'project.yaml');
        if (!isFile(yamlTo) || overwrite) {
          await fsp.copyFile(path.join(STUDIO_ROOT, 'project.yaml'), yamlTo);
          report.written.push('project.yaml');
        } else {
          report.existing.push('project.yaml');
        }

        const skeleton = [
          'design/gdd',
          'design/narrative',
          'design/levels',
          'design/balance',
          'docs/engine-reference',
          'tests/unit',
          'tests/integration',
          'tools',
          'prototypes',
          'production/session-state',
          'production/session-logs',
          'assets',
        ];
        for (const rel of skeleton) await fsp.mkdir(path.join(root, rel), { recursive: true });

        const agentsMd = path.join(root, 'AGENTS.md');
        if (!isFile(agentsMd) || overwrite) {
          await fsp.copyFile(path.join(here, 'templates', 'AGENTS.md'), agentsMd);
          report.written.push('AGENTS.md');
        } else {
          report.existing.push('AGENTS.md');
        }

        const activeMd = path.join(root, 'production', 'session-state', 'active.md');
        if (!isFile(activeMd)) {
          await fsp.writeFile(
            activeMd,
            `# Session State\n\nCheckpoint for the current work. Rewrite this file instead of relying on chat history.\n\n## Stage\n\n(see project.yaml project.stage)\n\n## Working on\n\n- \n\n## Decisions\n\n- \n\n## Next\n\n- \n`,
            'utf8',
          );
          report.written.push('production/session-state/active.md');
        }

        report.next = [
          'Run /start for guided onboarding, or /prototype to make a playable game now.',
          'Engine setup is /setup-engine; it writes docs/engine-reference/<engine>/VERSION.md.',
          'Read studio docs with ccgs_doc({query}) and role briefs with ccgs_role({role}).',
        ];
        return report;
      },
    }),
  );

  ctx.effect(() =>
    ctx.tools.register({
      name: 'ccgs_role',
      description:
        'The 49 studio agent role briefs: list them, or read one. A brief is the role text to hand to a subagent, so delegation keeps the studio separation of concerns (creative-director, lead-programmer, qa-lead, unity-specialist, ...). Use it wherever a studio skill says `subagent_type: <role>`.',
      parameters: {
        type: 'object',
        properties: {
          list: { type: 'boolean', description: 'List every role with a one-line summary (default when role is omitted).' },
          role: { type: 'string', description: 'Role file name without .md, e.g. creative-director, qa-lead, unity-specialist.' },
          maxChars: { type: 'number', description: 'Cap for a read brief (default 24000, max 60000).' },
        },
        required: [],
      },
      output: jsonOutput(),
      async execute(args) {
        const index = JSON.parse(fs.readFileSync(path.join(STUDIO_ROOT, 'agents', 'index.json'), 'utf8'));
        const role = typeof args?.role === 'string' ? args.role.trim().replace(/\.md$/i, '') : '';
        if (!role) {
          return {
            count: index.count,
            note: 'Call with {role} to read a brief; the description is the roster line, the file is the full brief.',
            roles: index.agents.map((a) => ({
              role: a.name,
              summary: a.description.length > 170 ? `${a.description.slice(0, 168)}…` : a.description,
              model: a.model,
            })),
          };
        }
        const entry = index.agents.find((a) => a.name === role);
        if (!entry) return { error: `Unknown role "${role}".`, roles: index.agents.map((a) => a.name) };
        const max = Math.max(2000, Math.min(60000, Math.floor(typeof args?.maxChars === 'number' ? args.maxChars : 24000)));
        const raw = await fsp.readFile(path.join(STUDIO_ROOT, 'agents', entry.file), 'utf8');
        const body = cap(raw, max);
        return {
          role: entry.name,
          model: entry.model,
          path: path.join(STUDIO_ROOT, 'agents', entry.file),
          truncated: body.truncated,
          brief: body.text,
        };
      },
    }),
  );

  ctx.effect(() =>
    ctx.tools.register({
      name: 'ccgs_doc',
      description:
        'The shipped studio corpus: list its folders, read one document by studio-relative path (docs/, rules/, genres/, engines/, scripts/, agents/), or search it by words. Use it to find the exact doc or helper a skill references instead of guessing paths.',
      parameters: {
        type: 'object',
        properties: {
          list: { type: 'boolean', description: 'List the corpus folders with file counts (default when neither path nor query is given).' },
          folder: { type: 'string', description: 'With list: a studio-relative folder such as docs or genres/chipsets.' },
          path: { type: 'string', description: 'Studio-relative document path, e.g. docs/config-resolution.md.' },
          query: { type: 'string', description: 'Search words across the corpus (case-insensitive), returns matching lines with paths.' },
          maxChars: { type: 'number', description: 'Cap for a read (default 32000, max 80000).' },
        },
        required: [],
      },
      output: jsonOutput(),
      async execute(args) {
        const inside = (rel) => {
          const full = path.resolve(STUDIO_ROOT, rel);
          if (full !== STUDIO_ROOT && !full.startsWith(STUDIO_ROOT + path.sep)) return null;
          return full;
        };

        if (typeof args?.query === 'string' && args.query.trim() !== '') {
          const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
          const files = await walkFiles(STUDIO_ROOT);
          const hits = [];
          for (const rel of files) {
            if (!CORPUS_TEXT.test(rel) || rel.startsWith('agents/') || rel === 'agents/index.json') continue;
            const text = readTextSafe(path.join(STUDIO_ROOT, rel));
            if (!text) continue;
            const lines = text.split(/\r?\n/);
            for (let i = 0; i < lines.length; i += 1) {
              const low = lines[i].toLowerCase();
              if (!terms.every((t) => low.includes(t))) continue;
              hits.push({ path: rel, line: i + 1, text: lines[i].trim().slice(0, 200) });
              if (hits.length >= 40) break;
            }
            if (hits.length >= 40) break;
          }
          return { query: args.query, scanned: files.length, count: hits.length, hits };
        }

        if (typeof args?.path === 'string' && args.path.trim() !== '') {
          const full = inside(args.path.trim());
          if (!full) return { error: 'Path must stay inside the studio corpus.' };
          const stat = isFile(full) ? 'file' : isDir(full) ? 'directory' : 'missing';
          if (stat === 'missing') return { error: `No such corpus path: ${args.path}`, hint: 'Call with {list:true} to see the folders.' };
          if (stat === 'directory') {
            return { path: args.path, entries: listNames(full, 200) };
          }
          const raw = await fsp.readFile(full, 'utf8');
          const max = Math.max(2000, Math.min(80000, Math.floor(typeof args?.maxChars === 'number' ? args.maxChars : 32000)));
          const body = cap(raw, max);
          return { path: args.path, bytes: raw.length, truncated: body.truncated, content: body.text };
        }

        const folders = ['agents', 'docs', 'engines', 'genres', 'hooks', 'rules', 'scripts', 'repo-docs'];
        const root = inside(typeof args?.folder === 'string' && args.folder ? args.folder : '');
        if (!root) return { error: 'Folder must stay inside the studio corpus.' };
        const overview = [];
        for (const f of folders) {
          const full = path.join(root, f);
          if (!isDir(full)) continue;
          const files = await walkFiles(full);
          overview.push({ folder: f, files: files.length });
        }
        const entries = typeof args?.folder === 'string' && args.folder ? listNames(root, 200) : null;
        return {
          note: 'Read with {path:"docs/<name>.md"}; search with {query:"words"}. agents/ is also available through ccgs_role.',
          folders: overview,
          entries,
        };
      },
    }),
  );
}
