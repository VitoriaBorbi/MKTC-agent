# Deploy — MKTC Platform no SFMC CloudPages

## Arquitetura

```
SFMC CloudPages/
├── mktc-api       ← Landing Page (AMPScript) — backend / API + todos os templates inline
├── mktc-app       ← Landing Page (HTML)      — frontend SPA (Alpine.js)
├── mktc-styles    ← Code Resource (CSS)
└── mktc-logic     ← Code Resource (JavaScript)
```

**Fluxo de geração:** stakeholder seleciona template → cola link do Google Docs →
`mktc-api` busca o doc via HTTP GET, parseia campos (ASSUNTO, LINHA FINA, CORPO, CTA),
mescla no template HTML inline, retorna JSON com o HTML gerado.
Sem IA, sem chaves externas, sem Code Resources de templates.

---

## Passo 1 — DEs no SFMC

### DE: `MKTC_Emails` (criar se não existir)

| Campo | Tipo | Tamanho | PK |
|---|---|---|---|
| ID | Text | 50 | ✓ |
| BU | Text | 50 | |
| Nome | Text | 200 | |
| Status | Text | 50 | |
| Assunto | Text | 500 | |
| Preheader | Text | 500 | |
| Template_ID | Text | 50 | |
| Send_Date | Text | 20 | |
| Send_Time | Text | 10 | |
| Send_Class_Key | Text | 100 | |
| DE_Envio | Text | 500 | |
| DE_Exclusao | Text | 500 | |
| Obs | Text | 1000 | |
| Created_Date | Date | | |
| Updated_Date | Date | | |

> **Nota:** O campo `HTML_Content` foi removido — HTML é retornado no JSON e salvo no localStorage do browser.

### DE: `MKTC_Config` (criar se não existir)

| Campo | Tipo |
|---|---|
| Key | Text (PK) |
| Value | Text |

**Linhas obrigatórias na MKTC_Config:**

| Key | Value |
|---|---|
| MKTC_API_URL | URL da LP mktc-api após deploy |
| MKTC_APP_URL | URL da LP mktc-app após deploy |

---

## Passo 2 — Code Resource CSS (mktc-styles)

1. CloudPages → **Create Code Resource**
2. Type: `CSS`
3. Name: `mktc-styles`
4. Cole o conteúdo de `mktc-styles.css`
5. **Publish** → copie a URL

---

## Passo 3 — Code Resource JS (mktc-logic)

1. CloudPages → **Create Code Resource**
2. Type: `JavaScript`
3. Name: `mktc-logic`
4. Cole o conteúdo de `mktc-logic.js`
5. **Publish** → copie a URL

---

## Passo 4 — LP API (mktc-api)

1. CloudPages → **Create Page** → Smart Page
2. Name: `mktc-api`
3. Cole o conteúdo de `mktc-api.html` **integralmente**
4. **Publish** → copie a URL
5. Adicione essa URL na DE `MKTC_Config` com Key = `MKTC_API_URL`

> Para atualizar: abra a LP, substitua o conteúdo, Publish novamente.

---

## Passo 5 — LP Shell (mktc-app)

1. Abra `mktc-app-native.html`
2. Substitua as URLs placeholder:
   - `https://cloud.m.grupo-primo.com/mktc-styles` → URL do CR CSS (Passo 2)
   - `https://cloud.m.grupo-primo.com/mktc-logic` → URL do CR JS (Passo 3)
   - `https://cloud.m.grupo-primo.com/mktc-api` → URL da LP API (Passo 4)
3. CloudPages → **Create Page** → Smart Page
4. Name: `mktc-app`
5. Cole o HTML modificado
6. **Publish**
7. Adicione essa URL na DE `MKTC_Config` com Key = `MKTC_APP_URL`
8. Acesse: `<url-mktc-app>?bu=finclass`

---

## Passo 6 — Testar

Acesse `mktc-app?bu=finclass` e verifique:
- [ ] Dashboard carrega com stats
- [ ] "Nova Solicitação" abre o wizard (4 passos)
- [ ] Catálogo mostra 9 templates coloridos para a BU selecionada
- [ ] Passo 3 aceita link do Google Docs (compartilhado como "Qualquer pessoa com link")
- [ ] Gerar email → parseia doc, mescla template, exibe HTML no preview
- [ ] Trocar BU → catálogo atualiza para cores da BU

---

## Google Docs — Formato esperado

O documento pode conter as seguintes linhas (qualquer capitalização):

```
Assunto: <texto do subject>
Linha fina: <texto do preheader>   (opcional)
Preheader: <texto do preheader>    (opcional, alias)
CTA: <texto do botão>              (opcional)
URL: <https://...>                 (opcional)

[TEXTO DO BOTÃO]
https://link-de-destino.com

Corpo do email aqui...
Parágrafo separado por linha em branco.
```

- **ASSUNTO** é obrigatório para o subject do email
- **CORPO** é inferido automaticamente: tudo que não for label reconhecido
- **Parágrafos** são separados por linha em branco no doc

---

## Status de email

| Valor | Significado |
|---|---|
| `rascunho` | Gerado, pendente de revisão |
| `em_aprovacao` | Submetido para aprovação |
| `aprovado` | Aprovado, pendente de agendar |
| `agendado` | Data/hora definida |
| `enviado` | Concluído |

---

## Troubleshooting

| Problema | Solução |
|---|---|
| API retorna `unknown action` | Verifique se LP mktc-api está publicada |
| `generate_from_gdoc` retorna erro de fetch | Doc não está público — share "Qualquer pessoa com link pode ver" |
| `generate_from_gdoc` retorna "Corpo do email." | Doc não tem corpo detectável — verifique formato |
| Catálogo mostra quadrados pretos | `mktc-logic.js` não carregou — verifique URL do CR JS |
| Preview do email em branco | `localStorage` bloqueado — testar em aba normal (não anônima) |
| HTTP 500 em qualquer action | Verifique se a LP mktc-api tem o conteúdo mais recente publicado |
