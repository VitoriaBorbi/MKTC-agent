# Regras de HTML para Email Marketing

Este documento é a referência obrigatória para geração de emails HTML.
O agente DEVE consultar e seguir TODAS estas regras ao gerar qualquer email.

---

## 1. Layout

- **SEMPRE** usar `<table>` para estrutura de layout. NUNCA `<div>` para posicionamento.
- Largura máxima do email: **600px**
- Toda `<table>` deve ter: `cellpadding="0" cellspacing="0" border="0"`
- Espaçamento entre elementos: usar `padding` em `<td>`, NUNCA `margin`
- Centralizar o email com table wrapper `width="100%"` + `<td align="center">`
- Para colunas lado a lado: usar `<td>` adjacentes dentro de `<tr>`, NUNCA float

### Estrutura base obrigatória:
```html
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:#f5f5f5;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="background-color:#ffffff;">
        <!-- CONTEÚDO AQUI -->
      </table>
    </td>
  </tr>
</table>
```

---

## 2. CSS

- **100% inline** — usar atributo `style=""` em CADA elemento visível
- Sem `<link>` externo, sem `@import`
- Bloco `<style>` no `<head>` APENAS como fallback para Gmail web/Apple Mail
- **Sem shorthand CSS:**
  - `background-color` em vez de `background`
  - `padding-top`, `padding-right`, etc. OU `padding: 10px 20px` (aceito inline)
  - `font-family`, `font-size`, `font-weight` separados
- **NUNCA usar:**
  - `display: flex` ou `display: grid`
  - `position: relative/absolute/fixed`
  - `float: left/right`
  - `max-width` sem fallback de `width`
  - `calc()`, `var()`, CSS custom properties
  - `rgba()` — usar cores hex sólidas
  - Animações ou transitions

---

## 3. Tipografia

- **Fontes seguras APENAS:**
  - Arial, Helvetica, sans-serif
  - Georgia, Times New Roman, serif
  - Verdana, Geneva, sans-serif
  - Courier New, monospace
- Tamanhos em **px** — NUNCA `em`, `rem`, `%`, `vw`
- `line-height` em px (ex: `line-height: 24px`) ou número (ex: `line-height: 1.5`)
- Heading principal: 24-32px
- Corpo: 14-16px
- Footer/legal: 11-13px
- Sempre declarar `font-family` em cada elemento de texto

---

## 4. Imagens

- **SEMPRE** incluir: `alt`, `width`, `height`
- `style="display:block;"` para evitar espaços fantasma
- `border="0"` obrigatório
- Formato: imagens linkáveis com `<a>` wrapper
- Alt text descritivo (o email deve fazer sentido sem imagens)

### Exemplo:
```html
<img src="https://exemplo.com/banner.jpg"
     alt="Promoção de Verão - 50% OFF"
     width="600" height="300"
     style="display:block; border:0; width:100%; max-width:600px;"
     border="0" />
```

---

## 5. Botões CTA (Bulletproof)

NUNCA usar imagem como botão. SEMPRE usar table-based bulletproof button:

```html
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="{{cta_bg}}"
        style="background-color:{{cta_bg}}; border-radius:4px;
               padding:14px 30px;">
      <a href="{{url}}" target="_blank"
         style="color:{{cta_text}}; text-decoration:none;
                font-family:Arial,Helvetica,sans-serif;
                font-size:16px; font-weight:bold;
                display:inline-block; line-height:1;">
        {{cta_text_label}}
      </a>
    </td>
  </tr>
</table>
```

### Variação para Outlook (VML bulletproof button completo):
```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
             xmlns:w="urn:schemas-microsoft-com:office:word"
             href="{{url}}" style="height:44px; v-text-anchor:middle;
             width:200px;" arcsize="10%" strokecolor="{{cta_bg}}"
             fillcolor="{{cta_bg}}">
  <w:anchorlock/>
  <center style="color:{{cta_text}}; font-family:Arial,sans-serif;
                 font-size:16px; font-weight:bold;">
    {{cta_text_label}}
  </center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<!-- bulletproof button normal aqui -->
<!--<![endif]-->
```

---

## 6. Outlook (MSO) — Regras Especiais

- Usar conditional comments para fallbacks:
  ```html
  <!--[if mso]> código Outlook <![endif]-->
  <!--[if !mso]><!--> código outros <!--<![endif]-->
  ```
- `mso-line-height-rule:exactly` quando usar line-height
- Outlook ignora `border-radius` — aceitar cantos retos como fallback
- Outlook ignora `max-width` — sempre definir `width` fixo
- Para background images: usar VML (`v:background` ou `v:rect`)
- Outlook usa Word engine — testar headings e espaçamento

---

## 7. Preheader Text

Incluir texto de preheader invisível logo após `<body>`:

```html
<div style="display:none; max-height:0; overflow:hidden;
            mso-hide:all; font-size:0; line-height:0; color:#f5f5f5;">
  {{preheader_text}}
  <!-- Padding para esconder preview do próximo conteúdo -->
  &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>
```

---

## 8. Footer Obrigatório

Todo email DEVE incluir:

1. **Link de unsubscribe** (visível e clicável)
2. **Endereço físico** da empresa (exigência CAN-SPAM / LGPD)
3. **Nome da empresa**
4. **Links de redes sociais** (se configurado no brand.json)
5. Texto legal/disclaimer se necessário

### Exemplo:
```html
<table width="600" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:30px 20px;
        background-color:#f5f5f5; font-family:Arial,sans-serif;
        font-size:12px; color:#999999; line-height:18px;">
      <p style="margin:0 0 10px;">
        &copy; 2026 {{company}}. Todos os direitos reservados.
      </p>
      <p style="margin:0 0 10px;">
        {{address}}
      </p>
      <p style="margin:0;">
        <a href="{{unsubscribe_url}}" target="_blank"
           style="color:#999999; text-decoration:underline;">
          Cancelar inscrição
        </a>
      </p>
    </td>
  </tr>
</table>
```

---

## 9. Doctype e Head

Usar XHTML 1.0 Transitional (melhor compatibilidade):

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{email_subject}}</title>
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--<![endif]-->
</head>
```

---

## 10. Anti-Patterns — NUNCA FAZER

| Anti-Pattern | Por quê |
|-------------|---------|
| `<div>` para layout | Outlook ignora, layout quebra |
| `display: flex/grid` | Zero suporte em email clients |
| `float` | Comportamento inconsistente |
| `position: absolute/relative` | Não funciona em Outlook |
| JavaScript | Bloqueado por todos os clients |
| `<form>` / inputs | Suporte mínimo, evitar |
| `<video>` / `<audio>` | Não suportado |
| CSS externo (`<link>`) | Gmail/Outlook removem |
| `@media` sem fallback | Pode ser ignorado |
| Background image sem VML | Outlook não renderiza |
| Shorthand `background:` | Inconsistente entre clients |
| `margin` em `<table>` | Usar padding em `<td>` |
| Fontes web sem fallback | Rendering inconsistente |
| Cores `rgba()` | Sem suporte em Outlook |

---

## 11. Checklist de Validação Pós-Geração

Antes de apresentar o preview, verificar mentalmente:

- [ ] Layout 100% table-based?
- [ ] CSS 100% inline?
- [ ] Largura máxima 600px?
- [ ] Fontes seguras?
- [ ] Todas as imagens com alt, width, height?
- [ ] Botões bulletproof (table-based)?
- [ ] Preheader text incluso?
- [ ] Footer com unsubscribe + endereço?
- [ ] Conditional comments MSO onde necessário?
- [ ] Nenhum anti-pattern usado?
- [ ] Cores da marca aplicadas corretamente?
- [ ] Logo no header?
