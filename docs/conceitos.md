# Conceitos

## Pack
Pasta com tudo o que define um time:

```
packs/<id>/
  pack.yaml              identidade, orquestrador e variaveis
  agents/<agente>.md     um arquivo por agente
  workflow.yaml          ordem do trabalho
  briefing.template.md   (opcional) formulario que o usuario preenche
```

## Agente
Frontmatter YAML + instrucoes em Markdown.

| Campo | Obrigatorio | Descricao |
|-------|:-----------:|-----------|
| `id` | sim | minusculas e hifens; igual ao nome do arquivo |
| `name` | sim | nome do "colega" |
| `role` | sim | funcao curta |
| `description` | sim | quando acionar este agente (vira a `description` do subagente no Claude Code) |
| `tools` | nao | `read`, `write`, `edit`, `bash`, `web_search`, `web_fetch` |
| `model` | nao | repassado ao alvo que suportar |

Estrutura recomendada do corpo: Missao, Processo, Formato de saida, Regras.

## Orquestrador
Um agente (`orchestrator` em `pack.yaml`) que le o briefing, executa o workflow, repassa contexto e para nos checkpoints. No alvo `claude`, ele e o `CLAUDE.md` (sessao principal), porque subagentes nao chamam outros subagentes.

## Workflow
Lista de steps:

| Campo | Descricao |
|-------|-----------|
| `id`, `title` | identificacao |
| `agent` | quem executa |
| `goal` | o que deve sair do step |
| `depends_on` | steps que precisam terminar antes (sem ciclos) |
| `output` | arquivo gerado em `output/<run-id>/` |
| `checkpoint` | `true` = parar e pedir aprovacao humana |
| `optional` | pode ser pulado se nao se aplicar |

## Variaveis
Declare em `pack.yaml`:

```yaml
variables:
  client_name: { description: Nome do cliente, required: true }
  output_language: { description: Idioma, default: pt-BR }
```

Use `{{client_name}}` em agentes, workflow e briefing. Defina no build com `--set chave=valor` ou `--config vars.yaml`.

## Alvos de build

| Alvo | Arquivos | Uso |
|------|----------|-----|
| `claude` | `CLAUDE.md`, `.claude/agents/*.md` | Claude Code |
| `agents-md` | `AGENTS.md` | Codex, Cursor e outras ferramentas que leem AGENTS.md |
| `prompt` | `squad-prompt.md` | Colar em qualquer chat de IA |
