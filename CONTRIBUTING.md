# Contribuindo

1. Crie o pack: `node bin/squadkit.js new <id>` e preencha `pack.yaml`, `agents/`, `workflow.yaml` e `briefing.template.md`.
2. Rode `npm run validate` e `npm test` (o CI faz o mesmo).
3. Abra um PR com o pack em `packs/<id>/`.

Checklist de qualidade de um pack:

- Um orquestrador e 2-7 especialistas, cada um com missao, processo, formato de saida e regras.
- Nenhum dado de cliente real, chave de API ou segredo.
- Tudo que muda de cliente para cliente e variavel (`{{...}}`), nao texto fixo.
- Agentes sem sobreposicao: cada entrega tem um unico dono.
- Pelo menos um checkpoint humano antes da entrega final.
- Nada que prometa resultado garantido ou contorne politicas legais/de plataformas.
