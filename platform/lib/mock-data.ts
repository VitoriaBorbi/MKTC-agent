import { Email, Campanha, Template, BU } from '@/types'

export const MOCK_EMAILS: Email[] = [
  {
    id: '1',
    bu: 'finclass',
    tipo: 'avulso',
    nome: 'VIT0001 Email Venda Vitalício',
    status: 'agendado',
    assunto: 'Acesso vitalício à Finclass — última chance',
    preheader: 'Não perca esta oportunidade única',
    template_id: 'full-hero',
    data_envio: '2026-03-03T13:00:00Z',
    sfmc_asset_id: '36353',
    sfmc_send_id: '30119',
    preview_url: '',
    created_at: '2026-02-28T10:00:00Z',
    updated_at: '2026-02-28T12:00:00Z',
  },
  {
    id: '2',
    bu: 'finclass',
    tipo: 'campanha',
    nome: 'SSL0001 Email 1 — Boas-vindas',
    status: 'aprovado',
    assunto: 'Bem-vindo à Finclass, %%Nome%%!',
    template_id: 'full-hero',
    campanha_id: 'camp-1',
    created_at: '2026-02-25T09:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: '3',
    bu: 'finclass',
    tipo: 'campanha',
    nome: 'SSL0001 Email 2 — Conteúdo semana 1',
    status: 'aguardando_aprovacao',
    assunto: 'Sua primeira semana de aprendizado',
    template_id: 'text-first',
    campanha_id: 'camp-1',
    created_at: '2026-02-25T09:00:00Z',
    updated_at: '2026-03-01T16:00:00Z',
  },
  {
    id: '4',
    bu: 'finclass',
    tipo: 'avulso',
    nome: 'Black Friday Copy',
    status: 'rascunho',
    template_id: 'full-hero',
    created_at: '2026-03-01T11:00:00Z',
    updated_at: '2026-03-01T11:00:00Z',
  },
  {
    id: '5',
    bu: 'finclass',
    tipo: 'avulso',
    nome: 'Newsletter Março — Semana 1',
    status: 'enviado',
    assunto: 'O que você precisa saber sobre investimentos em Março',
    data_envio: '2026-03-01T12:00:00Z',
    sfmc_asset_id: '36100',
    sfmc_send_id: '29900',
    created_at: '2026-02-28T08:00:00Z',
    updated_at: '2026-03-01T12:05:00Z',
  },
]

export const MOCK_CAMPANHAS: Campanha[] = [
  {
    id: 'camp-1',
    bu: 'finclass',
    nome: 'SSL0001 — Sequência de Leads',
    campanha_id: 'SSL0001',
    status: 'aprovado',
    created_at: '2026-02-25T09:00:00Z',
  },
]

export const MOCK_TEMPLATES: Template[] = [
  {
    id: 'newsletter',
    nome: 'Newsletter',
    descricao: 'Cabeçalho da marca + badge de edição + corpo + CTA. Para envios recorrentes.',
    tags: ['newsletter', 'recorrente'],
    preview_urls: {},
  },
  {
    id: 'campanha',
    nome: 'Campanha',
    descricao: 'Hero opcional + headline + corpo + CTA destacado. Para promoções e lançamentos.',
    tags: ['campanha', 'promo'],
    preview_urls: {},
  },
  {
    id: 'simples',
    nome: 'Simples',
    descricao: 'Corpo direto + CTA. Para conteúdos curtos, relatórios e comunicados.',
    tags: ['simples', 'conteúdo'],
    preview_urls: {},
  },
  {
    id: 'hero-full',
    nome: 'Hero Full',
    descricao: 'Imagem hero full-width, mensagem central em sobreposição e CTA único. Máximo impacto visual.',
    tags: ['hero', 'visual', 'promo'],
    preview_urls: {},
  },
  {
    id: 'multibloco',
    nome: 'Multi-Bloco',
    descricao: 'Múltiplas seções de conteúdo com separadores. Ideal para digests e resumos semanais.',
    tags: ['newsletter', 'digest', 'multi'],
    preview_urls: {},
  },
  {
    id: 'anuncio',
    nome: 'Anúncio',
    descricao: 'Borda colorida no topo, conteúdo centralizado, tom de urgência. Para avisos e alertas.',
    tags: ['urgência', 'alerta', 'anúncio'],
    preview_urls: {},
  },
  {
    id: 'boas-vindas',
    nome: 'Boas-vindas',
    descricao: 'Logo grande + saudação personalizada + etapas de onboarding. Para entrada de leads.',
    tags: ['onboarding', 'welcome', 'automação'],
    preview_urls: {},
  },
  {
    id: 'produto',
    nome: 'Produto',
    descricao: 'Imagem lateral + descrição + benefícios em lista + CTA. Para apresentar produto ou curso.',
    tags: ['produto', 'feature', 'vendas'],
    preview_urls: {},
  },
  {
    id: 'texto-longo',
    nome: 'Texto Longo',
    descricao: 'Hierarquia tipográfica forte, copy extensa, sem imagens. Para cartas e comunicados formais.',
    tags: ['copy', 'texto', 'formal'],
    preview_urls: {},
  },
]

export function getEmailsByBU(bu: BU): Email[] {
  return MOCK_EMAILS.filter(e => e.bu === bu)
}

export function getCampanhasByBU(bu: BU): Campanha[] {
  return MOCK_CAMPANHAS.filter(c => c.bu === bu)
}

export function getEmailStats(bu: BU) {
  const emails = getEmailsByBU(bu)
  return {
    rascunho: emails.filter(e => e.status === 'rascunho').length,
    aguardando: emails.filter(e => e.status === 'aguardando_aprovacao' || e.status === 'pendente').length,
    aprovado: emails.filter(e => e.status === 'aprovado').length,
    agendado: emails.filter(e => e.status === 'agendado').length,
    enviado: emails.filter(e => e.status === 'enviado').length,
  }
}
