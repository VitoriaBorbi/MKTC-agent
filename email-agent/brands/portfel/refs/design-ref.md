# Portfel — Referência de Design para Emails

## Identidade Visual

- **Marca:** Portfel (consultoria de investimentos, tom institucional)
- **Cor primária:** `#003087` (azul royal escuro)
- **Cor secundária:** `#001F5A` (azul marinho profundo)
- **Fundo conteúdo:** `#FFFFFF`
- **Fundo cards/destaque:** `#F0F4FB` (azul-acinzentado muito claro)
- **CTA:** fundo `#003087`, texto `#FFFFFF`
- **Footer:** fundo `#001F5A`, texto `#FFFFFF`, links `#AABFEA`
- **Logo:** branca, SEMPRE sobre fundo `#003087` ou `#001F5A` (requires_dark_bg)

---

## Estrutura Padrão de Email

### Header (sempre assim)
```
┌─────────────────────────────────────────┐
│  fundo: #003087  padding: 24px          │
│  [Logo Portfel centralizada, width=120] │
└─────────────────────────────────────────┘
│  faixa: #003087, height: 3px            │
```

### Hero / Título (quando não há imagem)
```
┌─────────────────────────────────────────┐
│  fundo: #001F5A  padding: 36px 40px     │
│                                         │
│  CATEGORIA · TIPO  (12px, #AABFEA,      │
│                     uppercase, tracking)│
│                                         │
│  Título Principal  (28px, bold, #FFFFFF)│
│  Subtítulo se houver (16px, #AABFEA)    │
└─────────────────────────────────────────┘
```

### Corpo de conteúdo
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px     │
│                                         │
│  Saudação em bold (#1A1A1A, 16px)       │
│                                         │
│  Parágrafos (#555555, 15px, lh:1.7)     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ fundo: #F0F4FB                   │   │
│  │ borda esq: 4px solid #003087     │   │
│  │ Frase de destaque (#001F5A, bold)│   │
│  └──────────────────────────────────┘   │
│                                         │
│  Mais parágrafos...                     │
└─────────────────────────────────────────┘
```

### Bloco de ícones/benefícios (quando houver lista de 3)
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 24px 40px 8px │
│                                         │
│  [●item1]  [●item2]  [●item3]           │
│  ícone: círculo #001F5A, 44x44px        │
│  emoji/letra dentro (20px)             │
│  texto: 12px, #666666, centrado         │
└─────────────────────────────────────────┘
```

### CTA Principal
```
┌─────────────────────────────────────────┐
│  fundo: #FFFFFF  padding: 36px 40px 40px│
│                                         │
│  Parágrafo de fechamento (#555555,15px) │
│                                         │
│     ┌──────────────────────────────┐    │
│     │  fundo: #003087              │    │
│     │  padding: 16px 56px          │    │
│     │  "Texto do CTA"  #FFFFFF bold│    │
│     └──────────────────────────────┘    │
│                                         │
│  texto apoio (12px, #AAAAAA, centrado)  │
└─────────────────────────────────────────┘
```

### Assinatura
```
┌─────────────────────────────────────────┐
│  fundo: #003087  padding: 28px 40px     │
│  "Atenciosamente,"  (#FFFFFF, 14px)     │
│  "Equipe Portfel"   (#AABFEA, 14px bold)│
└─────────────────────────────────────────┘
```

### Footer
```
┌─────────────────────────────────────────┐
│  fundo: #001F5A  padding: 28px 24px     │
│  "Portfel Consultoria | Endereço..."    │
│  "Cancelar inscrição" (link #AABFEA)    │
│  ícones sociais (se disponíveis)        │
└─────────────────────────────────────────┘
```

---

## Regras Específicas do Portfel

1. **Tom:** Institucional, sério, confiante. Sem excessos de emojis. Máximo 2–3 emojis por email e só se estiverem na copy original.
2. **Logo:** SEMPRE no header azul escuro. NUNCA sobre fundo branco.
3. **Fundo do hero:** Quando não há imagem, usar `#001F5A` (mais escuro que o header `#003087`) para criar profundidade.
4. **Bloco de destaque:** `#F0F4FB` com borda `#003087` — não usar fundo escuro para destaques intermediários.
5. **Ícones de lista:** Círculos sólidos `#001F5A` com emoji dentro — não usar quadrados ou formas assimétricas.
6. **CTA:** Sempre azul `#003087`, texto branco, bordas ligeiramente arredondadas (border-radius: 4px).
7. **Separadores:** Linha `#D0DBF0` (azul-acinzentado) entre seções, 1px.
8. **Não usar:** cores vibrantes, gradientes, sombras exageradas — o Portfel é premium e discreto.

---

## Variações de Layout por Tipo de Email

### Pesquisa / Institucional (como este exemplo)
- Header azul marinho com label de categoria
- Bloco de texto com destaque lateral
- Lista de benefícios em 3 colunas com ícones
- CTA centralizado e isolado
- Assinatura com "Equipe Portfel"

### Comunicado / Resultado
- Hero com número/dado grande em destaque
- Subtítulo explicativo
- Parágrafos com dados concretos
- CTA para leitura completa

### Convite / Evento
- Header com nome do evento em destaque
- Data/local em bloco colorido (`#F0F4FB`)
- CTA de RSVP com urgência
