import { BrandConfig, BU } from '@/types'

export const BRANDS: Record<BU, BrandConfig> = {
  'finclass': {
    name: 'Finclass',
    slug: 'finclass',
    colors: {
      primary: '#00e7f9',
      secondary: '#0a0e27',
      cta: '#00e7f9',
      footer_bg: '#0a0e27',
      footer_text: '#ffffff',
      divider: '#1a2040',
    },
    fonts: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
    logo_url: 'https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/c6b407e1-8e55-4b00-abd8-19f20df026dc.png',
    sfmc: {
      mid: process.env.SFMC_MID_FINCLASS || '',
      category_email: 275176,
      category_images: 275201,
      category_campaign: 275626,
      send_classification: '84',
    },
  },
  'bruno-perini': {
    name: 'Bruno Perini',
    slug: 'bruno-perini',
    colors: {
      primary: '#b2ec05',
      secondary: '#0f1014',
      cta: '#b2ec05',
      footer_bg: '#0f1014',
      footer_text: '#ffffff',
      divider: '#2a2d35',
    },
    fonts: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
    logo_url: 'https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/813699e2-15be-49d3-943e-705a97294c2c.png',
    sfmc: {
      mid: process.env.SFMC_MID_BRUNO_PERINI || '',
      category_email: 320764,
      category_images: 320778,
      category_campaign: 320764,
      send_classification: '',
    },
  },
  'faculdade-hub': {
    name: 'Faculdade Hub',
    slug: 'faculdade-hub',
    colors: {
      primary: '#7c3aed',
      secondary: '#0f0a1e',
      cta: '#7c3aed',
      footer_bg: '#0f0a1e',
      footer_text: '#ffffff',
      divider: '#1e1535',
    },
    fonts: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
    logo_url: 'https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/4127a0f5-8fef-456f-b13e-760099d30ccc.png',
    sfmc: {
      mid: process.env.SFMC_MID_FACULDADE_HUB || '',
      category_email: 0,
      category_images: 0,
      category_campaign: 0,
      send_classification: '',
    },
  },
  'thiago-nigro': {
    name: 'Thiago Nigro',
    slug: 'thiago-nigro',
    colors: {
      primary: '#f59e0b',
      secondary: '#0c0a06',
      cta: '#f59e0b',
      footer_bg: '#0c0a06',
      footer_text: '#ffffff',
      divider: '#2a2206',
    },
    fonts: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
    logo_url: 'https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/9475f340-442b-4e35-9f2b-17fa10f7d0e4.png',
    sfmc: {
      mid: process.env.SFMC_MID_THIAGO_NIGRO || '',
      category_email: 0,
      category_images: 0,
      category_campaign: 0,
      send_classification: '',
    },
  },
  'portfel': {
    name: 'Portfel',
    slug: 'portfel',
    colors: {
      primary: '#10b981',
      secondary: '#0a1a12',
      cta: '#10b981',
      footer_bg: '#0a1a12',
      footer_text: '#ffffff',
      divider: '#1a3028',
    },
    fonts: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
    logo_url: '',
    sfmc: {
      mid: process.env.SFMC_MID_PORTFEL || '',
      category_email: 0,
      category_images: 0,
      category_campaign: 0,
      send_classification: '',
    },
  },
  'grao': {
    name: 'Grão',
    slug: 'grao',
    colors: {
      primary: '#d97706',
      secondary: '#1a0f00',
      cta: '#d97706',
      footer_bg: '#1a0f00',
      footer_text: '#ffffff',
      divider: '#3d2200',
    },
    fonts: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
    logo_url: '',
    sfmc: {
      mid: process.env.SFMC_MID_GRAO || '',
      category_email: 0,
      category_images: 0,
      category_campaign: 0,
      send_classification: '',
    },
  },
}

export const BU_LIST: BU[] = ['finclass', 'bruno-perini', 'faculdade-hub', 'thiago-nigro', 'portfel', 'grao']

export function getBrand(bu: BU): BrandConfig {
  return BRANDS[bu]
}

export function getBULabel(bu: BU): string {
  return BRANDS[bu].name
}
