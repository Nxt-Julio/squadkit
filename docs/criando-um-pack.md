# Criando um pack para a sua area

1. **Comece pelo resultado.** Qual entrega final o time produz? (ex.: plano de acao, relatorio, proposta, resposta ao cliente.)
2. **Divida em papeis sem sobreposicao.** Um orquestrador + 2 a 7 especialistas. Se dois agentes entregam a mesma coisa, una-os.
3. **Crie o pack:** `node bin/squadkit.js new meu-pack`.
4. **Escreva cada agente** em `agents/<id>.md`: missao, processo, formato de saida, regras. Seja especifico sobre o que *nao* fazer.
5. **Monte o workflow:** pesquisa/entendimento primeiro, producao depois, consolidacao por ultimo. Coloque `checkpoint: true` onde um erro seria caro (escopo, estrategia, entrega final).
6. **Parametrize:** tudo que varia por cliente vira `{{variavel}}` (nome, segmento, idioma, tom, verba, ferramentas).
7. **Valide e teste:** `node bin/squadkit.js validate meu-pack`, depois rode o build e execute o workflow numa ferramenta real com um caso verdadeiro. Ajuste os prompts onde a saida decepcionar.

## Exemplos de packs que cabem no formato

| Area | Agentes sugeridos |
|------|-------------------|
| Vendas B2B | Prospeccao, Pesquisa de conta, Redator de outbound, Qualificacao, Gerente |
| Suporte | Triagem, Base de conhecimento, Resposta, Escalonamento, Gerente de qualidade |
| Conteudo | Pesquisa de pauta, Roteirista, Editor, SEO, Calendario/Gerente |
| Juridico (apoio) | Intake, Pesquisa, Minuta, Revisor de risco, Coordenador |
| Desenvolvimento | Analista, Backend, Frontend, Revisor, QA, Release |
| Financas pessoais/PME | Coleta de dados, Analista, Planejador, Auditor, Orquestrador |

## Dicas

- Prompts curtos e objetivos rendem mais que prompts longos e vagos.
- Cada agente deve terminar com "Premissas" e "Pendencias": isso mostra onde o humano precisa decidir.
- Nao ponha segredos, dados pessoais de clientes ou chaves de API no pack.
- Para uso em varias ferramentas, evite instrucoes que dependam de uma so delas; o `squadkit` traduz `tools` para cada alvo.
