# Email Marketing Agent — Instruções Globais

## O que é este projeto

Um agente especializado em gerar emails marketing em HTML compatível com todos os principais clientes de email (Outlook, Gmail, Apple Mail, Yahoo). O agente recebe conteúdo via arquivo .docx e aplica templates de marca para gerar HTML final pronto para produção.

## Estrutura do projeto

```
email-agent/
├── .claude/commands/email.md  ← Skill principal (/email)
├── brands/<marca>/            ← Config e template por marca
│   ├── brand.json             ← Cores, fontes, logo, footer, tom
│   └── template.html          ← Template HTML base
├── inbox/                     ← Arquivos .docx recebidos
├── output/                    ← Emails HTML gerados
├── rules/html-email-rules.md  ← Regras de compatibilidade HTML email
└── docs/plans/                ← PRD e Design Doc
```

## Regras obrigatórias para geração de HTML

1. **SEMPRE** consultar `rules/html-email-rules.md` antes de gerar qualquer HTML
2. **SEMPRE** usar layout table-based (NUNCA div para estrutura)
3. **SEMPRE** CSS 100% inline
4. **SEMPRE** fontes seguras (Arial, Helvetica, Georgia)
5. **SEMPRE** incluir footer com unsubscribe + endereço
6. **SEMPRE** botões CTA bulletproof (table-based)
7. **SEMPRE** abrir preview no browser após gerar
8. **NUNCA** usar flexbox, grid, float, position, JS

## Como adicionar uma nova marca

1. Criar pasta em `brands/<nome-da-marca>/`
2. Criar `brand.json` seguindo o modelo de `brands/example/brand.json`
3. Criar `template.html` seguindo o modelo de `brands/example/template.html`

## Fluxo do agente

1. Receber: marca + arquivo .docx
2. Extrair conteúdo do docx (textutil)
3. Ler brand config + template + regras
4. Gerar HTML email
5. Salvar em output/
6. Abrir no browser
7. Pedir feedback e iterar se necessário

## Convenções

- Nomes de arquivo de output: `YYYY-MM-DD-<marca>-<nome-descritivo>.html`
- Marcas em lowercase com hifens: `example`, `acme-corp`, `beta-brand`
- Docx na pasta inbox/ antes de processar
