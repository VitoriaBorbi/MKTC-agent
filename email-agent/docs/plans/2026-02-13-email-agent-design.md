# Design Doc — Email Marketing Agent

**Data:** 2026-02-13
**Status:** Aprovado
**PRD:** [2026-02-13-email-agent-prd.md](./2026-02-13-email-agent-prd.md)

---

## 1. Contexto e Objetivo

Construir um agente Claude Code (skill `/email`) que transforma conteúdo de arquivos `.docx` em emails marketing HTML compatíveis com todos os principais clientes de email, usando templates e configurações de marca pré-definidos.

---

## 2. Escopo

**Dentro:** Geração de HTML email a partir de docx + brand config + template, com preview local.

**Fora:** Integração com ESPs, envio, analytics, gestão de listas.

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code CLI                    │
│                                                      │
│  /email <marca> <arquivo.docx>                      │
│       │                                              │
│       ▼                                              │
│  ┌─────────────────────────────────────┐            │
│  │    .claude/commands/email.md        │            │
│  │    (Skill / Prompt do Agente)       │            │
│  └──────────────┬──────────────────────┘            │
│                 │                                    │
│    ┌────────────┼────────────┐                      │
│    ▼            ▼            ▼                      │
│  inbox/       brands/      rules/                   │
│  *.docx       <marca>/     html-email-rules.md      │
│               brand.json                             │
│               template.html                          │
│                 │                                    │
│                 ▼                                    │
│  ┌─────────────────────────────────────┐            │
│  │   textutil -convert html (macOS)    │            │
│  │   Extrai conteúdo do .docx          │            │
│  └──────────────┬──────────────────────┘            │
│                 │                                    │
│                 ▼                                    │
│  ┌─────────────────────────────────────┐            │
│  │   Claude (LLM)                      │            │
│  │   - Analisa conteúdo extraído       │            │
│  │   - Decide layout                   │            │
│  │   - Gera HTML table-based           │            │
│  │   - Aplica brand config             │            │
│  │   - CSS inline                      │            │
│  └──────────────┬──────────────────────┘            │
│                 │                                    │
│                 ▼                                    │
│  ┌─────────────────────────────────────┐            │
│  │   output/                           │            │
│  │   YYYY-MM-DD-marca-nome.html        │            │
│  └──────────────┬──────────────────────┘            │
│                 │                                    │
│                 ▼                                    │
│  ┌─────────────────────────────────────┐            │
│  │   open (browser preview)            │            │
│  │   → Feedback loop                   │            │
│  │   → Aprovar / Ajustar / Refazer     │            │
│  └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

---

## 4. Componentes

### 4.1 Skill (`email.md`)

O prompt do agente orquestra todo o fluxo:
1. Parse de argumentos (marca + arquivo)
2. Extração de conteúdo via textutil
3. Leitura de brand config e template
4. Leitura de regras de compatibilidade
5. Geração do HTML
6. Salvamento e preview
7. Ciclo de feedback

### 4.2 Brand Config (`brand.json`)

Configuração por marca:
- Paleta de cores (primary, secondary, bg, text, CTA)
- Fontes (heading, body)
- Logo (URL, alt, width)
- Footer (empresa, endereço, unsubscribe, social)
- Tom de voz (para orientar decisões de layout)

### 4.3 Template HTML (`template.html`)

Esqueleto HTML com placeholders semânticos:
- `{{header_block}}` — Logo e navegação
- `{{hero_block}}` — Banner/hero (opcional)
- `{{content_blocks}}` — Conteúdo principal (flexível)
- `{{cta_block}}` — Call-to-action principal
- `{{footer_block}}` — Footer legal

O agente substitui estes placeholders por HTML table-based real.

### 4.4 Regras (`html-email-rules.md`)

Referência técnica que o agente consulta para garantir compatibilidade:
- Regras de layout (table-based, 600px)
- Regras de CSS (inline, sem shorthand)
- Regras de tipografia (fontes seguras, px)
- Regras de imagens (alt, display:block)
- Regras de botões (bulletproof)
- Regras de Outlook (MSO conditionals)
- Anti-patterns proibidos

---

## 5. Fluxo de Dados

```
Input:
  inbox/campanha.docx     → textutil → HTML raw → texto estruturado
  brands/acme/brand.json  → cores, fontes, logo, footer, tom
  brands/acme/template.html → esqueleto HTML
  rules/html-email-rules.md → regras de compatibilidade

Processing (Claude):
  1. Analisa conteúdo: identifica título, subtítulos, corpo, CTAs, imagens
  2. Decide layout: quantas seções, hero sim/não, colunas sim/não
  3. Aplica brand: cores, fontes, logo no header, dados no footer
  4. Gera HTML: table-based, CSS inline, bulletproof buttons
  5. Valida contra regras: nenhum anti-pattern

Output:
  output/2026-02-13-acme-campanha.html → arquivo final
  → open (browser) → preview visual
```

---

## 6. Segurança e Privacidade

- Nenhum dado sai da máquina local (tudo processado pelo Claude Code CLI)
- Docx e HTML ficam em pastas locais
- Sem API keys externas necessárias (usa Claude Code nativo)
- Links de unsubscribe e tracking são placeholders (preenchidos pelo ESP)

---

## 7. Resiliência e Erros

| Cenário | Tratamento |
|---------|-----------|
| Docx não encontrado | Mensagem clara: "Arquivo não encontrado em inbox/" |
| Marca não existe | Lista marcas disponíveis em brands/ |
| textutil falha | Fallback: tentar ler docx como texto ou pedir pandoc |
| HTML muito grande (>100KB) | Warning + sugestão de simplificar |
| Conteúdo ambíguo no docx | Agente pergunta antes de decidir layout |

---

## 8. Testes e Validação

### MVP
- Gerar email com marca de exemplo + docx simples
- Verificar que HTML abre corretamente no Chrome
- Verificar que não usa anti-patterns (div layout, flexbox, etc.)
- Verificar que brand config é aplicada (cores, logo, footer)

### Pós-MVP
- Testar com diferentes tipos de conteúdo
- Testar com docx complexos (imagens, tabelas)
- Validar em Litmus/Email on Acid (manual)

---

## 9. Plano de Rollout

1. **Agora:** Implementar MVP (Milestone 1)
2. **Próximas semanas:** Adicionar marcas reais e testar com campanhas reais
3. **Depois:** Refinamento do prompt baseado em feedback

---

## 10. Decision Log

| # | Decisão | Motivo | Alternativas |
|---|---------|--------|-------------|
| 1 | Claude Code Skill | Menor complexidade, integrado ao workflow | MCP Server, Script Python |
| 2 | textutil (macOS) | Zero dependências, nativo | python-docx, mammoth, pandoc |
| 3 | Placeholders semânticos no template | Flexibilidade para o agente | Templates rígidos |
| 4 | CSS 100% inline | Compatibilidade máxima | Style block |
| 5 | Feedback loop pós-preview | Qualidade antes de produção | Geração direta sem review |

---

## Perguntas Abertas

- [ ] Testar se `textutil` preserva links e imagens do docx
- [ ] Avaliar necessidade de pandoc como fallback
- [ ] Definir se precisa de dark mode no Milestone 2
