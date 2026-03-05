# CRM Ops Desk — Design Doc
**Data:** 2026-03-05
**Status:** Draft
**Autor:** Vitoria Esteves + Claude

---

## 1. Contexto e Objetivo

A equipe de marketing (squad interna) recebe demandas de stakeholders (líderes e times das BUs) via WhatsApp, email e planilhas sem padrão definido. Isso gera:

- Tasks chegando sem contexto suficiente para execução
- Tudo marcado como "urgente", sem prioridade real
- Sem rastreabilidade de status após o envio
- Sobrecarga assimétrica entre membros da squad

**Objetivo:** Criar uma plataforma que centraliza a entrada de demandas via formulário estruturado (anamnese), prioriza automaticamente com IA, organiza a fila interna da squad, e registra tempo por membro para visibilidade operacional.

---

## 2. Escopo

### Dentro do escopo
- Formulário público de submissão de tasks (stakeholder)
- Priorização automática via Claude API
- Painel interno da squad (fila, kanban, detalhes)
- Timer de tempo por task e por membro
- Gráficos de produtividade (tempo por membro, tipo, BU)
- Acompanhamento de status pelo stakeholder
- Upload de anexos

### Fora do escopo (neste ciclo)
- Integração com Jira, Asana, Linear ou outros PMs externos
- Automações de email disparadas pelas tasks
- Gestão financeira ou billing por task
- App mobile nativo

---

## 3. Requisitos e Critérios de Sucesso

| Requisito | Critério |
|---|---|
| Formulário acessível | Stakeholder preenche sem login, em menos de 3 minutos |
| Priorização automática | Score gerado em < 5s após submit |
| Rastreabilidade | Stakeholder recebe protocolo e consegue ver status |
| Registro de tempo | Squad consegue iniciar/parar timer por task |
| Gráficos | Gestão visualiza carga por membro e por BU |

---

## 4. Restrições e Premissas

- **Plataforma:** CloudPage no SFMC (Alpine.js + Tailwind CDN), mesma stack da MKTC Platform
- **Backend:** Vercel API Routes (já existe no projeto)
- **Banco:** Supabase (Postgres + Auth + Storage)
- **IA:** Claude API (Anthropic) para priorização
- **Stakeholders:** internos à empresa (líderes e times das BUs)
- **BUs:** Finclass, Bruno Perini, Faculdade Hub, Thiago Nigro
- **Sem SSO corporativo** por ora — auth via magic link

---

## 5. Abordagens Consideradas

| Abordagem | Descrição | Descartada por |
|---|---|---|
| A — Google Sheets | SPA → Vercel → Sheets | Race conditions, sem auth, sem storage real |
| B — Supabase | SPA → Vercel → Supabase | **Escolhida** |
| C — SFMC DEs | SPA → SSJS → DEs | Teto baixo, SSJS limitado, joins difíceis |

---

## 6. Arquitetura Escolhida

```
CloudPage (Alpine.js + Tailwind CDN)
    │
    ├── /form        → Formulário público (stakeholder, sem login)
    ├── /status      → Acompanhamento de tasks do stakeholder
    └── /painel      → Visão interna da squad (protegida por magic link)
         ├── fila de tasks (prioridade automática)
         ├── kanban ou lista
         └── gráficos de tempo

    │ HTTP (fetch)
    ▼

Vercel API Routes
    ├── POST /api/tasks          → cria task + dispara priorização IA
    ├── GET  /api/tasks          → lista tasks (squad)
    ├── GET  /api/tasks/:id      → detalhe da task
    ├── PUT  /api/tasks/:id      → atualiza status/assign
    ├── POST /api/time           → inicia/para timer
    ├── GET  /api/time/report    → dados para gráficos
    └── POST /api/attachments    → upload para Supabase Storage
    │
    ├── Auth → Supabase Auth (magic link)
    ├── IA   → Claude API (score de prioridade)
    └── Storage → Supabase Storage (anexos)
    │
    ▼

Supabase (Postgres)
    ├── users
    ├── tasks
    ├── time_entries
    └── attachments
```

---

## 7. Formulário de Anamnese

Quatro seções progressivas:

**Seção 1 — Identificação**
- Nome do solicitante
- BU (dropdown: Finclass / Bruno Perini / Faculdade Hub / Thiago Nigro)
- Email (para confirmação e acompanhamento)

**Seção 2 — A demanda**
- Título (obrigatório, campo curto)
- Tipo: Email Marketing / Landing Page / Copy / Criativos / Relatório / Outro
- Descrição detalhada (textarea)
- Links relevantes (multi-input)
- Anexos (upload, máx 10MB por arquivo)

**Seção 3 — Contexto de priorização (alimenta a IA)**
- Para quando precisa? (date picker + toggle "é flexível?")
- O que acontece se atrasar? (textarea curto)
- Está vinculada a alguma campanha ativa? (sim/não + qual)
- Já foi solicitado antes? (sim/não — detecta recorrência)
- Impacto esperado (dropdown: Alta receita / Retenção / Awareness / Operacional)

**Seção 4 — Confirmação**
- Resumo do preenchimento
- Botão "Enviar demanda"
- Tela pós-submit: protocolo `MKTC-{ANO}-{0042}` + prazo estimado pela IA

---

## 8. Modelo de Dados

```sql
users
  id uuid PK
  email text UNIQUE
  name text
  role enum('squad', 'stakeholder')
  bu text
  created_at timestamptz

tasks
  id uuid PK
  protocol text UNIQUE          -- MKTC-2026-0042
  title text NOT NULL
  type text
  description text
  bu text
  links text[]
  status enum('recebida','em_analise','em_execucao','concluida','cancelada')
  priority_score int            -- 0-100, gerado pela IA
  priority_label text           -- Alta / Media / Baixa / Pendente
  priority_justification text
  ai_suggested_deadline date
  ai_suggested_profile text
  requested_deadline date
  is_deadline_flexible bool
  campaign_linked text
  impact_type text
  requested_by uuid FK users
  assigned_to uuid FK users
  created_at timestamptz
  updated_at timestamptz

attachments
  id uuid PK
  task_id uuid FK tasks
  filename text
  storage_path text
  uploaded_by uuid FK users
  created_at timestamptz

time_entries
  id uuid PK
  task_id uuid FK tasks
  user_id uuid FK users
  started_at timestamptz
  ended_at timestamptz
  duration_minutes int
  note text
  created_at timestamptz
```

**RLS (Row Level Security):**
- `tasks`: stakeholder lê só as próprias; squad lê tudo
- `time_entries`: cada membro edita só as próprias; squad lê tudo
- `attachments`: segue permissão da task pai

---

## 9. Auth e Segurança

- Formulário público — sem login, qualquer pessoa com o link submete
- Painel interno e status page — magic link por email (Supabase Auth)
- Anexos em bucket **privado** — acesso via URL assinada (expira em 1h)
- Tipos de arquivo permitidos: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`
- `SUPABASE_SERVICE_ROLE_KEY` e `ANTHROPIC_API_KEY` apenas no backend (Vercel env vars)
- Nunca expor service role key na CloudPage

---

## 10. Priorização pela IA

**Prompt enviado para Claude:**
```
Você é um assistente de priorização de tasks de marketing.
Analise a demanda abaixo e retorne um JSON com:
- priority_score (0-100)
- priority_label (Alta / Media / Baixa)
- justification (1-2 frases)
- suggested_deadline (YYYY-MM-DD)
- suggested_assignee_profile (ex: email-specialist, copywriter)

Demanda:
{title, type, description, requested_deadline, is_deadline_flexible,
 consequences_of_delay, campaign_linked, is_recurrent, impact_type}
```

**Fallback (se Claude falhar):**
```
prazo < 2 dias     → score 85, label "Alta"
prazo < 7 dias     → score 60, label "Media"
prazo >= 7 dias    → score 30, label "Baixa"
sem prazo          → score 20, label "Baixa"
```

Task salva com `priority_label = "Pendente"` se IA falhar; Vercel Cron retenta a cada 5 min.

---

## 11. Painel Interno

**Visão Fila:**
- Lista ordenada por `priority_score DESC`
- Filtros: BU / Tipo / Responsável / Status
- Clique → drawer lateral com detalhes completos
- Ações: "Assumir", "Iniciar timer", "Concluir", "Cancelar"

**Timer:**
- Start/stop por task
- Cronômetro visível no topo da tela (persiste durante navegação)
- Ao parar: modal pede nota rápida
- Se aba fechada com timer ativo: ao reabrir, pergunta "Ainda estava trabalhando?"

**Visão Gráficos:**
- Tempo por membro (barras horizontais)
- Tempo por tipo de task (pizza)
- Volume de demandas por BU (barras empilhadas)
- Filtros: semana / mês / período custom

---

## 12. Resiliência e Erros

| Cenário | Mitigação |
|---|---|
| Falha de rede no submit | Estado de loading + retry manual + mensagem amigável |
| Claude API timeout | Salva com score pendente + Cron retenta |
| Anexo > 10MB | Validação no front antes do upload |
| Timer com aba fechada | `started_at` persiste; modal de reconciliação ao reabrir |
| Supabase fora do ar | Banner de indisponibilidade + fallback de contato por email |
| Resposta malformada da IA | Validação JSON no backend + fallback por regras |

**Correlation ID:** cada submit gera UUID logado em todas as etapas.

---

## 13. Plano de Entrega

### M1 — Formulário funcional
- CloudPage com form de anamnese (4 seções)
- Vercel API salvando no Supabase
- Email de confirmação com protocolo
- Score por regras simples (sem IA ainda)
- **Entregável:** link público que stakeholders já podem usar

### M2 — Painel interno
- Auth com magic link
- Fila priorizada (com IA)
- Drawer de detalhes
- Timer básico (start/stop + nota)
- **Entregável:** squad opera sem planilha

### M3 — Gráficos e visibilidade
- Gráficos de tempo por membro / tipo / BU
- Status page para stakeholder
- Filtros avançados
- **Entregável:** gestão visualiza carga e produtividade

---

## 14. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Stakeholders não abandonam WhatsApp | Alta | Alto | Formulário rápido (<3min) + confirmação imediata com protocolo |
| Claude API lenta ou cara | Média | Médio | Fallback por regras + cache de scores similares |
| Supabase custo crescente | Baixa | Baixo | Plano free aguenta bem o volume inicial |
| Scope creep (pedir integrações) | Alta | Médio | Backlog público, MoSCoW explícito por milestone |

---

## 15. Decision Log

| Decisão | Data | Motivo | Alternativas rejeitadas |
|---|---|---|---|
| CloudPage como front | 2026-03-05 | Zero infra nova, URL pública, padrão MKTC | Next.js separado (mais infra), app mobile (esforço alto) |
| Supabase como banco | 2026-03-05 | Postgres real + Auth + Storage em um lugar | Sheets (sem auth/storage), SFMC DEs (teto baixo) |
| Magic link como auth | 2026-03-05 | Sem fricção de senha, suficiente para o volume | SSO corporativo (over-engineering neste momento) |
| Claude para priorização | 2026-03-05 | Já usado no projeto, contexto rico do formulário | Regras fixas apenas (menos adaptável) |
| Formulário sem login | 2026-03-05 | Reduz barreira de adoção, substitui WhatsApp | Login obrigatório (aumenta fricção, reduz adesão) |

---

## Decisões Fechadas (2026-03-05)

- **Volume:** ~150 tasks/semana — Supabase free tier aguenta (500MB storage, 50k rows/mes)
- **Edicao pos-submit:** sim — stakeholder pode editar campos enquanto status for "recebida"
- **Notificacoes:** sim — email para a squad quando task com `priority_label = "Alta"` chegar
- **Kanban:** sim — painel interno tem toggle Lista / Kanban (colunas = status)
- **Nome:** CRM Ops Desk
