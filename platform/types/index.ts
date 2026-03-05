export type BU = 'finclass' | 'bruno-perini' | 'faculdade-hub' | 'thiago-nigro' | 'portfel' | 'grao'

export type EmailStatus =
  | 'rascunho'
  | 'pendente'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'agendado'
  | 'enviado'
  | 'erro'

export type EmailTipo = 'avulso' | 'campanha'

export interface Email {
  id: string
  bu: BU
  tipo: EmailTipo
  nome: string
  status: EmailStatus
  assunto?: string
  preheader?: string
  html_content?: string
  sfmc_asset_id?: string
  sfmc_send_id?: string
  template_id?: string
  preview_url?: string
  send_classification?: string
  data_envio?: string
  campanha_id?: string
  prompt_id?: string
  obs?: string
  created_at: string
  updated_at: string
  des_envio?: DE[]
  des_exclusao?: DE[]
}

export interface DE {
  id: string
  email_id: string
  tipo: 'envio' | 'exclusao'
  de_name: string
  de_object_id?: string
}

export interface Campanha {
  id: string
  bu: BU
  nome: string
  campanha_id: string
  status: EmailStatus
  created_at: string
  emails?: Email[]
}

export interface Template {
  id: string
  nome: string
  descricao?: string
  tags: string[]
  preview_urls: Partial<Record<BU, string>>
}

export interface Prompt {
  id: string
  bu: BU
  nome: string
  conteudo: string
  template_id?: string
  tags: string[]
  created_at: string
}

export interface BrandConfig {
  name: string
  slug: BU
  colors: {
    primary: string
    secondary: string
    cta: string
    footer_bg: string
    footer_text: string
    divider: string
  }
  fonts: {
    heading: string
    body: string
  }
  logo_url: string
  sfmc: {
    mid: string
    category_email: number
    category_images: number
    category_campaign: number
    send_classification: string
  }
}

export interface StreamEvent {
  type: 'log' | 'html' | 'done' | 'error'
  message?: string
  html?: string
  error?: string
}
