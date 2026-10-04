'use strict';
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const ID_RE = /^[a-z][a-z0-9-]*$/;
const KNOWN_TOOLS = ['read', 'write', 'edit', 'bash', 'web_search', 'web_fetch'];
const VAR_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

function parseFrontmatter(text, label) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${label}: frontmatter YAML ausente (--- ... ---)`);
  return { data: YAML.parse(m[1]) || {}, body: m[2].trim() };
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** Carrega um pack (pasta com pack.yaml) sem validar. */
function loadPack(dir) {
  const root = path.resolve(dir);
  const packFile = path.join(root, 'pack.yaml');
  if (!fs.existsSync(packFile)) throw new Error(`pack.yaml nao encontrado em ${root}`);
  const meta = YAML.parse(fs.readFileSync(packFile, 'utf8')) || {};

  const agents = [];
  const agentsDir = path.join(root, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir).filter((n) => n.endsWith('.md')).sort()) {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(agentsDir, f), 'utf8'), `agents/${f}`);
      agents.push({ ...data, file: f, body });
    }
  }

  const workflowRaw = readIfExists(path.join(root, meta.workflow || 'workflow.yaml'));
  const workflow = workflowRaw ? YAML.parse(workflowRaw) || {} : null;
  const briefing = readIfExists(path.join(root, 'briefing.template.md'));
  return { root, meta, agents, workflow, workflowRaw, briefing };
}

function hasCycle(steps) {
  const deps = new Map(steps.map((s) => [s.id, s.depends_on || []]));
  const state = new Map();
  const visit = (id) => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2 || !deps.has(id)) return false;
    state.set(id, 1);
    for (const d of deps.get(id)) if (visit(d)) return true;
    state.set(id, 2);
    return false;
  };
  return [...deps.keys()].some(visit);
}

/** Valida um pack carregado. Retorna { errors, warnings }. */
function validatePack(pack) {
  const errors = [];
  const warnings = [];
  const { meta, agents, workflow } = pack;

  for (const k of ['id', 'name', 'version', 'description', 'orchestrator']) {
    if (!meta[k]) errors.push(`pack.yaml: campo obrigatorio ausente: ${k}`);
  }
  if (meta.id && !ID_RE.test(meta.id) && meta.id !== '_template') errors.push(`pack.yaml: id invalido "${meta.id}" (use minusculas e hifens)`);

  const agentIds = new Set();
  for (const a of agents) {
    const label = `agents/${a.file}`;
    for (const k of ['id', 'name', 'role', 'description']) {
      if (!a[k]) errors.push(`${label}: campo obrigatorio ausente: ${k}`);
    }
    if (a.id) {
      if (!ID_RE.test(a.id)) errors.push(`${label}: id invalido "${a.id}"`);
      if (a.id + '.md' !== a.file) errors.push(`${label}: id "${a.id}" deve ser igual ao nome do arquivo`);
      if (agentIds.has(a.id)) errors.push(`${label}: id duplicado "${a.id}"`);
      agentIds.add(a.id);
    }
    for (const t of a.tools || []) {
      if (!KNOWN_TOOLS.includes(t)) errors.push(`${label}: ferramenta desconhecida "${t}" (validas: ${KNOWN_TOOLS.join(', ')})`);
    }
    if (!a.body) errors.push(`${label}: corpo (instrucoes) vazio`);
  }
  if (agents.length === 0) errors.push('nenhum agente encontrado em agents/');
  if (meta.orchestrator && !agentIds.has(meta.orchestrator)) {
    errors.push(`pack.yaml: orchestrator "${meta.orchestrator}" nao existe em agents/`);
  }

  if (!workflow) {
    errors.push(`workflow nao encontrado (${meta.workflow || 'workflow.yaml'})`);
  } else {
    const steps = workflow.steps || [];
    if (steps.length === 0) errors.push('workflow: nenhum step definido');
    const stepIds = new Set();
    for (const s of steps) {
      if (!s.id) { errors.push('workflow: step sem id'); continue; }
      if (stepIds.has(s.id)) errors.push(`workflow: step duplicado "${s.id}"`);
      stepIds.add(s.id);
      if (!s.agent || !agentIds.has(s.agent)) errors.push(`workflow: step "${s.id}" usa agente inexistente "${s.agent}"`);
      if (!s.goal) errors.push(`workflow: step "${s.id}" sem goal`);
      if (!s.output) warnings.push(`workflow: step "${s.id}" sem output`);
    }
    for (const s of steps) {
      for (const d of s.depends_on || []) {
        if (!stepIds.has(d)) errors.push(`workflow: step "${s.id}" depende de step inexistente "${d}"`);
      }
    }
    if (hasCycle(steps)) errors.push('workflow: dependencias circulares entre steps');
  }

  const declared = new Set(Object.keys(meta.variables || {}));
  const texts = [meta.description || '', pack.workflowRaw || '', pack.briefing || '', ...agents.map((a) => a.body)];
  const used = new Set();
  for (const t of texts) for (const m of t.matchAll(VAR_RE)) used.add(m[1]);
  for (const v of used) if (!declared.has(v)) errors.push(`variavel {{${v}}} usada mas nao declarada em pack.yaml > variables`);
  for (const v of declared) if (!used.has(v)) warnings.push(`variavel "${v}" declarada mas nunca usada`);

  return { errors, warnings };
}

/** Resolve variaveis: defaults do pack, sobrescritas por `overrides`. */
function resolveVariables(pack, overrides = {}) {
  const vars = {};
  for (const [k, def] of Object.entries(pack.meta.variables || {})) {
    vars[k] = overrides[k] ?? (def && def.default !== undefined ? String(def.default) : undefined);
  }
  const missing = Object.entries(pack.meta.variables || {})
    .filter(([k, def]) => def && def.required && !vars[k]).map(([k]) => k);
  return { vars, missing };
}

function render(text, vars) {
  return text.replace(VAR_RE, (whole, k) => (vars[k] !== undefined ? vars[k] : whole));
}

module.exports = { loadPack, validatePack, resolveVariables, render, KNOWN_TOOLS };
