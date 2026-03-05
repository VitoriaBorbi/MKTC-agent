# MKTC Platform — UI Design Doc
**Data:** 2026-03-02
**Status:** Draft aprovado — pronto para implementação
**Autor:** Brainstorming session (Claude Code)

---

## 1. Contexto e Objetivo

O time de marketing opera hoje via Google Sheets + Claude Code CLI para gerar emails HTML, subir no SFMC e agendar envios. Esse fluxo exige conhecimento técnico e cria fricção para stakeholders não-técnicos.

**Objetivo:** Substituir a interface de Google Sheets + CLI por uma web app interna, bonita e intuitiva, que encapsula todas as skills (`/email`, `/campaign`, `/catalog`, `/queue`, `/send`, `/layout`) em um produto usável por qualquer membro do time de marketing.

---

## 2. Escopo

### Entra no MVP
- Dashboard por BU (KPIs + fila viva)
- Wizard de criação de email (5 steps: tipo → copy → refs → template → geração)
- Wizard de criação de layout (referência → 4 variações → catálogo)
- Tela de edição/aprovação com editor visual + HTML bruto (Monaco)
- Tela de agendamento de envio (sender, DEs, data/hora BRT)
- Catálogo de templates (galeria de previews)
- Fila Kanban (status workflow visual)
- Histórico de envios
- Biblioteca de prompts salvos
- Streaming de progresso em tempo real (SSE)

### Fora de escopo (v1)
- Autenticação / autorização por BU
- Multi-tenant
- Notificações push/email externas
- Admin cross-BU
- Analytics avançados de performance de envios

---

## 3. Usuários e Contexto de Uso

- **Quem:** Equipes de marketing das BUs (Finclass, Bruno Perini, Faculdade Hub, Thiago Nigro, Portfel, Grão)
- **Quantos:** ~2–10 por BU, ~10–30 total
- **Acesso:** URL interna, sem login (MVP). Qualquer membro do time acessa tudo.
- **Dispositivo:** Desktop (Chrome/Edge) — não precisa ser responsivo no MVP

---

## 4. Critérios de Sucesso

| Métrica | Baseline atual | Alvo |
|---|---|---|
| Tempo para gerar + agendar 1 email | ~30 min (CLI + Sheets) | < 10 min (UI) |
| Erros de configuração de envio | Frequente (campo errado no Sheets) | Zero (UI valida) |
| Dependência de dev/técnico | Sempre necessário | Zero para fluxo padrão |
| Emails na fila visíveis por todos | Parcial (Sheets) | 100% em tempo real |

---

## 5. Restrições e Premissas

- **Premissa:** Backend chama Claude API (Anthropic) para geração de HTML — a lógica das skills é portada para TypeScript
- **Premissa:** SFMC, Google Drive, Google Sheets continuam como sistemas de backend (não substituídos)
- **Restrição:** MVP em velocidade máxima — sem over-engineering
- **Restrição:** Windows no dev local, Vercel/Supabase em produção

---

## 6. Arquitetura Escolhida

### Stack
```
Frontend:  Next.js 15 (App Router) + shadcn/ui + Tailwind CSS
Backend:   Next.js API Routes (serverless functions)
Database:  Supabase (PostgreSQL) — queue, prompts, metadata
Auth:      Nenhuma no MVP
Storage:   Supabase Storage (uploads temporários de .docx/imagens)
Streaming: Server-Sent Events (SSE) para progresso em tempo real
IA:        Anthropic SDK (claude-sonnet-4-6)
Design:    Figma como fonte de verdade → shadcn/ui → código
Hosting:   Vercel (frontend + API routes)
```

### Diagrama de fluxo
```
[Browser]
    ↓ HTTP + SSE
[Next.js — App Router]
    ↓ API Routes
    ├── [Anthropic Claude API] ← geração de HTML/layouts
    ├── [SFMC REST API]        ← upload assets + imagens
    ├── [SFMC SOAP API]        ← agendamento de envios
    ├── [Google Drive API]     ← download de .docx
    ├── [Google Sheets API]    ← sync de fila (opcional no MVP)
    └── [Supabase]             ← queue local + prompts + metadata
```

---

## 7. Mapa de Telas (Information Architecture)

```
/ (root)
└── /[bu]/
    ├── dashboard          ← Home por BU
    ├── nova-solicitacao   ← Wizard email (5 steps)
    ├── novo-layout        ← Wizard layout (4 variações)
    ├── fila               ← Kanban/lista de emails
    │   └── /[id]          ← Detalhe: edit + approve + schedule
    ├── campanhas          ← Grupos de N emails
    │   └── /[id]          ← Detalhe da campanha
    ├── catalogo           ← Galeria de templates
    ├── historico          ← Emails enviados
    └── config/
        ├── prompts        ← Biblioteca de prompts
        ├── marca          ← Brand settings
        └── des            ← DEs configuradas
```

---

## 8. Design das Telas Principais

### 8.1 Dashboard `/[bu]/dashboard`

**Componentes:**
- Topbar: logo, seletor de BU (dropdown), botões "Novo Email" / "Novo Layout"
- KPI cards (5): Rascunho | Aguardando Aprovação | Aprovado | Agendado | Enviado
  - Cards são clicáveis e filtram a fila abaixo
- Fila ativa: lista compacta (nome, status pill, data de envio)
- Timeline horizontal: próximos 7 dias com envios agendados

**Status workflow (com cores):**
```
rascunho       → cinza
pendente       → amarelo
aguardando_ap  → laranja
aprovado       → verde claro
agendado       → azul
enviado        → verde escuro
```

---

### 8.2 Wizard de Criação de Email `/[bu]/nova-solicitacao`

**Step 1 — Tipo**
- Radio: Avulso / Campanha
- Se Campanha: nome + ID da campanha

**Step 2 — Copy**
- Upload de .docx (drag & drop)
- OU textarea para colar texto diretamente
- Campo: Assunto do email
- Campo: Pré-cabeçalho (opcional)

**Step 3 — Referências**
- Upload de imagens (múltiplas)
- OU link do Google Drive (pasta ou arquivo)
- Lista de imagens carregadas com preview thumbnail

**Step 4 — Template**
- Grid de cards com preview PNG do catálogo
- Filtro por BU (pré-filtrado na BU atual)
- Botão "Usar este template" em cada card
- Link "Criar novo layout" → redireciona para `/novo-layout`

**Step 5 — Geração (streaming)**
- Painel esquerdo: log de progresso em tempo real
  ```
  ✓ .docx carregado
  ✓ Imagens extraídas (3 found)
  ✓ Upload imagens para SFMC CDN
  ⟳ Gerando HTML com Claude...
  ```
- Painel direito: iframe mostrando o HTML sendo construído (atualiza a cada chunk)
- Ao finalizar: botão "Revisar e Editar" aparece

---

### 8.3 Tela de Detalhe / Edição `/[bu]/fila/[id]`

**Layout:** Split view (editor esquerda + preview direita)

**Editor (esquerda):**
- Aba "Visual": campos editáveis por seção (Hero, Corpo, CTA)
  - Cada seção: texto editável, imagem substituível, cor do botão
- Aba "HTML": Monaco Editor com syntax highlight para HTML
  - Botão "Formatar" (prettier)
  - Botão "Copiar HTML"

**Preview (direita):**
- iframe do HTML renderizado
- Switcher: Desktop (600px) / Mobile (375px)
- Botão "Abrir no navegador"

**Barra inferior:**
- Status atual (pill)
- Campo de comentário
- Botão "Salvar rascunho" | "Solicitar revisão" | "Aprovar ✓"

---

### 8.4 Modal de Agendamento

**Triggered:** Ao clicar "Aprovar" — abre modal/drawer lateral

**Campos:**
- Send Classification (dropdown, ex: "Equipe Finclass")
- Data de envio (date picker com BRT explícito)
- Horário (time picker HH:MM)
- DEs de Envio: chips com autocomplete (fonte: Config tab do Sheets)
- DEs de Exclusão: chips com autocomplete
- Preview: estimativa de contatos (se disponível)

**Ao confirmar:**
1. Cria asset no SFMC Content Builder (REST)
2. Cria Email no Email Studio (SOAP)
3. Cria EmailSendDefinition (SOAP)
4. Agenda com StartDateTime em UTC
5. Atualiza status → "agendado"

---

### 8.5 Novo Layout `/[bu]/novo-layout`

**Step 1 — Referência**
- Upload drag & drop de imagem (PNG/JPG)
- OU link do Drive (pasta Refs da BU)
- Campo: nome da campanha

**Step 2 — Geração (streaming)**
- 4 barras de progresso simultâneas (uma por variação)
- Cada barra mostra: "Analisando → Gerando → Renderizando"

**Step 3 — Galeria comparativa**
- Grid 2×2 com os 4 previews em PNG
- Clique para abrir modal fullscreen
- Badge por variação: "Estrutura", "Hierarquia", "CTA em destaque", "Espaçamento limpo"
- Botão "Selecionar" em cada card

**Step 4 — Publicar**
- Preview da variação selecionada
- Campos: nome do template, tags
- Botão "Publicar no catálogo" → sobe PNG no SFMC + cria card no Notion + registra no Sheets

---

### 8.6 Catálogo `/[bu]/catalogo`

- Grid responsivo de cards (thumbnail + nome + tags)
- Filtros: BU, tipo de layout, tags
- Cada card: hover mostra botão "Usar este template"
- Clique → abre detail com info completa + link Notion

---

### 8.7 Biblioteca de Prompts `/[bu]/config/prompts`

- Lista de prompts salvos (nome, data, preview truncado)
- Cada prompt: criado a partir de uma geração anterior
- Botão "Usar como base" → pré-preenche step 2 do wizard
- Edição inline do prompt

---

## 9. Componentes Compartilhados (Design System)

Todos baseados em shadcn/ui + Tailwind. Customizar com as cores das BUs via CSS variables:

```css
/* Finclass */
--color-primary: #00e7f9;
--color-bg: #0a0e27;

/* Bruno Perini */
--color-primary: #b2ec05;
--color-bg: #0f1014;
```

**Componentes-chave a criar:**
- `<BUSelector>` — dropdown com logo de cada BU
- `<StatusPill>` — chip colorido por status
- `<StreamingLog>` — painel de progresso em tempo real
- `<EmailPreview>` — iframe responsivo com switcher desktop/mobile
- `<DEAutocomplete>` — busca fuzzy nas DEs da BU
- `<TemplateGrid>` — galeria de templates com preview
- `<LayoutGallery>` — grid 2×2 para variações de layout

---

## 10. Streaming de Progresso (SSE)

```typescript
// API route: /api/[bu]/generate
export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({msg})}\n\n`))

      send("Extraindo texto do .docx...")
      // ... lógica de extração

      send("Fazendo upload das imagens...")
      // ... upload para SFMC

      send("Gerando HTML com Claude...")
      // ... chamada para Anthropic API com streaming

      // chunk por chunk do Claude vai para o frontend
      for await (const chunk of claudeStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({html: chunk})}\n\n`))
      }

      controller.close()
    }
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

---

## 11. Modelo de Dados (Supabase)

```sql
-- Fila de emails
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,  -- 'finclass' | 'bruno-perini' | etc
  tipo TEXT NOT NULL,  -- 'avulso' | 'campanha'
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  assunto TEXT,
  preheader TEXT,
  html_content TEXT,
  sfmc_asset_id TEXT,
  sfmc_send_id TEXT,
  template_id TEXT,
  preview_url TEXT,
  send_classification TEXT,
  data_envio TIMESTAMPTZ,
  campanha_id UUID REFERENCES campanhas(id),
  prompt_id UUID REFERENCES prompts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEs de envio/exclusão por email
CREATE TABLE email_des (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id),
  tipo TEXT NOT NULL,  -- 'envio' | 'exclusao'
  de_name TEXT NOT NULL,
  de_object_id TEXT
);

-- Campanhas (grupo de N emails)
CREATE TABLE campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  nome TEXT NOT NULL,
  campanha_id TEXT UNIQUE,  -- ex: 'SSL0001'
  status TEXT DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Biblioteca de prompts
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  template_id TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates (espelho do catálogo local)
CREATE TABLE templates (
  id TEXT PRIMARY KEY,  -- 'full-hero', 'text-first', etc
  nome TEXT NOT NULL,
  descricao TEXT,
  tags TEXT[],
  preview_urls JSONB  -- {bu: url} per brand
);
```

---

## 12. Segurança e Credenciais

- Credenciais SFMC, Google, Anthropic: **variáveis de ambiente** no Vercel (nunca no frontend)
- API routes validam origin (header check) para evitar uso externo
- HTML gerado é sanitizado antes de renderizar no iframe (sandbox attribute)
- Uploads de .docx: armazenados temporariamente no Supabase Storage, removidos após processamento

---

## 13. Plano de Rollout (Milestones)

### M1 — Fundação (Semana 1)
- Setup Next.js + shadcn/ui + Supabase + Vercel
- Figma design system criado e exportado para shadcn
- Dashboard com dados mockados
- Routing `/[bu]/` funcionando

### M2 — Wizard de Email (Semana 2)
- Steps 1–4 do wizard (tipo, copy, refs, template)
- Integração com Anthropic API para geração de HTML
- Streaming SSE funcionando no frontend

### M3 — Edição e Aprovação (Semana 3)
- Tela de detalhe com editor visual + Monaco HTML
- Preview iframe com switcher desktop/mobile
- Fluxo de aprovação + comentários

### M4 — Agendamento SFMC (Semana 4)
- Modal de agendamento completo
- Integração SFMC REST (upload asset)
- Integração SFMC SOAP (create email + ESD + schedule)
- DE autocomplete via Sheets Config

### M5 — Layout e Catálogo (Semana 5)
- Wizard de novo layout (4 variações)
- Galeria comparativa
- Publicação no catálogo + Notion

### M6 — Refinamento (Semana 6)
- Biblioteca de prompts
- Histórico
- Figma → código final (figma:implement-design)
- QA e bugfix

---

## 14. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Portar lógica bash→TypeScript é mais complexo que esperado | Alta | Alto | Começar com SFMC calls mais simples; manter bash como fallback |
| SFMC SOAP em serverless (cold start + timeout) | Média | Médio | Mover SOAP calls para background job (Vercel cron ou Supabase edge functions) |
| Streaming SSE com Next.js e Vercel | Baixa | Alto | Testar streaming early (M2) antes de depender disso |
| Claude API custo por volume | Baixa | Médio | Monitorar uso; cache de prompts frequentes |

---

## 15. Decision Log

| Decisão | Data | Motivo | Alternativas rejeitadas |
|---|---|---|---|
| Next.js + Supabase | 2026-03-02 | MVP rápido, hosting grátis no free tier, shadcn nativo | FastAPI separado (mais lento), Retool (design limitado) |
| Sem auth no MVP | 2026-03-02 | Velocidade; acesso é interno e controlado por URL | Supabase Auth (adiciona ~1 semana) |
| Figma como fonte de verdade do design system | 2026-03-02 | Fidelidade 1:1 com figma:implement-design | Direto para código sem Figma |
| SSE para streaming | 2026-03-02 | Nativo em Next.js 15; WebSockets seriam overengineering | WebSockets, polling |
| Supabase como DB local | 2026-03-02 | Google Sheets continua para sync SFMC histórico; Supabase para estado da UI | Substituir Sheets completamente |
