'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadPack, validatePack, resolveVariables, render } = require('../lib/pack');
const { build } = require('../lib/build');

const PACKS = path.join(__dirname, '..', 'packs');
const CLI = path.join(__dirname, '..', 'bin', 'squadkit.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'squadkit-'));

test('todos os packs do repositorio sao validos', () => {
  for (const id of fs.readdirSync(PACKS)) {
    const { errors } = validatePack(loadPack(path.join(PACKS, id)));
    assert.deepStrictEqual(errors, [], id);
  }
});

test('validacao detecta agente inexistente, ciclo e variavel nao declarada', () => {
  const dir = tmp();
  fs.cpSync(path.join(PACKS, '_template'), dir, { recursive: true });
  const wf = path.join(dir, 'workflow.yaml');
  fs.writeFileSync(wf, fs.readFileSync(wf, 'utf8')
    .replace('agent: specialist', 'agent: fantasma')
    .replace('depends_on: [execute]', 'depends_on: [execute]\n    # x')
    .replace('title: Entender o pedido', 'title: Entender {{nao_declarada}}'));
  let { errors } = validatePack(loadPack(dir));
  assert.ok(errors.some((e) => e.includes('fantasma')));
  assert.ok(errors.some((e) => e.includes('nao_declarada')));

  fs.writeFileSync(wf, fs.readFileSync(wf, 'utf8').replace('goal: Ler briefing.md', 'depends_on: [review]\n    goal: Ler briefing.md'));
  ({ errors } = validatePack(loadPack(dir)));
  assert.ok(errors.some((e) => e.includes('circulares')));
});

test('variaveis: default, override e obrigatoria', () => {
  const pack = loadPack(path.join(PACKS, 'marketing-consulting'));
  const { vars, missing } = resolveVariables(pack, { business_type: 'SaaS B2B' });
  assert.deepStrictEqual(missing, ['client_name']);
  assert.strictEqual(vars.business_type, 'SaaS B2B');
  assert.strictEqual(vars.output_language, 'pt-BR');
  assert.strictEqual(render('Oi {{client_name}}', { client_name: 'Acme' }), 'Oi Acme');
});

test('build claude gera CLAUDE.md, subagentes e briefing sem placeholders', () => {
  const out = tmp();
  const pack = loadPack(path.join(PACKS, 'marketing-consulting'));
  const { vars } = resolveVariables(pack, { client_name: 'Acme' });
  build(pack, { target: 'claude', out, vars });
  const agents = fs.readdirSync(path.join(out, '.claude/agents')).sort();
  assert.deepStrictEqual(agents, ['copywriter.md', 'market-analyst.md', 'media-optimizer.md', 'sdr-qualifier.md']);
  const sub = fs.readFileSync(path.join(out, '.claude/agents/market-analyst.md'), 'utf8');
  assert.match(sub, /^---\nname: market-analyst\n/);
  assert.match(sub, /tools: Read, Write, WebSearch, WebFetch/);
  for (const f of ['CLAUDE.md', 'briefing.md']) {
    assert.doesNotMatch(fs.readFileSync(path.join(out, f), 'utf8'), /\{\{/);
  }
});

test('build agents-md e prompt geram arquivo unico', () => {
  const pack = loadPack(path.join(PACKS, 'marketing-consulting'));
  const { vars } = resolveVariables(pack, { client_name: 'Acme' });
  for (const [target, file] of [['agents-md', 'AGENTS.md'], ['prompt', 'squad-prompt.md']]) {
    const out = tmp();
    build(pack, { target, out, vars });
    const txt = fs.readFileSync(path.join(out, file), 'utf8');
    assert.match(txt, /Gerente de Marketing/);
    assert.match(txt, /Step 7/);
  }
});

test('CLI: new cria pack valido e build exige variavel obrigatoria', () => {
  const dir = path.join(tmp(), 'meu-pack');
  execFileSync('node', [CLI, 'new', 'meu-pack', '--dir', dir]);
  execFileSync('node', [CLI, 'validate', dir]);
  assert.throws(() => execFileSync('node', [CLI, 'build', dir, '--out', tmp()], { stdio: 'pipe' }), /client_name/);
  execFileSync('node', [CLI, 'build', dir, '--out', tmp(), '--set', 'client_name=Acme']);
});
