'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { render } = require('./pack');

const CLAUDE_TOOLS = { read: 'Read', write: 'Write', edit: 'Edit', bash: 'Bash', web_search: 'WebSearch', web_fetch: 'WebFetch' };
const TARGETS = ['claude', 'agents-md', 'prompt'];

function write(out, rel, content) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : content + '\n');
  return rel;
}

function workflowSection(pack, vars) {
  const steps = pack.workflow.steps;
  const lines = [`## Workflow: ${pack.workflow.name || pack.meta.name}`, ''];
  if (pack.workflow.description) lines.push(render(pack.workflow.description, vars), '');
  lines.push('Execute the steps in order (respect `depends_on`). Save each result in `output/<run-id>/<output>`.', '');
  steps.forEach((s, i) => {
    lines.push(`### Step ${i + 1} - ${s.title || s.id} (\`${s.id}\`)`);
    lines.push(`- **Agent:** ${s.agent}`);
    lines.push(`- **Goal:** ${render(s.goal, vars).trim()}`);
    if (s.depends_on && s.depends_on.length) lines.push(`- **Depends on:** ${s.depends_on.join(', ')}`);
    if (s.output) lines.push(`- **Output:** \`${s.output}\``);
    if (s.checkpoint) lines.push('- **Checkpoint:** stop and ask the human to approve before continuing.');
    if (s.optional) lines.push('- **Optional:** skip if not applicable and say so in one line.');
    lines.push('');
  });
  return lines.join('\n');
}

function agentSection(a, vars, level = 2) {
  const h = '#'.repeat(level);
  return `${h} ${a.name} - ${a.role} (\`${a.id}\`)\n\n${render(a.body, vars)}`;
}

function singleFile(pack, vars) {
  const orch = pack.agents.find((a) => a.id === pack.meta.orchestrator);
  const team = pack.agents.filter((a) => a !== orch);
  return [
    `# ${pack.meta.name}`,
    '',
    render(pack.meta.description, vars),
    '',
    '> You operate as this whole team. Act as the orchestrator; when a step belongs to a specialist, adopt that role fully, follow its rules, then return to the orchestrator.',
    '',
    '# Orchestrator',
    '',
    agentSection(orch, vars, 2),
    '',
    '# Specialists',
    '',
    ...team.flatMap((a) => [agentSection(a, vars, 2), '']),
    workflowSection(pack, vars),
  ].join('\n');
}

function claudeAgentFile(a, vars) {
  const tools = (a.tools || []).map((t) => CLAUDE_TOOLS[t]).filter(Boolean);
  const fm = ['---', `name: ${a.id}`, `description: ${JSON.stringify(render(a.description, vars))}`];
  if (tools.length) fm.push(`tools: ${tools.join(', ')}`);
  if (a.model) fm.push(`model: ${a.model}`);
  fm.push('---', '');
  return fm.join('\n') + `# ${a.name} - ${a.role}\n\n${render(a.body, vars)}`;
}

function claudeMain(pack, vars) {
  const orch = pack.agents.find((a) => a.id === pack.meta.orchestrator);
  const team = pack.agents.filter((a) => a !== orch);
  return [
    `# ${pack.meta.name}`,
    '',
    render(pack.meta.description, vars),
    '',
    'You (the main session) are the orchestrator. Delegate specialist steps to the subagents in `.claude/agents/` (subagents cannot call other subagents, so all delegation goes through you). Read `briefing.md` first.',
    '',
    '| Subagent | Role |',
    '|----------|------|',
    ...team.map((a) => `| \`${a.id}\` | ${a.name} - ${a.role} |`),
    '',
    agentSection(orch, vars, 2),
    '',
    workflowSection(pack, vars),
  ].join('\n');
}

/** Gera os arquivos do pack para um alvo. Retorna lista de arquivos escritos. */
function build(pack, { target, out, vars }) {
  if (!TARGETS.includes(target)) throw new Error(`alvo invalido "${target}" (validos: ${TARGETS.join(', ')})`);
  const written = [];
  if (target === 'claude') {
    written.push(write(out, 'CLAUDE.md', claudeMain(pack, vars)));
    for (const a of pack.agents.filter((x) => x.id !== pack.meta.orchestrator)) {
      written.push(write(out, `.claude/agents/${a.id}.md`, claudeAgentFile(a, vars)));
    }
  } else {
    written.push(write(out, target === 'agents-md' ? 'AGENTS.md' : 'squad-prompt.md', singleFile(pack, vars)));
  }
  if (pack.briefing) written.push(write(out, 'briefing.md', render(pack.briefing, vars)));
  written.push(write(out, 'output/.gitkeep', ''));
  return written;
}

module.exports = { build, TARGETS };
