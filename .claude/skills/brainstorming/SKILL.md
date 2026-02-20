---
name: brainstorming
version: "2.1"
language: "pt-BR"
description: >
  Skill para transformar ideias soltas em designs executáveis usando questionamento socrático estruturado,
  exploração de alternativas e validação incremental. Não fixa stack/ferramentas: explora opções e só
  decide tecnologia depois que objetivo, restrições e critérios de sucesso estiverem claros.
  Otimizada para cenários de CRM/MarTech/Data/Automação/IA, mas aplicável a qualquer domínio.
tags:
  - design
  - arquitetura
  - produto
  - dados
  - automacao
  - integracoes
  - ia
  - estrategia
inputs:
  - ideia_bruta: string
  - contexto (opcional): objetivos, prints, links, stakeholders, prazos, restrições, sistemas existentes
outputs:
  - design_validado: arquitetura + fluxo + contratos + riscos + testes + observabilidade
  - doc_design: arquivo em docs/plans/AAAA-MM-DD-topico-design.md
  - plano_implementacao (opcional): tarefas por etapa com critérios de aceite
principios:
  - "Primeiro problema, depois solução; primeiro decisão, depois ferramenta."
  - "Uma pergunta por vez na fase de entendimento."
  - "Sempre explorar 2–3 abordagens distintas antes de escolher."
  - "Validar em blocos curtos (200–300 palavras) e iterar."
  - "YAGNI: cortar tudo que não muda o resultado."
  - "Segurança e governança por padrão (PII, segredos, permissões, auditoria)."
  - "Debugabilidade > 'arquitetura bonita'."
  - "Decisões registradas (Decision Log) para evitar rework."
---

# Brainstorming Ideias em Designs (v2.1 — sem stack fixa)

## Announce no começo (obrigatório)
> **"Estou usando a skill de brainstorming para refinar sua ideia em um design."**

---

## Checklist de Progresso

```txt
Brainstorming Progress:
- [ ] Fase 0: Preparação (estado atual, contexto, fronteiras)
- [ ] Fase 1: Entendimento (propósito, restrições, sucesso)
- [ ] Fase 2: Exploração (2–3 abordagens + opções de ferramentas)
- [ ] Fase 3: Design (apresentação incremental + validação)
- [ ] Fase 4: Documentação (design em docs/plans/)
- [ ] Fase 5: Setup de Worktree (se implementar)
- [ ] Fase 6: Handoff de Planejamento (tarefas e milestones)
- [ ] Fase 7: Operação (runbook, observabilidade, rollback) — se aplicável
```

---

## Fase 0: Preparação (ancorar a conversa)

### Objetivo
Garantir clareza do “por quê”, do “pra quem” e do “o que já existe”.

### Ações
- Se houver repo/workspace: checar estado (README, docs, issues, env vars, padrões).
- Definir o **tipo de desafio** (não a solução):
  - produto/negócio (meta, impacto, priorização)
  - engenharia (integração, dados, front, infra)
  - operação (SLA, incidentes, compliance)
- Declarar fronteiras:
  - **escopo** (o que entra)
  - **fora de escopo** (o que NÃO entra agora)
  - **assunções** (o que estamos assumindo até prova em contrário)

### Saída mínima
- Uma frase de objetivo do problema (não solução).
- Uma frase de “o que não faremos neste ciclo”.

---

## Fase 1: Entendimento (perguntas — 1 por vez)

### Regra de ouro
**Perguntar UMA coisa por mensagem.**  
Use **AskUserQuestion** quando houver 2–4 opções claras.

### O que coletar (não precisa tudo de cara)
1) **Propósito**: qual decisão/resultado muda se isso existir?  
2) **Atores**: quem usa, quem mantém, quem aprova, quem é impactado?  
3) **Critérios de sucesso**: métrica + baseline + alvo + prazo.  
4) **Restrições**: prazo, budget, time, compliance, risco, legado, skill do time.  
5) **Contexto técnico (se existir)**: sistemas atuais, dados, integrações, limites.  
6) **Não-funcionais**: volume, latência, disponibilidade, custo, privacidade.  
7) **Definição de pronto (DoD)**: o que precisa acontecer para dizer “entregue”.

### Perguntas “padrão ouro” (use 1 por vez)
- “Qual é a decisão de negócio que isso vai permitir tomar ou melhorar?”
- “Se a gente só pudesse entregar UMA coisa na primeira versão, qual seria?”
- “Qual métrica você quer mover e qual é o número atual?”
- “Qual restrição manda mais: prazo, custo, risco ou qualidade?”
- “Qual o volume esperado e qual tolerância de atraso/latência?”
- “Que dados são sensíveis (PII) e quais regras de armazenamento/uso existem?”

### Exemplo com AskUserQuestion
```txt
Question: "Qual é o foco principal dessa iniciativa agora?"
Options:
  - "Aumentar receita/conversão" (impacto direto em funil)
  - "Reduzir custo/tempo operacional" (automação e eficiência)
  - "Melhorar qualidade/consistência de dados" (governança e confiança)
  - "Reduzir risco/compliance" (LGPD, auditoria, segurança)
```

---

## Fase 2: Exploração (abordagens + ferramenta como decisão, não premissa)

### Objetivo
Explorar caminhos que sejam **realmente diferentes**, incluindo opções de ferramentas/stack, sem “travar” em uma só.

### Regra
Sempre apresentar:
- **2–3 abordagens arquiteturais** (macro)
- **opções de implementação** (stack), com trade-offs
- e uma recomendação “default” baseada nas restrições

### Formato obrigatório por abordagem
- **Arquitetura em 1 frase**
- **Fluxo de alto nível** (fonte → transformação → destino)
- **Pontos fortes / fracos**
- **Complexidade** (Baixa/Média/Alta)
- **Riscos (top 3)**
- **Quando escolher**
- **Opções de stack** (exemplos) + critérios para decidir

### Biblioteca de abordagens (agnóstica a ferramentas)

#### A) Integração / Automação
1. **Síncrono direto (request/response)**
   - + rápido para MVP, simples de debugar
   - – frágil a rate limit/falhas em cascata
2. **Assíncrono orientado a eventos (fila + workers)**
   - + resiliente e escalável
   - – exige observabilidade e mais componentes
3. **Batch/ELT (janela programada)**
   - + ótimo para volume alto e custo controlado
   - – latência maior, cuidado com “dados velhos”

#### B) Produto interno / UI
1. **UI fina + backend forte**
2. **UI rica + APIs simples**
3. **Embed/BI + interações mínimas**

#### C) IA / Agentes
1. **RAG simples + ferramentas read-only**
2. **RAG + ações com aprovação humana**
3. **Planner/executor multi-etapas (replay + auditoria)**

### Decidindo ferramentas sem travar
Em vez de “vamos usar X”, usar:
- “Para essa abordagem, as ferramentas possíveis são X/Y/Z.”
- “Escolhemos com base em: time-to-value, custo, segurança, operação, skill do time.”

### Exemplo de escolha (AskUserQuestion)
```txt
Question: "Qual princípio deve guiar a escolha de ferramentas nesta fase?"
Options:
  - "Velocidade de MVP" (entregar rápido e aprender)
  - "Robustez operacional" (SLA, resiliência, observabilidade)
  - "Custo mínimo" (infra simples, batch quando possível)
  - "Governança e compliance" (PII, auditoria, controles)
```

---

## Fase 3: Design (apresentação incremental em blocos)

### Objetivo
Transformar a abordagem escolhida em design executável e validado.

### Regra
Apresente **um bloco por vez** (200–300 palavras) e pergunte:
> “Isso faz sentido até aqui? O que você mudaria?”

### Ordem recomendada
1) **Arquitetura e componentes**  
2) **Fluxo de dados e contratos** (schemas, idempotência, dedupe)  
3) **Modelo de dados** (entidades, chaves, retenção)  
4) **Segurança e governança** (PII, segredos, permissões, auditoria)  
5) **Resiliência e erros** (retry, DLQ, fallback, circuit breaker)  
6) **Observabilidade e operação** (logs, métricas, alertas, runbook)  
7) **Testes e validação** (unit, integração, contrato, carga, UAT)  
8) **Plano de entrega** (milestones, riscos, critérios de aceite)

---

## Fase 3.1: Contratos e padrões (para evitar dor depois)

### Padrões recomendados (genéricos)
- **Correlation ID** em tudo (logs, eventos, requests).
- **Idempotência** por chave canônica:
  - `idempotency_key = hash(campo_unico + tipo_evento + origem)`
- **Dedupe** explícito (principalmente com email/telefone):
  - normalizar: lower/trim, remover máscara, validar DDI
- **Versionamento de schema**:
  - `schema_version` e compatibilidade retroativa quando possível

### Template de payload
```json
{
  "meta": {
    "schema_version": "1.0",
    "source": "system_name",
    "correlation_id": "uuid",
    "timestamp": "ISO-8601"
  },
  "data": {
    "event_type": "created|updated|converted",
    "entity": "lead|contact|order",
    "fields": { "..." : "..." }
  }
}
```

---

## Fase 4: Documentação (Design Doc permanente)

### Objetivo
Congelar decisões e reduzir “dependência de memória”.

### Arquivo obrigatório
`docs/plans/YYYY-MM-DD-<topico>-design.md`

### Estrutura sugerida do Design Doc
1. Contexto e objetivo
2. Escopo / fora de escopo
3. Requisitos e critérios de sucesso
4. Restrições e premissas
5. Abordagens consideradas (trade-offs)
6. Arquitetura escolhida (diagrama textual)
7. Fluxo de dados e contratos (schemas/payloads)
8. Modelo de dados e chaves
9. Segurança, privacidade e compliance
10. Resiliência e tratamento de erros
11. Observabilidade e operação
12. Testes e validação
13. Plano de rollout (feature flags, migração, rollback)
14. Riscos e mitigação
15. Decision Log + perguntas abertas

### Decision Log (padrão)
- Decisão
- Data
- Motivo
- Alternativas rejeitadas
- Consequências

---

## Fase 5: Worktree Setup (se implementar)
> “Estou usando a skill de using-git-worktrees para configurar um workspace isolado.”

- Criar worktree
- Validar build/test local
- Garantir que doc foi commitado antes de codar

---

## Fase 6: Planning Handoff (plano detalhado)

Perguntar:
> “Pronto para criar o plano de implementação?”

Quando sim, entregar:
- milestones
- tarefas (S/M/L)
- dependências
- critérios de aceite por etapa
- checklist de deploy

---

## Fase 7: Operação (quando vai para produção)

### Runbook mínimo
- Como verificar saúde (dash/logs/queries)
- Como reprocessar eventos (sem duplicar)
- Como pausar automações/campanhas/integrações
- Como fazer rollback
- Como lidar com dados corrompidos/duplicados

### Observabilidade mínima (padrão)
- logs estruturados com `correlation_id`
- métricas:
  - sucesso (%), falhas (%), latência p95
  - retries, backlog, DLQ
  - volume por segmento/origem
- alertas:
  - falha acima de X% em Y min
  - backlog crescendo continuamente
  - rate limit/429 recorrente

---

# Módulos opcionais (recomendação, não obrigação)

> Use estes módulos quando o tema encaixar. Eles sugerem perguntas e armadilhas, mas **não travam a stack**.

## Módulo A — CRM (ex.: Salesforce ou equivalente)
### Perguntas críticas
- “Qual é a fonte da verdade por entidade (Lead/Contact/Account/Custom)?”
- “Qual é a chave externa e estratégia de dedupe?”
- “Quais permissões e trilhas de auditoria são necessárias?”
- “Quais limites (API, transações, concorrência) importam?”

### Armadilhas comuns
- duplicidade por falta de ExternalId
- FLS/perfil ignorado
- atualizações proibidas em campos sensíveis
- falta de idempotência em upserts

## Módulo B — Marketing / Mensageria (ex.: Marketing Cloud, ESPs, WhatsApp, etc.)
### Perguntas críticas
- “Qual é o gatilho (evento, batch, ação do usuário)?”
- “Opt-in/compliance: como provar consentimento?”
- “Quais mensagens são automáticas vs humanas?”
- “Como registrar histórico (timeline) no CRM?”

### Armadilhas comuns
- segredos expostos no front
- templates bloqueados por políticas de canal
- links sem tracking/assinatura
- inconsistência de parâmetros (utm, ids)

## Módulo C — Orquestração/ETL (ex.: n8n, Airflow, scripts, etc.)
### Perguntas críticas
- “Como reprocessar com segurança?”
- “Onde ficam retries e DLQ?”
- “Qual é o volume e concorrência?”
- “Como notificar falhas e medir sucesso?”

### Padrões úteis
- inbox table para eventos
- locks/dedupe por hash
- subfluxos por domínio (contatos, campanhas, vendas)

## Módulo D — Data Warehouse/Analytics (ex.: BigQuery, Snowflake, etc.)
### Perguntas críticas
- “Particionamento/clustering: qual chave e por quê?”
- “Qual janela temporal?”
- “Near real-time é necessário ou daily basta?”
- “Como garantir qualidade (tests) e lineage?”

## Módulo E — Backend/Serverless (ex.: Supabase, functions, containers)
### Perguntas críticas
- “Quem acessa o quê (RLS, auth, tokens)?”
- “Segredos: onde ficam e como rotacionar?”
- “Precisa de fila/jobs?”
- “Quais SLAs e estratégia de rollback?”

## Módulo F — BI/Embeds (ex.: Metabase/Looker/etc.)
### Perguntas críticas
- “Permissões por usuário e filtros?”
- “Caching e latência aceitável?”
- “SSO e auditoria?”

---

# Anti-padrões (evitar ativamente)
- Ir para código antes de definir sucesso, chaves e contratos.
- “Arquitetura astronauta” no MVP.
- Guardar token/segredo no front.
- Ignorar dedupe/idempotência.
- Não planejar rollback/reprocessamento.
- Decisões não registradas → discussão infinita.

---

# Mini-frameworks para destravar decisão

## MoSCoW (escopo)
- Must / Should / Could / Won’t (neste ciclo)

## RICE (prioridade)
- Reach, Impact, Confidence, Effort

## MVP de 1 semana (pergunta-guia)
- “Qual o menor fluxo que prova valor com dados reais e risco controlado?”

---

# Definition of Done (DoD) do brainstorm
- Objetivo e sucesso mensurável definidos
- Restrições e riscos principais mapeados
- 2–3 abordagens distintas comparadas
- Ferramentas/stack escolhidas **depois** (com critérios claros)
- Design validado em blocos (segurança, erro, observabilidade, testes)
- Design doc criado em `docs/plans/`
- (Opcional) Plano de implementação com milestones e critérios de aceite

---