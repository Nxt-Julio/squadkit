# squadkit

**Teams of AI agents that work together, for any domain.**
([Portugues](README.md))

Describe a team once (agents as Markdown + a YAML workflow) and `squadkit` generates the files for the tool you use: **Claude Code** (subagents), **AGENTS.md** (Codex, Cursor, ...) or a **single prompt** for any AI chat.

A *pack* is a complete team. Bundled example: **`marketing-consulting`** (manager/orchestrator, market analyst, copywriter, SDR qualifier, paid-media optimizer).

```bash
npm install
node bin/squadkit.js list
node bin/squadkit.js build marketing-consulting --target claude --out ./my-client \
  --set client_name="Acme Dental" --set output_language=en
```

Adapt it to your field:

```bash
node bin/squadkit.js new customer-support   # copies _template
node bin/squadkit.js validate customer-support
```

Targets: `claude` (CLAUDE.md + .claude/agents), `agents-md` (AGENTS.md), `prompt` (squad-prompt.md). Docs (pt-BR): [docs/](docs/). License: MIT.
