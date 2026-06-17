---
name: pmp-ampscript-rules
description: Regras definitivas de AMPscript para emails SFMC Finclass — blocos de nome, link PMP, uso de redirectto vs v(), e posicionamento dentro de comentários HTML
type: reference
---

# AMPscript — Regras Definitivas

## Estrutura obrigatória: sempre dentro de `<!-- -->`

Todo bloco `%%[ ]%%` de lógica AMPscript vai dentro de comentário HTML.
AMPscript fora de comentários renderiza texto visível no email (bug crítico).

```html
<!--
%%[
  ... lógica aqui ...
]%%
-->
```

## Bloco 1 — Personalização de nome

```html
<!--
%%[
  set @nome = AttributeValue("nome")
  if empty(@nome) or @nome == "no" or @nome == "." or RegExMatch(@nome, "[0-9]", 0) > 0 then
    set @line = "Olá"
  else
    set @firstName = @nome
    if indexOf(@nome, "@") > 0 then
      set @firstName = "nulable"
    else
      if indexOf(@nome, " ") > 0 then
        set @firstName = Substring(@nome,1, Subtract(IndexOf(@nome," "),1))
      endif
      if indexOf(@nome, ".") > 0 then
        set @firstName = Substring(@nome, 1, IndexOf(@nome, "."))
      endif
    endif
    set @name = Propercase(@firstName)
    if @name == "nulable" then
      set @line = "Olá,"
    else
      set @line = concat("Olá, ",@name)
    endif
  endif
]%%
-->
```

**Uso no corpo:** `%%=v(@line)=%%`

## Bloco 2 — Link PMP

```html
<!--
%%[
  set @link    = 'URL_BASE?'
  set @pmp     = 'FIN-XXX-EML-X-BFIN-YYYYMMDD-ORG-CODXXXX-AS-JOBID'
  set @emailid = 'TODO_EMAILID'

  if indexOf(@pmp, "-") > 0 then
    set @full = BuildRowsetFromString(@pmp,'-')
    set @1  = Field(Row(@full,1),1)
    set @2  = Field(Row(@full,2),1)
    set @3  = Field(Row(@full,3),1)
    set @4  = Field(Row(@full,4),1)
    set @5  = Field(Row(@full,5),1)
    set @6  = FormatDate(now(),"YYYYMMdd")
    set @7  = Field(Row(@full,7),1)
    set @8  = Field(Row(@full,8),1)
    set @9  = Field(Row(@full,9),1)
    set @10 = [JobID]
  endif

  set @pmpComplete = concat('pmp=',@1,'-',@2,'-',@3,'-',@4,'-',@5,'-',@6,'-',@7,'-',@8,'-',@9,'-',@10,'_',@emailid)

  set @utm_source   = 'Email'
  set @utm_campaign = @8
  set @utm_medium   = 'BaseFinclass'
  set @utm_content  = 'Organico'
  set @utm_term     = concat(@1,'-',@2,'-',@3,'-',@4,'-',@5,'-',@6,'-',@7,'-',@8,'-',@9,'-',@10,'_',@emailid)

  set @utmComplete = concat('utm_source=',@utm_source,'&utm_campaign=',@utm_campaign,'&utm_medium=',@utm_medium,'&utm_content=',@utm_content,'&utm_term=',@utm_term)

  set @email        = AttributeValue("Email")
  set @encodedEmail = Base64Encode(@email)
  set @eParam       = concat('?e=',@encodedEmail)

  set @tag      = concat(@eParam,'&',@pmpComplete,'&',@utmComplete)
  set @link_tag = concat(@link,@tag)
]%%
-->
```

**Uso no href do botão:** `href="%%=redirectto(@link_tag)=%%"`

## redirectto vs v() — distinção crítica

| Função | Uso correto | Efeito |
|---|---|---|
| `%%=redirectto(@var)=%%` | href de links e botões | Roteia via SFMC → habilita **click tracking** nos relatórios |
| `%%=v(@var)=%%` | Output de texto inline (ex: saudação) | Imprime o valor; **sem** rastreio de clique |

**Nunca usar `%%variavel%%` em href** — personalization string (campo de DE) em href quebra o Schedule silenciosamente no SFMC.

## Notas da string PMP

- Posição `@6` = **sempre** `FormatDate(now(),"YYYYMMdd")` — nunca data estática
- `@10 = [JobID]` — dinâmico, nunca estático
- `@emailid` = **Email Studio ID** (campo "Email ID" no CB Details) — NÃO o Asset ID do CB
- `TODO_EMAILID` é substituído automaticamente pelo ES ID após SOAP Create (Passo 9-C do email skill)
- Múltiplos PMPs no mesmo email: blocos separados com variáveis renomeadas (`@link2`, `@pmp2`, `@link_tag2`)
