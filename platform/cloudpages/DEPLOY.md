# Deploy — MKTC Platform no SFMC CloudPages

## Visão geral

```
SFMC CloudPages/
├── mktc-api   ← Code Resource (.ssjs) — backend / API
└── mktc-app   ← CloudPage (.html)    — frontend SPA
```

---

## Passo 1 — Criar as Data Extensions

No SFMC, crie as DEs abaixo em **Email Studio → Data Extensions** ou via **Contact Builder → Data Designer**.

### DE: `MKTC_Emails`

| Campo          | Tipo   | Tamanho   | PK  | Obrigatório |
|----------------|--------|-----------|-----|-------------|
| ID             | Text   | 50        | ✓   | ✓           |
| BU             | Text   | 50        |     | ✓           |
| Nome           | Text   | 200       |     | ✓           |
| Status         | Text   | 50        |     | ✓           |
| Assunto        | Text   | 500       |     |             |
| Preheader      | Text   | 500       |     |             |
| Template_ID    | Text   | 50        |     |             |
| HTML_Content   | Text   | **0**     |     |             |
| Send_Date      | Text   | 20        |     |             |
| Send_Time      | Text   | 10        |     |             |
| DE_Envio       | Text   | 200       |     |             |
| DE_Exclusao    | Text   | 200       |     |             |
| Obs            | Text   | 1000      |     |             |
| Created_Date   | Date   |           |     |             |
| Updated_Date   | Date   |           |     |             |

> ⚠️ **HTML_Content**: defina o campo como **Text com tamanho 0** (= unlimited / NTEXT). Isso permite armazenar HTML de email completo (~50KB).

**Customer Key:** `MKTC_Emails`

---

## Passo 2 — Criar o Code Resource (API)

1. Vá em **CloudPages → Create Code Resource**
2. **Type:** `JavaScript`
3. **Name:** `mktc-api`
4. Cole o conteúdo de `mktc-api.ssjs`
5. **Importante:** substitua `PUT_YOUR_ANTHROPIC_KEY_HERE` pela chave real da Anthropic API
6. Clique em **Publish**
7. Copie a URL gerada (ex: `https://pub.s7.exacttarget.com/…`)

---

## Passo 3 — Criar o CloudPage (Frontend)

1. Vá em **CloudPages → Create Page**
2. **Type:** `Smart Page` ou `HTML Page`
3. **Name:** `mktc-app`
4. Cole o conteúdo de `mktc-app.html`
5. Clique em **Publish**
6. Copie a URL gerada

---

## Passo 4 — Configurar a conexão

1. Abra a URL do `mktc-app` no browser
2. Na tela de setup, cole a URL do `mktc-api` Code Resource
3. Clique em **Conectar**

A URL é salva no localStorage do browser. Cada usuário precisará fazer essa configuração uma vez.

---

## Variáveis a substituir em `mktc-api.ssjs`

| Variável                        | Onde alterar             | Valor                      |
|---------------------------------|--------------------------|----------------------------|
| `PUT_YOUR_ANTHROPIC_KEY_HERE`   | Linha 5 do arquivo .ssjs | Sua chave `sk-ant-…`       |

---

## Status dos emails

| Valor          | Significado                     |
|----------------|---------------------------------|
| `rascunho`     | Gerado, pendente de revisão     |
| `em_aprovacao` | Submetido para aprovação        |
| `aprovado`     | Aprovado, pendente de agendar   |
| `agendado`     | Data/hora de envio definida     |
| `enviado`      | Envio concluído                 |

---

## Limites e considerações

- **Timeout:** Claude Haiku responde em ~10-20s. O SSJS `HTTP.Post()` tem timeout de ~60s. Deve funcionar na maioria dos casos.
- **Tamanho da imagem:** A imagem de referência é redimensionada no browser para 800×800px antes do envio. Isso evita payloads muito grandes.
- **HTML_Content:** Campo Text sem limite. Emails típicos têm 20-80KB.
- **Múltiplos usuários:** Todos os usuários compartilham a mesma DE. Não há isolamento por usuário (comportamento esperado para MVP).
- **Sem autenticação:** A URL das CloudPages é pública. Compartilhe apenas com o time interno.

---

## Troubleshooting

| Problema                              | Solução                                                        |
|---------------------------------------|----------------------------------------------------------------|
| "Unknown action" na API               | Verifique se o Code Resource está publicado                    |
| Emails não aparecem na fila           | Confirme que o Customer Key da DE é exatamente `MKTC_Emails`  |
| Geração retorna erro HTTP 529         | Claude API com alta demanda — tente novamente                  |
| Geração retorna erro HTTP 400/401     | Verifique a chave Anthropic no Code Resource                   |
| HTML_Content truncado                 | Confirme que o campo foi criado com tamanho **0** (unlimited)  |
| CORS error no browser                 | CloudPage e Code Resource devem estar no mesmo domínio SFMC    |
