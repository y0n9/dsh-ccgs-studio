// Self-test for the dsh-ccgs-studio bundle host code, without a running harness:
// a fake context records what apply() registers, then the tools run on real files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as bundle from '../index.js';

const PKG = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function fakeCtx(cwd = PKG) {
  const tools = new Map();
  const providers = [];
  const ctx = {
    tools: {
      register(definition) {
        assert.equal(typeof definition.name, 'string');
        assert.equal(typeof definition.description, 'string');
        assert.equal(typeof definition.execute, 'function');
        assert.equal(definition.parameters.type, 'object');
        assert.equal(typeof definition.output.render, 'function');
        tools.set(definition.name, definition);
        return () => tools.delete(definition.name);
      },
    },
    get(key) {
      if (key === 'skills') {
        return {
          registerProvider(create) {
            providers.push(create({ signal: new AbortController().signal, invalidate() {} }));
            return () => {};
          },
        };
      }
      if (key === 'workingDirectory') {
        return { async ensure() { return cwd; } };
      }
      return undefined;
    },
    effect(fn) {
      const disposer = fn();
      return () => {
        if (typeof disposer === 'function') disposer();
      };
    },
  };
  return { ctx, tools, providers };
}

const exec = { agent: {}, signal: new AbortController().signal };

test('apply registers the skills provider and the four tools', () => {
  const { ctx, tools, providers } = fakeCtx();
  bundle.apply(ctx);
  assert.deepEqual([...tools.keys()].sort(), ['ccgs_doc', 'ccgs_init', 'ccgs_role', 'ccgs_state']);
  assert.equal(providers.length, 1);
  assert.equal(providers[0].name, 'ccgs-studio');
});

test('the provider lists all 78 skills with a usable summary shape', async () => {
  const { ctx, providers } = fakeCtx();
  bundle.apply(ctx);
  const candidates = await providers[0].list({});
  assert.equal(candidates.length, 78);
  assert.equal(new Set(candidates.map((c) => c.name)).size, 78);
  for (const c of candidates) {
    assert.equal(typeof c.description, 'string');
    assert.ok(c.description.length > 0, `${c.name} has a description`);
    assert.deepEqual(c.invocation, { modelInvocable: true, userInvocable: true });
    assert.equal(c.source, 'bundled');
    assert.equal(c.provider, 'ccgs-studio');
    assert.equal(c.resourceBase.kind, 'directory');
    assert.ok(fs.existsSync(path.join(c.resourceBase.path, 'SKILL.md')));
  }
  const catalogChars = candidates.reduce((n, c) => n + c.name.length + c.description.length, 0);
  assert.ok(catalogChars < 40000, `catalog stays small: ${catalogChars} chars`);
});

test('the provider serves skill bodies without frontmatter', async () => {
  const { ctx, providers } = fakeCtx();
  bundle.apply(ctx);
  const [candidate] = await providers[0].list({});
  const definition = await providers[0].get(candidate);
  assert.equal(definition.name, candidate.name);
  assert.equal(typeof definition.content, 'string');
  assert.ok(!definition.content.startsWith('---'), 'frontmatter is stripped');
  assert.ok(definition.content.includes('DSH adapter'), 'adapter note is present');
  assert.equal(await providers[0].get({ name: 'no-such-skill' }), undefined);
});

test('ccgs_state resolves the stage and inventory after ccgs_init', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccgs-'));
  const { ctx, tools } = fakeCtx(root);
  bundle.apply(ctx);

  const before = await tools.get('ccgs_state').execute({}, exec);
  assert.equal(before.root, root);
  assert.equal(before.projectYaml.exists, false);
  assert.ok(before.notes.some((n) => n.includes('ccgs_init')));

  const init = await tools.get('ccgs_init').execute({}, exec);
  assert.equal(init.root, root);
  assert.ok(fs.existsSync(path.join(root, '.claude', 'docs', 'config-resolution.md')));
  assert.ok(fs.existsSync(path.join(root, '.claude', 'scripts', 'project-state.sh')));
  assert.ok(fs.existsSync(path.join(root, 'project.yaml')));
  assert.ok(fs.existsSync(path.join(root, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(root, 'production', 'session-state', 'active.md')));
  assert.ok(fs.existsSync(path.join(root, 'design', 'gdd')));
  assert.ok(init.written.includes('project.yaml'));

  const second = await tools.get('ccgs_init').execute({}, exec);
  assert.ok(second.skipped > 0, 'a rerun skips existing files');
  assert.deepEqual(second.written, [], 'a rerun writes nothing new');

  const yamlPath = path.join(root, 'project.yaml');
  const template = fs.readFileSync(yamlPath, 'utf8');
  assert.equal(template.includes('project:'), false, 'the template ships without a project: block');
  await fsp.writeFile(yamlPath, `${template}\nproject:\n  stage: Technical Setup\n`, 'utf8');

  const after = await tools.get('ccgs_state').execute({ limit: 5 }, exec);
  assert.equal(after.stage.value, 'Technical Setup');
  assert.equal(after.stage.source, 'project.yaml:project.stage');
  assert.equal(after.projectYaml.values['framework.version'], '1.3.0');
  assert.ok(after.dirs['design/gdd']);
  assert.ok(fs.existsSync(path.join(root, 'production', 'stage.txt')) === false);

  const mirror = path.join(root, 'production', 'stage.txt');
  await fsp.writeFile(mirror, 'Production\n', 'utf8');
  const clash = await tools.get('ccgs_state').execute({}, exec);
  assert.equal(clash.stage.value, 'Technical Setup', 'project.yaml wins over the legacy mirror');
  assert.ok(clash.notes.some((n) => n.includes('disagree')));

  await fsp.writeFile(yamlPath, template, 'utf8');
  const legacy = await tools.get('ccgs_state').execute({}, exec);
  assert.equal(legacy.stage.value, 'Production');
  assert.equal(legacy.stage.source, 'production/stage.txt');

  await fsp.rm(root, { recursive: true, force: true });
});

test('ccgs_role lists 49 roles and reads one brief', async () => {
  const { ctx, tools } = fakeCtx();
  bundle.apply(ctx);
  const role = tools.get('ccgs_role');
  const list = await role.execute({}, exec);
  assert.equal(list.count, 49);
  assert.equal(list.roles.length, 49);
  const brief = await role.execute({ role: 'qa-lead' }, exec);
  assert.equal(brief.role, 'qa-lead');
  assert.ok(brief.brief.length > 500);
  assert.ok(fs.existsSync(brief.path));
  const missing = await role.execute({ role: 'not-a-role' }, exec);
  assert.match(missing.error, /Unknown role/);
});

test('ccgs_doc lists, reads and searches the corpus, and refuses to escape it', async () => {
  const { ctx, tools } = fakeCtx();
  bundle.apply(ctx);
  const doc = tools.get('ccgs_doc');

  const overview = await doc.execute({}, exec);
  assert.ok(overview.folders.some((f) => f.folder === 'docs' && f.files > 100));
  assert.ok(overview.folders.some((f) => f.folder === 'rules'));

  const read = await doc.execute({ path: 'docs/config-resolution.md' }, exec);
  assert.ok(read.content.includes('project.stage'));
  assert.equal(read.truncated, false);

  const found = await doc.execute({ query: 'gate-check stage' }, exec);
  assert.ok(found.count > 0);
  assert.ok(found.hits.every((h) => typeof h.path === 'string' && h.line > 0));

  const escape = await doc.execute({ path: '../../package.json' }, exec);
  assert.match(escape.error, /inside the studio corpus/);
  const missing = await doc.execute({ path: 'docs/nope.md' }, exec);
  assert.match(missing.error, /No such corpus path/);
});

test('the package manifest and display metadata are complete', async () => {
  const pkg = JSON.parse(await fsp.readFile(path.join(PKG, 'package.json'), 'utf8'));
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(pkg.exports['.'], './index.js');
  assert.ok(fs.existsSync(path.join(PKG, 'cordis.patch.yml')));
  assert.ok(fs.existsSync(path.join(PKG, 'icon.svg')));
  assert.ok(fs.statSync(path.join(PKG, 'icon.svg')).size <= 256 * 1024);
  for (const locale of ['en', 'zh']) {
    const meta = JSON.parse(await fsp.readFile(path.join(PKG, 'locale', `${locale}.json`), 'utf8')).meta;
    assert.ok(meta.title && meta.description && meta.detail);
    assert.ok(fs.existsSync(path.join(PKG, meta.detail)));
    assert.ok(fs.statSync(path.join(PKG, meta.detail)).size <= 1024 * 1024);
  }
  for (const dir of pkg.files) assert.ok(fs.existsSync(path.join(PKG, dir)), `${dir} is shipped`);
});
