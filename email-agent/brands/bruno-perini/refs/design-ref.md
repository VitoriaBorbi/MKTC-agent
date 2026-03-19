# Bruno Perini — Referência de Design para Emails

## Identidade Visual

- **Marca:** Bruno Perini (investimentos, educação financeira, tom direto e objetivo)
- **Cor primária:** `#b2ec05` (verde-limão elétrico — identidade forte)
- **Cor secundária:** `#0f1014` (preto quase puro)
- **Fundo conteúdo:** `#FFFFFF`
- **Fundo cards/destaque:** `#f4f9e0` (verde-limão muito claro, derivado do primário)
- **CTA:** fundo `#b2ec05`, texto `#000000` (preto — garantir contraste)
- **Footer:** fundo `#0f1014`, texto `#818181`, links `#D5D5D5`
- **Divider:** linha `#E5E7EB` (cinza claro) entre seções de conteúdo
- **Divider de marca:** `#b2ec05`, 3px — usar no header e em separadores de impacto
- **Logo:** sobre fundo `#0f1014` (sem `requires_dark_bg` definido, mas logo é clara — sempre usar fundo escuro no header)

---

## Estrutura Padrão de Email

### Header
```
┌─────────────────────────────────────────┐
│  fundo: #0f1014  padding: 24px 30px     │
│  [Logo Bruno Perini centralizada, w=150]│
└─────────────────────────────────────────┘
│  faixa: #b2ec05, height: 3px  ← marca  │
```

### Hero / Título (quando não há imagem)
```
┌─────────────────────────────────────────┐
│  fundo: #0f1014  padding: 32px 40px 28px│
│                                         │
│  CATEGORIA  (11px, #b2ec05, uppercase,  │
│              letter-spacing: 3px)       │
│                                         │
│  Título Principal  (28px, bold, #FFFFFF)│
│                    line-height: 1.25    │
└─────────────────────────────────────────┘
│  faixa: #b2ec05, height: 3px            │
```

### Quando há imagem de hero (full-width)
```
┌─────────────────────────────────────────┐
│  imagem 600px largura, sem padding      │
│  diretamente após a faixa verde do header│
└─────────────────────────────────────────┘
```

### Corpo de conteúdo
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 20px│
│                                         │
│  Saudação bold (#000000, 16px)          │
│                                         │
│  Parágrafos (#555555, 15px, lh:1.7)     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ fundo: #f4f9e0                   │   │
│  │ borda esq: 4px solid #b2ec05     │   │
│  │ padding: 16px 20px               │   │
│  │ Frase destaque (#000000, bold)   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Lista de benefícios / ícones (3 colunas)
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 24px 40px 8px │
│                                         │
│  [●]         [●]         [●]            │
│  círculo: #0f1014, 44x44px              │
│  emoji (20px) centralizado             │
│  texto: 12px, #666666, centrado         │
└─────────────────────────────────────────┘
```

### CTA Principal
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 40px│
│                                         │
│  Parágrafo de fechamento (#555555, 15px)│
│                                         │
│     ┌──────────────────────────────┐    │
│     │  fundo: #b2ec05  r: 4px      │    │
│     │  padding: 16px 56px          │    │
│     │  "Texto do CTA"  #000000 bold│    │
│     └──────────────────────────────┘    │
│                                         │
│  texto apoio (12px, #aaaaaa, center)   │
└─────────────────────────────────────────┘
```

### Assinatura
```
┌─────────────────────────────────────────┐
│  fundo: #0f1014  padding: 28px 40px     │
│  "Atenciosamente,"  (#FFFFFF, 14px)     │
│  "Bruno Perini"     (#b2ec05, 14px bold)│
└─────────────────────────────────────────┘
```

### Footer
```
┌─────────────────────────────────────────┐
│  fundo: #0f1014  padding: 28px 24px     │
│  [ícones: Instagram, Twitter, YouTube,  │
│   Site — width: 24px cada, espaçados]  │
│  Endereço SFMC (12px, #818181)          │
│  "Cancelar inscrição" (link #D5D5D5)    │
└─────────────────────────────────────────┘
```

---

## Regras Específicas do Bruno Perini

1. **Verde-limão é a assinatura.** Usar em: faixa divisória, CTA, borda de destaque, label de categoria, assinatura. Nunca em texto corrido.
2. **Envelope escuro:** Header e footer sempre em `#0f1014`. Interior branco. Contraste forte.
3. **CTA preto sobre verde-limão** — NUNCA branco sobre verde (baixo contraste).
4. **Tom direto:** Sem floreiros. Linguagem clara, objetiva. Emojis só se na copy original.
5. **Faixa verde de 3px** entre header e conteúdo: obrigatória, é a identidade.
6. **Destaque de bloco:** fundo `#f4f9e0` (derivado suave do verde) com borda esquerda `#b2ec05`.
7. **Ícones sociais no footer:** Instagram, Twitter/X, YouTube, Site — usar URLs do brand.json.

---

## Variações de Layout por Tipo de Email

### Venda / Oferta
- Hero tipográfico escuro com label verde
- Benefícios em lista com marcador verde ou cards
- CTA verde grande e isolado
- Urgência em bloco `#f4f9e0`

### Conteúdo / Newsletter
- Header padrão + faixa verde
- Seções com separadores cinza `#E5E7EB`
- CTAs menores inline

### Evento / Convite
- Hero com imagem (se disponível) ou tipográfico impactante
- Data/hora em bloco de destaque verde-limão suave
- CTA de confirmação
