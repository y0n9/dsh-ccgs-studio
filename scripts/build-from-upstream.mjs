#!/usr/bin/env node
// Regenerate the packaged payload (skills/, studio/) from a checkout of the upstream
// Claude Code Game Studios repository. Deterministic: running it twice on the same
// upstream commit produces identical files, so an upstream update shows up as a
// reviewable git diff.
//
// Usage:
//   node scripts/build-from-upstream.mjs --repo <path-to-Claude-Code-Game-Studios> [--out <package-dir>] [--commit <sha>]
//
//   --repo    upstream checkout that contains CLAUDE.md, project.yaml and .claude/
//             (default: $CCGS_UPSTREAM, otherwise the script exits with usage)
//   --out     package directory to write into (default: the directory above scripts/)
//   --commit  upstream commit recorded in skills/manifest.json
//             (default: `git -C <repo> rev-parse HEAD`, else "unknown")
//
// It rewrites skills/ and studio/ completely. Packaging files (index.js, package.json,
// locale/, docs/DETAIL.md, templates/) are hand-written and never touched.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const UPSTREAM = 'Donchitos/Claude-Code-Game-Studios';
const DESC_CAP = 320;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultOut = path.resolve(scriptDir, '..');

function parseArgs(argv) {
  const args = { out: defaultOut, repo: process.env.CCGS_UPSTREAM || '', commit: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i] || '';
    else if (a === '--out') args.out = path.resolve(argv[++i] || '');
    else if (a === '--commit') args.commit = argv[++i] || '';
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('-') && !args.repo) args.repo = a;
    else if (!a.startsWith('-')) throw new Error(`unexpected argument: ${a}`);
  }
  return args;
}

const VARIANTS = [
  '`subagent_type: X` -> `ccgs_role` then `subagent`',
  '`AskUserQuestion` -> `ask_user_question`',
  '`Skill(<name>)` -> the `skill` tool',
  'Read/Write/Edit/Glob/Grep/Bash -> this host\'s file, search and shell tools',
].join('; ');

const PREAMBLE = `> **DSH adapter.** Converted from ${UPSTREAM} (MIT) for DeepSeek Harness; the workflow steps are unchanged.
> Tool mapping: ${VARIANTS}.
> Studio helpers (\`.claude/scripts/*.sh\`, \`.claude/hooks/*.sh\`) need a POSIX bash. Where bash is unavailable, read state with \`ccgs_state\` and make the same writes with the file tools instead.
> Run \`ccgs_init({path})\` once per project so \`.claude/\` and \`project.yaml\` exist; use \`ccgs_doc\` to read studio docs and \`ccgs_role\` for the 49 studio role briefs.

`;

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const km = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line);
    if (km) {
      key = km[1];
      data[key] = km[2];
      continue;
    }
    if (key && /^[ \t]+\S/.test(line)) data[key] = (data[key] ? data[key] + '\n' : '') + line.trim();
  }
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    let s = String(v).trim();
    if (s === '>' || s === '|' || s === '>-' || s === '|-') s = '';
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    s = s.replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
    out[k] = s;
  }
  return { data: out, body: text.slice(m[0].length) };
}

function capDesc(s) {
  if (s.length <= DESC_CAP) return s;
  const cut = s.slice(0, DESC_CAP);
  const at = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (at > 120 ? cut.slice(0, at + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
}

function adaptBody(body) {
  return body
    .replace(/`subagent_type:\s*([A-Za-z0-9_.-]+)`/g, '`ccgs_role` -> `subagent` ($1)')
    .replace(/\bsubagent_type:\s*([A-Za-z0-9_.-]+)/g, 'ccgs_role -> subagent ($1)')
    .replace(/\bAskUserQuestion\b/g, 'ask_user_question')
    .replace(/\bSkill\(([A-Za-z0-9_-]+)\)/g, 'skill($1)')
    .replace(/^\s*\n/, '');
}

async function copyTree(src, dest, filter = () => true) {
  let files = 0;
  await fsp.mkdir(dest, { recursive: true });
  for (const e of await fsp.readdir(src, { withFileTypes: true })) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (!filter(e.name, from, e)) continue;
    if (e.isDirectory()) files += await copyTree(from, to, filter);
    else if (e.isFile()) {
      await fsp.copyFile(from, to);
      files += 1;
    }
  }
  return files;
}

async function walk(dir, base = dir, acc = []) {
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, base, acc);
    else acc.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return acc;
}

function readFrameworkVersion(repo) {
  const file = path.join(repo, 'project.yaml');
  if (!fs.existsSync(file)) return '';
  const m = /framework:\s*\n(?:[ \t]+.*\n)*?[ \t]+version:\s*["']?([0-9][^"'\s]*)/.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1] : '';
}

function upstreamCommit(repo, given) {
  if (given) return given;
  try {
    return execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.repo) {
    console.log('usage: node scripts/build-from-upstream.mjs --repo <upstream-checkout> [--out <package-dir>] [--commit <sha>]');
    process.exit(args.help ? 0 : 2);
  }
  const REPO = path.resolve(args.repo);
  const OUT = args.out;
  for (const required of ['CLAUDE.md', 'project.yaml', path.join('.claude', 'skills'), path.join('.claude', 'agents')]) {
    if (!fs.existsSync(path.join(REPO, required))) throw new Error(`not an upstream checkout, missing ${required}: ${REPO}`);
  }

  const t0 = Date.now();
  const studioSrc = path.join(REPO, '.claude');
  const studioOut = path.join(OUT, 'studio');
  await fsp.rm(studioOut, { recursive: true, force: true });

  const counts = {};
  for (const d of ['agents', 'docs', 'engines', 'genres', 'hooks', 'rules', 'scripts']) {
    counts[d] = await copyTree(path.join(studioSrc, d), path.join(studioOut, d));
  }
  await fsp.copyFile(path.join(REPO, 'CLAUDE.md'), path.join(studioOut, 'CLAUDE.md'));
  await fsp.copyFile(path.join(REPO, 'project.yaml'), path.join(studioOut, 'project.yaml'));
  for (const f of ['COLLABORATIVE-DESIGN-PRINCIPLE.md', 'WORKFLOW-GUIDE.md', 'tr-registry.yaml', 'VERSION.md']) {
    const src = path.join(REPO, 'docs', f);
    if (fs.existsSync(src)) {
      await fsp.mkdir(path.join(studioOut, 'repo-docs'), { recursive: true });
      await fsp.copyFile(src, path.join(studioOut, 'repo-docs', f));
    }
  }

  const agentsSrc = path.join(studioSrc, 'agents');
  const agents = [];
  for (const f of (await fsp.readdir(agentsSrc)).filter((n) => n.endsWith('.md')).sort()) {
    const abs = path.join(agentsSrc, f);
    const { data } = parseFrontmatter(await fsp.readFile(abs, 'utf8'));
    agents.push({
      name: data.name || path.basename(f, '.md'),
      description: data.description || '',
      model: data.model || '',
      tools: data.tools || '',
      file: f,
      bytes: (await fsp.stat(abs)).size,
    });
  }
  await fsp.writeFile(
    path.join(studioOut, 'agents', 'index.json'),
    `${JSON.stringify({ count: agents.length, agents }, null, 2)}\n`,
    'utf8',
  );

  const skillsSrc = path.join(studioSrc, 'skills');
  const skillsOut = path.join(OUT, 'skills');
  await fsp.rm(skillsOut, { recursive: true, force: true });
  const manifest = [];
  const warnings = [];
  for (const dir of (await fsp.readdir(skillsSrc, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    const skillMd = path.join(skillsSrc, dir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      warnings.push(`no SKILL.md in ${dir}`);
      continue;
    }
    const { data, body } = parseFrontmatter(await fsp.readFile(skillMd, 'utf8'));
    const name = (data.name || dir).trim();
    const description = (data.description || '').trim();
    if (!description) warnings.push(`empty description in ${dir}`);
    const outDir = path.join(skillsOut, name);
    await fsp.mkdir(outDir, { recursive: true });
    await fsp.writeFile(
      path.join(outDir, 'SKILL.md'),
      `---\nname: ${name}\ndescription: ${JSON.stringify(capDesc(description))}\n---\n\n${PREAMBLE}${adaptBody(body)}`,
      'utf8',
    );
    const extra = (await walk(path.join(skillsSrc, dir))).filter((rel) => rel !== 'SKILL.md');
    for (const rel of extra) {
      const to = path.join(outDir, rel);
      await fsp.mkdir(path.dirname(to), { recursive: true });
      await fsp.copyFile(path.join(skillsSrc, dir, rel), to);
    }
    manifest.push({
      name,
      dir: name,
      description: capDesc(description),
      fullDescription: description,
      invocation: { modelInvocable: true, userInvocable: true },
      files: ['SKILL.md', ...extra],
      upstreamTools: data['allowed-tools'] || '',
      upstreamModel: data.model || '',
    });
  }

  const commit = upstreamCommit(REPO, args.commit);
  await fsp.writeFile(
    path.join(skillsOut, 'manifest.json'),
    `${JSON.stringify(
      {
        upstream: UPSTREAM,
        upstreamCommit: commit,
        upstreamFramework: readFrameworkVersion(REPO),
        count: manifest.length,
        skills: manifest,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const catalogChars = manifest.reduce((n, s) => n + s.description.length, 0);
  console.log(
    JSON.stringify(
      {
        upstream: REPO,
        upstreamCommit: commit,
        out: OUT,
        corpus: counts,
        agents: agents.length,
        skills: manifest.length,
        catalogChars,
        estTokens: Math.round(catalogChars / 3.2),
        warnings,
        ms: Date.now() - t0,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
