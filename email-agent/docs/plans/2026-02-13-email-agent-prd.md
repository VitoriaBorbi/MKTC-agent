# PRD — Email Marketing Agent para Claude Code

**Data:** 2026-02-13
**Status:** Draft
**Autor:** Leonardo Andrade + Claude

---

## 1. Problema

Criar emails marketing em HTML compatível com clientes de email (Outlook, Gmail, Apple Mail, Yahoo) é um processo lento, repetitivo e propenso a erros:

- **Codificação manual** em HTML table-based com CSS inline consome horas
- **Incompatibilidade** entre clientes de email causa layouts quebrados
- **Inconsistência visual** quando múltiplas marcas não seguem padrões definidos
- **Ciclo lento** de criar → testar → corrigir → testar novamente
- **Copy chega em .docx** e precisa ser extraído e formatado manualmente

**Volume atual:** 4-10 marcas, 10-30 emails/semana.

---

## 2. Solução

Um **agente Claude Code** (skill `/email`) que:

1. Recebe um arquivo `.docx` com o copy da campanha
2. Carrega o template HTML base e configurações visuais da marca
3. Usa inteligência artificial para decidir o melhor layout
4. Gera HTML 100% compatível com clientes de email
5. Abre um preview no navegador para aprovação
6. Permite ciclos de ajuste antes de finalizar

---

## 3. Usuário-alvo

Profissionais de marketing e operações que:
- Gerenciam múltiplas marcas
- Recebem copy em formato .docx
- Precisam de emails HTML de alta qualidade e compatíveis
- Usam Claude Code como ferramenta de trabalho

---

## 4. Requisitos Funcionais

### P0 (Must Have — MVP)

| ID | Requisito | Critério de Aceite |
|----|-----------|-------------------|
| F1 | Ler arquivo .docx e extrair conteúdo | Extrai texto, headings, bold, listas, links |
| F2 | Carregar config de marca (cores, fontes, logo) | Lê brand.json e aplica ao output |
| F3 | Carregar template HTML base da marca | Usa template.html como esqueleto |
| F4 | Gerar HTML email compatível | Table-based, CSS inline, fontes seguras, max 600px |
| F5 | Decidir layout baseado no conteúdo | Identifica título, corpo, CTAs e distribui no template |
| F6 | Gerar botões CTA bulletproof | Table-based, funciona sem imagens |
| F7 | Incluir footer completo | Unsubscribe, endereço, redes sociais |
| F8 | Salvar HTML em output/ | Naming: YYYY-MM-DD-marca-nome.html |
| F9 | Abrir preview no navegador | Executa `open` no arquivo gerado |
| F10 | Ciclo de feedback | Após preview, permite aprovar ou pedir ajustes |

### P1 (Should Have — Milestone 2)

| ID | Requisito |
|----|-----------|
| F11 | Suporte a múltiplos tipos de email (newsletter, promo, boas-vindas) |
| F12 | Validação pós-geração (peso HTML, links, alt text) |
| F13 | Suporte a imagens inline com fallback |

### P2 (Could Have — Milestone 3)

| ID | Requisito |
|----|-----------|
| F14 | Dark mode support (meta color-scheme) |
| F15 | Acessibilidade (role=presentation, contraste) |
| F16 | Export para plataformas de envio (copy-paste otimizado) |

---

## 5. Requisitos Não-Funcionais

| Requisito | Meta |
|-----------|------|
| Compatibilidade | Outlook 2016+, Gmail (web/app), Apple Mail, Yahoo Mail |
| Tamanho do HTML | < 100KB por email |
| Tempo de geração | < 30 segundos para gerar + abrir preview |
| Marcas suportadas | Até 10 simultaneamente (via pastas brands/) |

---

## 6. Fora de Escopo (v1)

- Integração com ESPs (Mailchimp, SendGrid, etc.)
- Gestão de listas de contatos
- Analytics de envio
- Orquestração de campanhas
- A/B testing
- Envio automático de emails

---

## 7. Métricas de Sucesso

| Métrica | Baseline (manual) | Meta (com agente) |
|---------|-------------------|-------------------|
| Tempo para criar 1 email | ~60 min | < 5 min |
| Emails com bugs visuais | ~30% | < 5% |
| Consistência de marca | Variável | 100% (enforced por config) |

---

## 8. Arquitetura

**Abordagem:** Claude Code Skill (custom slash command)

```
Fluxo:
  .docx (inbox/) + brand config + template
      → textutil (extração)
      → Claude (inteligência de layout)
      → HTML final (output/)
      → Preview (browser)
      → Feedback loop
```

**Componentes:**
- `.claude/commands/email.md` — Prompt do agente (skill)
- `brands/<marca>/brand.json` — Config visual por marca
- `brands/<marca>/template.html` — Template HTML base
- `rules/html-email-rules.md` — Regras de compatibilidade
- `CLAUDE.md` — Instruções globais

---

## 9. Milestones

### Milestone 1: MVP (Fundação)
- Estrutura de pastas
- Regras HTML email
- 1 marca de exemplo
- Skill /email funcional
- CLAUDE.md

### Milestone 2: Refinamento
- Testes com diferentes tipos de conteúdo
- Mais marcas
- Ajustes de prompt

### Milestone 3: Robustez
- Validação pós-geração
- Edge cases
- Documentação de onboarding

---

## 10. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| HTML gerado incompatível com Outlook | Média | Alto | Regras rigorosas + conditional comments MSO |
| textutil não preserva estrutura do docx | Baixa | Médio | Fallback para pandoc se necessário |
| Prompt não gera layout adequado | Média | Alto | Iteração no prompt + exemplos no rules/ |
| Copy muito longo/complexo no docx | Baixa | Médio | Agente pode pedir confirmação de layout |

---

## Decision Log

| Decisão | Data | Motivo | Alternativas Rejeitadas |
|---------|------|--------|------------------------|
| Claude Code Skill (não MCP/Script) | 2026-02-13 | Menor time-to-MVP, integrado ao workflow | MCP Server, Python standalone |
| textutil para parsing docx | 2026-02-13 | Nativo macOS, zero dependências | python-docx, mammoth, pandoc |
| Template com placeholders semânticos | 2026-02-13 | Flexibilidade para o agente decidir layout | Templates rígidos por tipo |
| CSS 100% inline | 2026-02-13 | Máxima compatibilidade com email clients | Style block com fallback |
