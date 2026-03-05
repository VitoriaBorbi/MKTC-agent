# Design Doc — Template Catalog & Campaign Identity

**Data:** 2026-02-24
**Status:** Design aprovado, implementação pendente
**Autor:** Claude Code + Vitória Esteves

---

## 1. Contexto e objetivo

O Email Agent atual tem **um template fixo por BU** (`brands/<bu>/template.html`). Não há escolha de layout, nem identidade visual específica por campanha — toda comunicação da Finclass, por exemplo, usa o mesmo esqueleto estrutural, independentemente de ser uma campanha de "Segundo Salário" ou uma newsletter semanal.

O objetivo deste design é:
1. Criar uma **biblioteca de templates de layout** (estrutura de blocos, independente da BU)
2. Criar um **sistema de identidade de campanha** (camada sobreposta à identidade da BU)
3. Gerar um **catálogo visual navegável no Notion** para que stakeholders escolham o layout antes de encomendar o email
4. Integrar a escolha de template e campanha no fluxo de fila existente (`/queue`)

---

## 2. Escopo

**Entra:**
- Biblioteca de 6 templates de layout em `email-agent/templates/`
- Sistema de identidade em 3 camadas: layout → BU → campanha
- `campaign.json` por campanha, armazenado no Google Drive
- Skill `/catalog` para gerar screenshots e publicar no Notion
- Atualização da planilha de fila com colunas `template_id` e `campaign_id`
- Renomeação do campo `brand` → `bu` nos configs e skills
- Integração do novo sistema no `/queue` e `/email`

**Fora de escopo (agora):**
- Editor visual interativo de templates (drag-and-drop)
- Geração 100% dinâmica de identidade via IA (ex.: extrair paleta de imagem automaticamente)
- Publicação do catálogo em canal além do Notion (Canva, Figma, site público)
- Versionamento de templates (git-based ou Notion-based)
- Templates responsivos para mobile (emails continuam table-based 600px)

---

## 3. Requisitos e critérios de sucesso

| Requisito | Critério de aceite |
|---|---|
| Stakeholder consegue navegar o catálogo sem auxílio técnico | Notion acessível por URL, filtros por BU funcionando |
| Screenshot fiel ao email real | Preview gerado via Edge headless, largura 600px, com conteúdo de exemplo |
| Identidade de campanha aplicada corretamente | Cores do `campaign.json` sobrescrevem BU nos campos mapeados |
| Fila processa template + campanha | `/queue` lê `template_id` e `campaign_id` e gera HTML correto |
| Manutenção simples | Adicionar novo template = rodar `/catalog add <id>` + editar HTML + `/catalog generate` |

---

## 4. Restrições e premissas

- **Ambiente:** Windows 11, Git Bash, sem `node` ou `python3` disponíveis
- **Screenshots:** via `msedge --headless` (nativo no Windows 11, sem instalação)
- **Armazenamento de screenshots:** Google Drive (pasta `Email Agent/Catálogo/previews/`)
- **Catálogo:** Notion Database com Notion API integration (token a configurar)
- **Campaign identity:** arquivo `campaign.json` upado manualmente pelo stakeholder (ou Vitória) no Drive em `<BU>/Campanhas/<nome>/identity/`
- **Templates são table-based:** mesmas regras de HTML email do projeto (sem flexbox, CSS inline, fontes seguras)
- **BU (antes "brand"):** renomear em configs, planilha e skills — retrocompatibilidade não necessária pois o histórico de nomes é interno

---

## 5. Abordagens consideradas

| Abordagem | Descrição | Decisão |
|---|---|---|
| A — HTML estático gerado pelo agente | Catálogo como página HTML em Drive/GitHub Pages | Rejeitada: sem colaboração |
| B — Notion puro (manual) | Screenshots manuais, cards no Notion | Rejeitada: screenshots ficam desatualizados |
| **C — Híbrido (escolhida)** | **Agente gera screenshots → Drive → Notion API** | **Escolhida: visual + colaborativo + atualização automática** |

---

## 6. Arquitetura escolhida

```
┌─────────────────────────────────────────────────────────────────┐
│  CATALOG SKILL (/catalog)                                       │
│                                                                 │
│  email-agent/templates/<id>/base.html                          │
│      + sample-content.json (conteúdo de exemplo para preview)  │
│          ↓ merge                                               │
│      preview/<bu>.html                                         │
│          ↓ msedge --headless --screenshot                      │
│      preview/<bu>.png                                          │
│          ↓ upload                                              │
│      Google Drive: Email Agent/Catálogo/previews/              │
│          ↓ Notion API                                          │
│      Notion Database (gallery view)                            │
│          → stakeholder navega, filtra por BU/estilo            │
│          → anota template_id na planilha                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SISTEMA DE IDENTIDADE (3 camadas)                              │
│                                                                 │
│  Camada 1: Layout (template)                                    │
│    email-agent/templates/<id>/base.html                        │
│    → define estrutura de blocos (onde vai cada elemento)       │
│                                                                 │
│  Camada 2: BU Identity                                          │
│    email-agent/brands/<bu>/brand.json                          │
│    → cores, fontes, logo, footer, tom de voz                   │
│                                                                 │
│  Camada 3: Campaign Identity (novo)                             │
│    Drive/<BU>/Campanhas/<nome>/identity/campaign.json          │
│    → overrides de cor, hero image, variante de logo            │
│                                                                 │
│  Composição: Camada 1 ← Camada 2 ← Camada 3 ← copy do docx    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  QUEUE / EMAIL SKILL (atualizado)                               │
│                                                                 │
│  Planilha Sheets (novas colunas):                               │
│    bu | template_id | campaign_id | docx_link | ...            │
│          ↓                                                     │
│  Agente baixa docx do Drive                                    │
│  Lê template base (Camada 1)                                   │
│  Aplica BU identity (Camada 2)                                 │
│  Baixa campaign.json do Drive e aplica overrides (Camada 3)    │
│  Injeta copy do docx → HTML final → SFMC                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Templates do catálogo (6 layouts iniciais)

| ID | Nome | Estrutura de blocos |
|---|---|---|
| `full-hero` | Hero Completo | Imagem hero full-width → headline → corpo → CTA |
| `text-first` | Texto em Destaque | Headline bold → corpo → imagem → CTA |
| `side-image` | Imagem Lateral | 2 colunas: texto (esq) + imagem (dir) |
| `multi-block` | Newsletter | Header + 2–3 seções de conteúdo com separadores |
| `minimal` | Minimalista | Sem imagem hero, foco em tipografia, CTA limpo |
| `announcement` | Anúncio | Elemento destaque (badge/data/nome) + texto curto + CTA |

Cada template contém:
```
email-agent/templates/<id>/
├── base.html           ← layout com placeholders {{COLOR_PRIMARY}}, {{HERO_IMAGE}}, etc.
├── meta.json           ← nome, tags de estilo, zonas de conteúdo suportadas
├── sample-content.json ← conteúdo de exemplo usado nos previews
└── preview/            ← gerado pelo /catalog (não commitado, .gitignore)
    ├── finclass.png
    ├── finclass-segundo-salario.png
    ├── bruno-perini.png
    └── ...
```

### Placeholders padrão nos templates

**Identidade (substituídos pela BU + campanha):**
- `{{COLOR_PRIMARY}}`, `{{COLOR_SECONDARY}}`, `{{COLOR_BG}}`
- `{{COLOR_CTA_BG}}`, `{{COLOR_CTA_TEXT}}`
- `{{COLOR_TEXT}}`, `{{COLOR_TEXT_LIGHT}}`
- `{{FONT_HEADING}}`, `{{FONT_BODY}}`
- `{{LOGO_URL}}`, `{{LOGO_ALT}}`, `{{LOGO_WIDTH}}`
- `{{FOOTER_BLOCK}}` (bloco completo gerado a partir do brand.json)

**Conteúdo (substituídos pela copy do docx):**
- `{{EMAIL_SUBJECT}}`, `{{PREHEADER}}`
- `{{HERO_IMAGE_URL}}`, `{{HERO_IMAGE_ALT}}`
- `{{HEADLINE}}`, `{{BODY_COPY}}`
- `{{CTA_TEXT}}`, `{{CTA_URL}}`
- `{{SECTION_N_TITLE}}`, `{{SECTION_N_BODY}}` (para multi-block)

---

## 8. Modelo de dados

### `meta.json` (por template)
```json
{
  "id": "full-hero",
  "name": "Hero Completo",
  "description": "Imagem grande no topo, ideal para lançamentos e campanhas com forte apelo visual.",
  "tags": ["hero", "imagem", "cta-unico", "lancamento"],
  "content_zones": ["hero_image", "headline", "body_copy", "cta"],
  "best_for": ["lançamentos", "promoções", "anúncios de produto"]
}
```

### `campaign.json` (por campanha, no Drive)
```json
{
  "name": "Segundo Salário",
  "id": "segundo-salario",
  "bu": "finclass",
  "overrides": {
    "color_primary": "#F5A623",
    "color_cta_bg": "#F5A623",
    "color_cta_text": "#000000",
    "color_secondary": "#1A1A2E"
  },
  "assets": {
    "hero_image": "https://drive.google.com/uc?id=...",
    "logo_variant": ""
  },
  "tone_note": "Linguagem aspiracional focada em renda extra e liberdade financeira."
}
```

### Colunas da planilha de fila (Sheets) — atualização

| Coluna | Antes | Depois |
|---|---|---|
| B | `brand` | `bu` |
| — | (não existia) | `template_id` (nova col M) |
| — | (não existia) | `campaign_id` (nova col N, opcional) |

---

## 9. Notion Database

- **Tipo:** Database (Full Page)
- **View padrão:** Gallery (preview PNG como thumbnail)
- **Propriedades:**

| Campo | Tipo | Descrição |
|---|---|---|
| Name | Title | `Full Hero — Finclass` |
| template_id | Text | `full-hero` |
| bu | Select | `finclass` / `bruno-perini` / `faculdade-hub` / `thiago-nigro` |
| tags | Multi-select | `hero`, `minimal`, `newsletter`, `lancamento`, etc. |
| preview | Files & media | PNG gerado pelo agente |
| drive_link | URL | Link para o HTML completo no Drive |
| atualizado_em | Date | Data da última geração |

- **Filtros disponíveis para stakeholder:** por `bu`, por `tags`
- **Ação do stakeholder:** clicar no card → ver preview ampliado → anotar `template_id` na planilha

---

## 10. Segurança e acesso

- Notion integration token: salvar em `email-agent/credentials/notion-config.json` (fora do git)
- Drive: mesma service account já em uso (`mktc-agent@mktc-agent-488120.iam.gserviceaccount.com`)
- Nova pasta no Drive: `Email Agent/Catálogo/previews/` — compartilhada com a mesma SA
- `campaign.json` fica em `<BU>/Campanhas/<nome>/identity/` — acesso herdado pela SA

---

## 11. Resiliência e erros

| Cenário | Comportamento |
|---|---|
| `campaign_id` não informado na fila | Agente usa apenas Camadas 1 + 2 (BU identity), sem erro |
| `campaign.json` não encontrado no Drive | Agente avisa e continua com identity da BU |
| Screenshot Edge falha | Agente loga o erro, pula aquele preview, continua os demais |
| Notion API indisponível | Agente salva PNGs no Drive e avisa para sync manual |
| Template `template_id` não encontrado | Agente usa template default da BU (atual) e avisa |

---

## 12. Observabilidade

- `/catalog generate` exibe tabela de status por template × BU: `OK` / `ERRO` / `PULADO`
- Screenshots salvos localmente em `email-agent/templates/<id>/preview/` antes de subir
- Notion pages têm campo `atualizado_em` para rastrear frescor dos previews

---

## 13. Plano de rollout

| Fase | O que entra | Dependências |
|---|---|---|
| **Fase 1** | Estrutura de templates (HTML + meta.json + sample-content.json) | — |
| **Fase 2** | `/catalog generate` com Edge headless + upload Drive | Fase 1 |
| **Fase 3** | Notion API integration + publicação automática do catálogo | Fase 2 + token Notion |
| **Fase 4** | Atualização do `/email` e `/queue` para ler template_id + campaign_id | Fase 1 |
| **Fase 5** | Renomear `brand` → `bu` nos configs e planilha | Fase 4 |
| **Fase 6** | Campanha-piloto com stakeholder real | Fases 1–5 |

---

## 14. Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Edge headless não disponível no path do Git Bash | Média | Médio | Testar no início da Fase 2; fallback: screenshots manuais |
| Placeholders mal mapeados quebram HTML | Baixa | Alto | Testes de preview antes de qualquer uso em produção |
| Notion API muda ou sai do ar | Baixa | Baixo | Catálogo HTML no Drive como backup sempre disponível |
| Stakeholder ignora o catálogo e não preenche template_id | Alta | Baixo | Campo opcional — fallback para template default da BU |

---

## 15. Decision Log

| Decisão | Data | Motivo | Alternativas rejeitadas |
|---|---|---|---|
| Catálogo no Notion (híbrido C) | 2026-02-24 | Colaboração + visual + atualização automática | HTML estático (sem colaboração), Canva (conta paga), Figma (curva de aprendizado) |
| Screenshots via Edge headless | 2026-02-24 | Nativo Windows 11, zero dependência nova | Puppeteer/Playwright (Node não disponível), API externa de screenshot (custo) |
| 3 camadas de identidade | 2026-02-24 | Separação clara de responsabilidades, reutilização máxima | Template único por BU+campanha (proliferação de arquivos), identidade 100% no docx (frágil) |
| campaign.json no Drive | 2026-02-24 | Já no ecossistema, acesso herdado pela SA | Google Sheets (estrutura de planilha não ideal para JSON), inline na fila (muito verboso) |
| template_id opcional na fila | 2026-02-24 | Adoção gradual sem quebrar fluxo existente | Obrigatório (impacto imediato em todos os envios) |

### Perguntas abertas
- Quantas páginas de Notion a integration terá acesso? (workspace inteiro ou só a database do catálogo?)
- O stakeholder quer poder deixar comentários/favoritos nos cards do Notion? (depende de permissão de edição vs. view-only)
- Para a Fase 6 (piloto), qual campanha e BU usar como primeiro teste?
