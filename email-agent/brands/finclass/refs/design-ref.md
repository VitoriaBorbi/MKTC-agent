# Finclass — Referência de Design para Emails

## Identidade Visual

- **Marca:** Finclass (educação financeira premium, tom aspiracional)
- **Cor primária:** `#00e7f9` (ciano elétrico — identidade forte)
- **Cor secundária:** `#0a0e27` (azul marinho escuro, quase preto)
- **Fundo conteúdo:** `#FFFFFF`
- **Fundo cards/destaque:** `#f0fdff` (ciano muito claro)
- **CTA:** fundo `#00e7f9`, texto `#000000` (preto — garantir contraste)
- **Footer:** fundo `#0a0e27` (escuro), texto `#888888`, links `#00e7f9`
- **Divider:** linha `#00e7f9`, 3px — identidade forte da marca
- **Logo:** branca, SEMPRE sobre fundo `#0a0e27`

---

## Estrutura Padrão de Email

### Header (sempre assim)
```
┌─────────────────────────────────────────┐
│  fundo: #0a0e27  padding: 24px 30px     │
│  [Logo Finclass centralizada, width=180]│
└─────────────────────────────────────────┘
│  faixa: #00e7f9, height: 3px  ← marca  │
```

### Hero / Título (quando não há imagem)
```
┌─────────────────────────────────────────┐
│  fundo: #0a0e27  padding: 28px 40px 24px│
│                                         │
│  CATEGORIA / TIPO  (12px, #00e7f9,      │
│                     uppercase, ls: 3px) │
│                                         │
│  Título Principal  (28px, bold, #FFFFFF)│
│                    lh: 1.25            │
└─────────────────────────────────────────┘
│  faixa: #00e7f9, height: 3px            │
```

### Quando há imagem de hero (full-width)
```
┌─────────────────────────────────────────┐
│  imagem 600px largura, sem padding      │
│  alt descritivo obrigatório             │
│  height: auto (não fixar)               │
└─────────────────────────────────────────┘
```

### Corpo de conteúdo
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 20px│
│                                         │
│  Saudação bold (#0a0e27, 16px)          │
│                                         │
│  Parágrafos (#444444, 15px, lh:1.7)     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ fundo: #f0fdff                   │   │
│  │ borda esq: 4px solid #00e7f9     │   │
│  │ padding: 18px 20px               │   │
│  │ Frase destaque (#0a0e27, bold)   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Bloco de ícones/benefícios (3 colunas)
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 24px 40px 8px │
│                                         │
│  [●]         [●]         [●]            │
│  círculo: #0a0e27, 44x44px              │
│  emoji (20px) centralizado              │
│  texto: 12px, #666666, centrado         │
└─────────────────────────────────────────┘
```

### Separador entre seções
```
│  1px, #e8e8e8, margin: 0 40px          │
```

### CTA Principal
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 40px│
│                                         │
│  Parágrafo de fechamento                │
│  (#444444, 16px, lh:1.6)               │
│                                         │
│     ┌──────────────────────────────┐    │
│     │  fundo: #00e7f9  r: 4px      │    │
│     │  padding: 16px 48px          │    │
│     │  "Texto do CTA"  #000000 bold│    │
│     └──────────────────────────────┘    │
│                                         │
│  "Texto apoio" (12px, #aaaaaa, center) │
└─────────────────────────────────────────┘
```

### Assinatura
```
┌─────────────────────────────────────────┐
│  fundo: #0a0e27  padding: 28px 40px     │
│  "Atenciosamente," (#FFFFFF, 14px)      │
│  "Equipe Finclass"  (#00e7f9, 14px bold)│
└─────────────────────────────────────────┘
```

### Footer
```
┌─────────────────────────────────────────┐
│  fundo: #0a0e27  padding: 30px 24px     │
│  [ícones sociais: Instagram, YouTube,   │
│   LinkedIn, TikTok — width: 24px cada] │
│  Endereço (12px, #888888)               │
│  "Cancelar inscrição" (link #00e7f9)    │
└─────────────────────────────────────────┘
```

---

## Regras Específicas da Finclass

1. **Ciano é a alma da marca.** Usar em: faixa divisória, CTA, borda de destaque, links, assinatura da equipe, categoria label. Não saturar — máximo 4 usos visuais distintos.
2. **Fundo escuro (`#0a0e27`):** Header, footer, assinatura. Cria o "envelope" escuro que é identidade Finclass.
3. **Interior branco:** Corpo do conteúdo sempre branco — contrasta forte com o escuro do envelope.
4. **Faixa ciano de 3px:** É o DNA visual da marca. Aparece entre header e conteúdo, e pode aparecer entre seções importantes.
5. **CTA preto sobre ciano** — NUNCA branco sobre ciano (baixo contraste). NUNCA ciano sobre ciano.
6. **Tom:** Aspiracional, premium. Pode usar emojis se estiverem na copy original. Evitar linguagem informal excessiva.
7. **Ícones sociais no footer:** Usar as URLs de ícone do brand.json (Instagram, YouTube, LinkedIn, TikTok).
8. **Logo:** SEMPRE branca sobre `#0a0e27`. Width 180px.

---

## Variações de Layout por Tipo de Email

### Venda / Oferta
- Hero com imagem de produto ou tipográfico impactante
- Bloco de benefícios em cards ou lista com destaques em ciano
- Urgência (data, contador, vagas limitadas) em bloco de destaque
- CTA grande e isolado
- P.S. ou garantia abaixo do CTA

### Newsletter / Conteúdo
- Header com label de edição
- Múltiplas seções com separadores
- CTAs inline menores (não isolados)
- Assinatura pessoal (nome do autor)

### Campanha / Lançamento
- Hero full-width (imagem real obrigatória — buscar nos docs)
- Sequência: teaser → benefício → prova → CTA
- Footer completo com todas as redes sociais
