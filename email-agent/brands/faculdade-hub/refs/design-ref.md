# Faculdade Hub — Referência de Design para Emails

## Identidade Visual

- **Marca:** Faculdade Hub (MBA, educação superior, tom acadêmico e profissional)
- **Cor primária:** `#000000` (preto — identidade minimalista e sofisticada)
- **Cor secundária:** `#0f1014` (fundo escuro do header/footer)
- **Fundo conteúdo:** `#FFFFFF`
- **Fundo cards/destaque:** `#F5F5F5` (cinza muito claro)
- **CTA:** fundo `#000000`, texto `#FFFFFF`
- **Footer:** fundo `#0f1014`, texto `#818181`, links `#D5D5D5`
- **Divider:** linha `#E5E7EB` entre seções; pode usar `#000000` (3px) como divider de impacto
- **Logo:** branca, SEMPRE sobre fundo `#0f1014` (requires_dark_bg: true)

---

## Estrutura Padrão de Email

### Header
```
┌─────────────────────────────────────────┐
│  fundo: #0f1014  padding: 24px 30px     │
│  [Logo Faculdade Hub centralizada, w=150]│
└─────────────────────────────────────────┘
│  faixa: #000000, height: 3px            │
```

### Hero / Título (quando não há imagem)
```
┌─────────────────────────────────────────┐
│  fundo: #000000  padding: 36px 40px 32px│
│                                         │
│  CATEGORIA / TIPO  (11px, #FFFFFF,      │
│  uppercase, letter-spacing: 3px,        │
│  opacity visual: peso leve)             │
│                                         │
│  Título Principal  (28px, bold, #FFFFFF)│
│                    line-height: 1.25    │
│                                         │
│  Subtítulo (16px, #D5D5D5, lh:1.5)     │
└─────────────────────────────────────────┘
```

> A Faculdade Hub tem cor primária preta — o hero escuro comunica sofisticação acadêmica. O branco do conteúdo é o "respiro" visual.

### Quando há imagem de hero (full-width)
```
┌─────────────────────────────────────────┐
│  imagem 600px largura, sem padding      │
│  após a faixa preta do header           │
└─────────────────────────────────────────┘
```

### Corpo de conteúdo
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 20px│
│                                         │
│  Saudação bold (#000000, 16px)          │
│                                         │
│  Parágrafos (#555555, 16px, lh:1.7)     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ fundo: #F5F5F5                   │   │
│  │ borda esq: 4px solid #000000     │   │
│  │ padding: 16px 20px               │   │
│  │ Frase destaque (#000000, bold)   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Lista de benefícios / diferenciais (3 colunas)
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 24px 40px 8px │
│                                         │
│  [●]         [●]         [●]            │
│  círculo: #000000, 44x44px              │
│  emoji ou número (20px) centralizado   │
│  texto: 12px, #666666, centrado         │
└─────────────────────────────────────────┘
```

### Separador entre seções
```
│  1px, #E5E7EB, margin: 0 40px          │
```

### CTA Principal
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 40px│
│                                         │
│  Parágrafo de fechamento (#555555, 16px)│
│                                         │
│     ┌──────────────────────────────┐    │
│     │  fundo: #000000  r: 4px      │    │
│     │  padding: 16px 56px          │    │
│     │  "Texto do CTA" #FFFFFF bold │    │
│     └──────────────────────────────┘    │
│                                         │
│  texto apoio (12px, #aaaaaa, center)   │
└─────────────────────────────────────────┘
```

### Assinatura
```
┌─────────────────────────────────────────┐
│  fundo: #000000  padding: 28px 40px     │
│  "Atenciosamente,"    (#FFFFFF, 14px)   │
│  "Equipe Faculdade Hub" (#D5D5D5, bold) │
└─────────────────────────────────────────┘
```

### Footer
```
┌─────────────────────────────────────────┐
│  fundo: #0f1014  padding: 28px 24px     │
│  [ícones: LinkedIn, Instagram, Site     │
│   — width: 24px cada]                  │
│  Endereço SFMC (12px, #818181)          │
│  "Cancelar inscrição" (link #D5D5D5)    │
└─────────────────────────────────────────┘
```

---

## Regras Específicas da Faculdade Hub

1. **Minimalismo sofisticado.** A identidade é preto e branco — não adicionar cores desnecessárias. A sofisticação vem do espaçamento, hierarquia e tipografia, não de cores vibrantes.
2. **Logo sempre sobre escuro.** Header: `#0f1014`. Hero: `#000000`. Nunca logo sobre branco.
3. **Destaques em cinza claro (`#F5F5F5`) com borda preta** — não usar cores chamativas para blocos de destaque.
4. **Tom acadêmico:** Linguagem profissional e precisa. Sem gírias. Emojis raramente e só se na copy original.
5. **Hierarquia tipográfica** é o design: título grande e bold, subtítulo médio e claro, corpo regular — sem os três no mesmo tom.
6. **Ícones sociais:** LinkedIn (principal), Instagram, Site — usar URLs do brand.json.
7. **CTA:** Preto sólido com texto branco. Simples e direto. Sem gradiente, sem sombra.

---

## Variações de Layout por Tipo de Email

### Institucional / Comunicado
- Hero tipográfico preto com label em branco
- Texto direto e objetivo
- CTA preto isolado
- Footer com ícones sociais

### Captação / MBA
- Hero com imagem (se disponível) ou tipográfico impactante
- Benefícios do curso em 3 colunas
- Depoimento ou dado em bloco `#F5F5F5`
- CTA de inscrição ou mais informações

### Evento / Webinar
- Data e título em destaque no hero
- Detalhes (local, hora, formato) em lista limpa
- CTA de RSVP
