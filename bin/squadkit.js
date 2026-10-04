#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const { loadPack, validatePack, resolveVariables } = require('../lib/pack');
const { build, TARGETS } = require('../lib/build');

const PACKS_DIR = path.join(__dirname, '..', 'packs');

const HELP = `squadkit - packs de agentes de IA que trabalham em equipe

Uso:
  squadkit list                              Lista os packs disponiveis
  squadkit validate [pack...]                Valida packs (sem argumentos: todos)
  squadkit new <id> [--dir <pasta>]          Cria um pack novo a partir do _template
  squadkit build <pack> [opcoes]             Gera os arquivos do squad para uma ferramenta

Opcoes do build:
  --target <${TARGETS.join('|')}>   Padrao: claude
  --out <pasta>                              Padrao: ./out/<pack>
  --set chave=valor                          Sobrescreve uma variavel (repetivel)
  --config <arquivo.yaml>                    Variaveis em um arquivo (chave: valor)

<pack> e o id de um pack em packs/ ou o caminho de uma pasta com pack.yaml.`;

function parseArgs(argv) {
  const args = { _: [], set: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--set') {
      const [k, ...v] = (argv[++i] || '').split('=');
      if (!k || !v.length) throw new Error('--set espera chave=valor');
      args.set[k] = v.join('=');
    } else if (a.startsWith('--')) {
      args[a.slice(2)] = argv[++i];
    } else args._.push(a);
  }
  return args;
}

function resolvePackDir(ref) {
  if (fs.existsSync(path.join(ref, 'pack.yaml'))) return ref;
  const byId = path.join(PACKS_DIR, ref);
  if (fs.existsSync(path.join(byId, 'pack.yaml'))) return byId;
  throw new Error(`pack "${ref}" nao encontrado (rode "squadkit list")`);
}

function listPackIds() {
  return fs.readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(PACKS_DIR, d.name, 'pack.yaml')))
    .map((d) => d.name);
}

function cmdList() {
  for (const id of listPackIds()) {
    const { meta, agents } = loadPack(path.join(PACKS_DIR, id));
    console.log(`${id.padEnd(24)} ${String(agents.length).padStart(2)} agentes  ${meta.name}`);
  }
}

function cmdValidate(refs) {
  const targets = refs.length ? refs : listPackIds();
  let failed = 0;
  for (const ref of targets) {
    const pack = loadPack(resolvePackDir(ref));
    const { errors, warnings } = validatePack(pack);
    console.log(`${errors.length ? 'FAIL' : 'OK  '} ${ref} (${pack.agents.length} agentes)`);
    warnings.forEach((w) => console.log(`  aviso: ${w}`));
    errors.forEach((e) => console.log(`  erro:  ${e}`));
    if (errors.length) failed++;
  }
  return failed ? 1 : 0;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function cmdNew(args) {
  const id = args._[1];
  if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('informe um id valido: squadkit new meu-pack (minusculas e hifens)');
  const dest = path.resolve(args.dir || path.join(PACKS_DIR, id));
  if (fs.existsSync(dest)) throw new Error(`${dest} ja existe`);
  copyDir(path.join(PACKS_DIR, '_template'), dest);
  const file = path.join(dest, 'pack.yaml');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^id: .*$/m, `id: ${id}`));
  console.log(`Pack criado em ${dest}\nProximo passo: edite pack.yaml, agents/ e workflow.yaml; depois rode "squadkit validate ${dest}".`);
}

function cmdBuild(args) {
  const ref = args._[1];
  if (!ref) throw new Error('informe o pack: squadkit build <pack>');
  const pack = loadPack(resolvePackDir(ref));
  const { errors } = validatePack(pack);
  if (errors.length) throw new Error(`pack invalido:\n  ${errors.join('\n  ')}`);

  const fromFile = args.config ? YAML.parse(fs.readFileSync(args.config, 'utf8')) || {} : {};
  const { vars, missing } = resolveVariables(pack, { ...fromFile, ...args.set });
  if (missing.length) throw new Error(`variaveis obrigatorias sem valor: ${missing.join(', ')} (use --set chave=valor ou --config)`);

  const target = args.target || 'claude';
  const out = path.resolve(args.out || path.join('out', pack.meta.id));
  const files = build(pack, { target, out, vars });
  console.log(`Squad "${pack.meta.name}" gerado para ${target} em ${out}`);
  files.forEach((f) => console.log(`  ${f}`));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  switch (cmd) {
    case 'list': return cmdList();
    case 'validate': process.exitCode = cmdValidate(args._.slice(1)); return;
    case 'new': return cmdNew(args);
    case 'build': return cmdBuild(args);
    default: console.log(HELP);
  }
}

try {
  main();
} catch (e) {
  console.error(`erro: ${e.message}`);
  process.exitCode = 1;
}
