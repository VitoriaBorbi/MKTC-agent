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
    id: 'full-hero',
    nome: 'Hero Completo',
    descricao: 'Imagem hero + headline + corpo + CTA único. Ideal para promoções e lançamentos.',
    tags: ['hero', 'cta', 'promo'],
    preview_urls: {
      finclass: 'https://image.mkt.finclass.com/lib/preview-full-hero.png',
    },
  },
  {
    id: 'text-first',
    nome: 'Texto em Destaque',
    descricao: 'Layout focado em copy longa. Mínimo de imagens, hierarquia de texto forte.',
    tags: ['texto', 'newsletter', 'conteúdo'],
    preview_urls: {},
  },
  {
    id: 'side-image',
    nome: 'Imagem Lateral',
    descricao: 'Imagem ao lado do texto. Bom para apresentação de produto ou pessoa.',
    tags: ['imagem', 'produto', 'pessoa'],
    preview_urls: {},
  },
  {
    id: 'multi-block',
    nome: 'Multi-Bloco',
    descricao: 'Múltiplos blocos de conteúdo. Ideal para newsletters com várias seções.',
    tags: ['newsletter', 'multi', 'seções'],
    preview_urls: {},
  },
  {
    id: 'minimal',
    nome: 'Minimalista',
    descricao: 'Design clean e espaçado. Foco total na mensagem.',
    tags: ['clean', 'minimal', 'elegante'],
    preview_urls: {},
  },
  {
    id: 'announcement',
    nome: 'Anúncio',
    descricao: 'Estilo alerta/anúncio. Direto ao ponto, alta urgência visual.',
    tags: ['urgência', 'anúncio', 'alerta'],
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
