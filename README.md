# squadkit

**Times de agentes de IA que trabalham em conjunto, para qualquer area.**
([English](README.en.md))

Voce descreve o time uma vez (agentes em Markdown + um workflow em YAML) e o `squadkit` gera os arquivos prontos para a ferramenta que voce usa: **Claude Code** (subagentes), **AGENTS.md** (Codex, Cursor, etc.) ou um **prompt unico** para qualquer chat de IA.

Um *pack* e um time completo. Exemplo incluso: **`marketing-consulting`**, com 5 agentes:

| Agente | Papel |
|--------|-------|
| `marketing-manager` | Orquestrador: estrategia, ordem do trabalho, consistencia, checkpoints |
| `market-analyst` | Inteligencia de mercado: publico, concorrentes, oportunidades |
| `copywriter` | Copy e conversao: anuncios, paginas, nutricao, testes A/B |
| `sdr-qualifier` | Qualificacao e atendimento: scoring, triagem, objecoes, handoff |
| `media-optimizer` | Midia paga: estrutura, orcamento, tracking, otimizacao |

## Comecando

```bash
npm install
node bin/squadkit.js list
node bin/squadkit.js build marketing-consulting --target claude --out ./meu-cliente \
  --set client_name="Clinica Sorriso" --set business_type="clinica odontologica" \
  --set monthly_budget="R$ 5.000"
cd meu-cliente   # abra no Claude Code e peca: "execute o workflow"
```

O comando gera `CLAUDE.md` (orquestrador + workflow), `.claude/agents/*.md` (especialistas), `briefing.md` (para preencher) e `output/` (entregas de cada execucao).

Outros alvos: `--target agents-md` (gera `AGENTS.md`) e `--target prompt` (gera `squad-prompt.md`, para colar em qualquer chat).

## Adaptar para a sua area

```bash
node bin/squadkit.js new suporte-ao-cliente        # copia o _template
# edite packs/suporte-ao-cliente/{pack.yaml, agents/, workflow.yaml}
node bin/squadkit.js validate suporte-ao-cliente
node bin/squadkit.js build suporte-ao-cliente --set client_name=Acme
```

Guia completo em [docs/criando-um-pack.md](docs/criando-um-pack.md). Conceitos em [docs/conceitos.md](docs/conceitos.md).

## Como funciona

- **Agente** = arquivo `agents/<id>.md` com frontmatter (`id`, `name`, `role`, `description`, `tools`) e instrucoes.
- **Workflow** = `workflow.yaml` com steps (`agent`, `goal`, `depends_on`, `output`, `checkpoint`).
- **Variaveis** = `{{chave}}` declaradas em `pack.yaml`; trocam o pack de cliente/segmento/idioma sem editar prompts.
- **Orquestrador** = um agente do pack que conduz o workflow e para nos checkpoints para aprovacao humana.
- `squadkit validate` checa ids, agentes referenciados, ciclos no workflow e variaveis nao declaradas.

## Contribuir

Packs novos sao muito bem-vindos (vendas, suporte, juridico, produto, conteudo, financas, pesquisa...). Veja [CONTRIBUTING.md](CONTRIBUTING.md). Licenca MIT.
