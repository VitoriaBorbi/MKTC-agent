# Design Doc — Campaign Mode para o Email Agent

**Data:** 2026-02-20
**Status:** Design aprovado, implementação pendente
**Autor:** Claude Code + Vitória Esteves

---

## 1. Contexto e objetivo

O Email Agent (`/email`) processa um email por vez: 1 `.docx` → 1 HTML → 1 upload SFMC.

O objetivo deste design é expandir o agente para suportar **modo campanha**: um único `.docx` contendo N copies distintas → N emails HTML → N uploads SFMC, com revisão e ajuste individuais antes de subir.

---

## 2. Escopo

**Entra:**
- Skill `/campaign` (nova), separada da `/email`
- Parsing de `.docx` com N seções delimitadas por marcador
- Mapeamento automático de imagens embutidas por seção
- Loop de geração + preview + ajuste granular por email
- Upload em batch de todos os aprovados ao final

**Fora de escopo (agora):**
- Agendamento de envios no SFMC (Journey Builder / Email Send)
- Relatórios de campanha (open rate, CTR)
- Suporte a múltiplas marcas dentro de uma mesma campanha
- Versionamento de emails após upload

---

## 3. Requisitos

### Funcionais
- R1: Detectar automaticamente N seções no `.docx` pelo marcador `=== EMAIL N - Nome ===`
- R2: Extrair por seção: copy, subject, preheader e imagens embutidas
- R3: Gerar N emails HTML seguindo os mesmos padrões da skill `/email` (brand config, regras HTML, formatação docx)
- R4: Exibir preview de cada email no browser após geração
- R5: Loop de ajuste livre — usuário escolhe qual email ajustar, em qualquer ordem, quantas vezes quiser
- R6: Indicadores de status por email: `✅ ok`, `✏️ ajustado`, `👀 não revisado`
- R7: Upload em batch de todos os emails ao final, após confirmação
- R8: Nomenclatura padronizada de assets no SFMC: `YYYY-MM-DD-<marca>-<campanha>-email-NN-<slug>`

### Não-funcionais
- Reutilizar toda a lógica existente da skill `/email` (brand, HTML rules, SFMC upload)
- Funcionar no mesmo ambiente Windows/Git Bash (sem python3, node, jq)

---

## 4. Restrições e premissas

- O `.docx` de campanha deve seguir a convenção de marcadores definida abaixo
- Todas as imagens da campanha estão embutidas no `.docx` (não em pasta externa)
- A campanha é sempre de uma única marca
- Limite prático: até ~10 emails por campanha (acima disso, dividir em múltiplos `.docx`)

---

## 5. Convenção do .docx de campanha

O time de copy deve usar o seguinte formato:

```
CAMPANHA: <nome da campanha>
MARCA: <nome da marca>

=== EMAIL 1 - Abertura ===
Subject: Você foi selecionado
Linha Fina: Acesse antes que acabe
Remetente: Equipe Finclass

[copy do email 1 com imagens embutidas]

=== EMAIL 2 - Prova Social ===
Subject: Veja o resultado
Linha Fina: Em apenas 1 mês
Remetente: Equipe Finclass

[copy do email 2 com imagens embutidas]

=== EMAIL N - Nome ===
...
```

**Regras:**
- Marcador obrigatório: `=== EMAIL N - Nome ===` (exatamente este formato, em parágrafo próprio)
- Subject, Linha Fina e Remetente logo após o marcador (mesma convenção do email individual)
- Imagens embutidas dentro de cada seção, na posição em que devem aparecer no email

---

## 6. Arquitetura

```
/campaign skill
│
├── Passo 1-3: Mesmo fluxo da /email
│   (marca, arquivo .docx, número de opções de layout)
│
├── Passo 4: Detecção de modo campanha
│   ├── Extrair texto por parágrafo
│   ├── Detectar marcadores === EMAIL N ===
│   └── Se N > 1 → ativar modo campanha
│
├── Passo 4-C: Mapeamento de imagens por seção
│   ├── Extrair todos os rIds em ordem do XML
│   ├── Cruzar posições dos rIds com posições dos marcadores
│   └── Resultado: { email_1: [rId6, rId7], email_2: [rId8], ... }
│
├── Passo 4-B: Upload de imagens (por seção, dentro do loop)
│   └── Para cada email N: upload apenas das imagens da seção N → SFMC /img
│
├── Loop de geração (email 1..N):
│   ├── Gerar HTML do email N (usando brand config + regras HTML)
│   ├── Salvar em output/ com nome padronizado
│   └── Abrir preview no browser
│
├── Loop de revisão e ajuste:
│   ├── Mostrar painel de status da campanha
│   ├── Perguntar: "Quer ajustar algum?"
│   ├── Se sim: "Qual?" → fazer ajuste → reabrir preview
│   ├── Após ajuste: "Pronto! Tem mais algum para ajustar?"
│   └── Repetir até confirmação de "pode subir tudo"
│
└── Upload batch:
    ├── Para cada email aprovado:
    │   ├── Autenticar no SFMC (BU da marca)
    │   ├── POST/PUT asset com HTML + subject + preheader
    │   └── Reportar ID do asset criado
    └── Resumo final: N emails subidos com sucesso
```

---

## 7. Estado da campanha (em memória durante a sessão)

```
campanha = {
  nome: "Segundo Salário - Fevereiro 2026",
  marca: "finclass",
  emails: [
    {
      n: 1,
      nome: "Abertura",
      slug: "abertura",
      subject: "Você foi selecionado",
      preheader: "Acesse antes que acabe",
      imagens: ["rId6", "rId7"],
      img_urls: { "rId6": "https://...", "rId7": "https://..." },
      html_file: "output/2026-02-20-finclass-segundo-salario-email-01-abertura.html",
      status: "✅",       # ✅ ok | ✏️ ajustado | 👀 não revisado
      ajustes: 0,
      sfmc_id: null
    },
    { n: 2, nome: "Prova Social", ... },
    ...
  ]
}
```

---

## 8. Painel de status da campanha

Exibido sempre que o agente pede feedback:

```
Campanha: Segundo Salário - Fevereiro 2026 | Finclass | 5 emails

  👀 Email 1 — Abertura
  👀 Email 2 — Prova Social
  👀 Email 3 — Urgência
  👀 Email 4 — Último Aviso
  👀 Email 5 — Encerramento

Quer ajustar algum antes de subir? [Sim / Não, pode subir tudo]
```

Após ajustes:

```
Campanha: Segundo Salário - Fevereiro 2026 | Finclass | 5 emails

  ✅ Email 1 — Abertura
  ✏️  Email 2 — Prova Social    (ajustado 2x)
  ✅ Email 3 — Urgência
  👀 Email 4 — Último Aviso
  ✅ Email 5 — Encerramento

Pronto! Email 2 atualizado. Tem mais algum para ajustar antes de subir?
```

---

## 9. Nomenclatura de arquivos e assets SFMC

**Arquivo local:**
```
email-agent/output/YYYY-MM-DD-<marca>-<slug-campanha>-email-NN-<slug-nome>.html
```

**Asset SFMC:**
```
YYYY-MM-DD-<marca>-<slug-campanha>-email-NN-<slug-nome>
```

**Exemplo:**
```
2026-02-20-finclass-segundo-salario-email-01-abertura.html
2026-02-20-finclass-segundo-salario-email-02-prova-social.html
```

---

## 10. Tratamento de erros

| Situação | Comportamento |
|---|---|
| Marcador não encontrado no .docx | Alertar e perguntar se quer processar como email individual |
| Posição de imagem ambígua entre seções | Perguntar ao usuário a qual seção pertence |
| Upload de imagem falha para uma seção | Avisar, usar placeholder `[IMAGEM INDISPONÍVEL]` no HTML, continuar |
| Upload SFMC de email falha | Avisar, oferecer retry, continuar com os demais |
| Token SFMC expira durante o upload batch | Reautenticar automaticamente e continuar |

---

## 11. Relação com a skill `/email`

A skill `/campaign` **reutiliza** toda a lógica da `/email`:
- Brand config e template → mesmos arquivos `brands/<marca>/`
- Regras HTML → `rules/html-email-rules.md`
- Geração de HTML → mesmos padrões (table-based, CSS inline, CTA bulletproof, footer)
- Upload SFMC → mesma lógica de POST/PUT + autenticação por BU

A diferença é a **camada de orquestração** ao redor: split do docx, loop por seção, painel de status, upload em batch.

---

## 12. Decision Log

| Decisão | Motivo | Alternativas rejeitadas |
|---|---|---|
| Um único `.docx` com marcadores | Fluxo natural para o time de copy — tudo em um lugar | Múltiplos `.docx` separados (mais arquivos para gerenciar), tabela-índice (mais rígido) |
| Imagens embutidas por seção | Mapeamento automático por posição no XML, sem configuração manual | Pasta externa com nomes mapeados (dependência de convenção de nome) |
| Gera tudo → revisa livre → sobe tudo | Visão completa da campanha antes de aprovar, ajuste em qualquer ordem | Email por email com aprovação sequencial (mais lento, sem visão do todo) |
| Painel de status com ícones | Contexto visual rápido sem poluir a conversa | Lista de texto simples (menos informativo), sem painel (confuso em campanhas longas) |
| Upload em batch ao final | Consistência — SFMC recebe a campanha completa de uma vez | Upload incremental por email (risco de campanha parcialmente publicada) |

---

## 13. Plano de implementação

### Milestone 1 — Split e detecção de modo campanha
- Passo 4 adaptado: detectar marcadores, extrair N seções com metadados
- Passo 4-C adaptado: mapear imagens por posição relativa ao marcador

### Milestone 2 — Loop de geração
- Iterar seções, gerar HTML para cada uma reutilizando lógica da `/email`
- Upload de imagens por seção (Passo 4-B restrito às imagens da seção atual)
- Salvar e abrir preview por email

### Milestone 3 — Loop de revisão com painel de status
- Painel com ícones `✅ / ✏️ / 👀`
- Interação: "quer ajustar algum?" → "qual?" → ajuste → "mais algum?"
- Contador de ajustes por email

### Milestone 4 — Upload batch
- Iterar emails aprovados em sequência
- Autenticação, POST/PUT, reautenticação automática se token expirar
- Resumo final com IDs dos assets criados no SFMC
