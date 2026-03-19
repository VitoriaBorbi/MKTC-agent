'use client'

import { BU, Template } from '@/types'

const BU_COLORS: Record<BU, string> = {
  'finclass':       '#00e7f9',
  'bruno-perini':   '#b2ec05',
  'faculdade-hub':  '#7c3aed',
  'thiago-nigro':   '#f59e0b',
  'portfel':        '#003087',
  'grao':           '#d97706',
}

const BU_BG: Record<BU, string> = {
  'finclass':       '#0a0e27',
  'bruno-perini':   '#0f1014',
  'faculdade-hub':  '#0f1014',
  'thiago-nigro':   '#0f172a',
  'portfel':        '#001F5A',
  'grao':           '#2d1b00',
}

type MockupProps = { p: string; bg: string }  // p = primary color, bg = dark bg

// 1 — Newsletter: header + divider + edition badge + text lines + CTA + footer
function MNewsletter({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#f5f5f5' }}>
      <div className="h-5 flex items-center justify-center px-3" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-0.5" style={{ background: p }} />
      <div className="px-2.5 pt-2">
        <div className="h-1.5 w-14 rounded mb-1.5" style={{ background: p + '55' }} />
      </div>
      <div className="flex-1 flex flex-col gap-1 px-2.5 pb-1">
        {[1,0.9,1,0.8,1,0.7].map((w,i) => (
          <div key={i} className="h-1.5 rounded bg-black/10" style={{ width: `${w*100}%` }} />
        ))}
      </div>
      <div className="flex justify-center pb-2">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 2 — Campanha: header + hero image block + headline + text + CTA + footer
function MCampanha({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#ffffff' }}>
      <div className="h-5 flex items-center justify-center px-3" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="flex-[2] flex items-center justify-center" style={{ background: p + '18' }}>
        <div className="w-6 h-6 rounded opacity-25" style={{ background: p }} />
      </div>
      <div className="px-2.5 pt-1.5">
        <div className="h-2 w-3/4 rounded bg-black/20 mb-1" />
        <div className="h-1.5 w-full rounded bg-black/10 mb-0.5" />
        <div className="h-1.5 w-5/6 rounded bg-black/10" />
      </div>
      <div className="flex justify-center py-2">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 3 — Simples: header + clean body + CTA + footer
function MSimples({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#ffffff' }}>
      <div className="h-5 flex items-center justify-center px-3" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="flex-1 flex flex-col gap-1 px-2.5 pt-2 pb-1">
        {[1,0.85,1,0.9,0.75,1,0.8].map((w,i) => (
          <div key={i} className="h-1.5 rounded bg-black/10" style={{ width: `${w*100}%` }} />
        ))}
      </div>
      <div className="flex justify-center pb-2">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 4 — Hero Full: full-bleed image with overlaid text + CTA
function MHeroFull({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: bg }}>
      <div className="flex-1 relative flex flex-col items-center justify-center gap-1.5 px-3"
        style={{ background: `linear-gradient(160deg, ${bg} 0%, ${p}22 100%)` }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '66' }} />
        <div className="h-2.5 w-3/4 rounded" style={{ background: '#ffffff33' }} />
        <div className="h-1.5 w-2/3 rounded" style={{ background: '#ffffff22' }} />
        <div className="h-1.5 w-1/2 rounded" style={{ background: '#ffffff22' }} />
        <div className="h-5 w-20 rounded mt-1" style={{ background: p + 'dd' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 5 — Multi-Bloco: header + 2 section cards + dividers + CTA
function MMultibloco({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#f5f5f5' }}>
      <div className="h-5 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="flex-1 flex flex-col gap-1.5 px-2 py-1.5">
        {[0,1].map(i => (
          <div key={i} className="flex-1 rounded p-1.5" style={{ background: '#ffffff', borderLeft: `2px solid ${p}66` }}>
            <div className="h-1.5 w-2/3 rounded bg-black/15 mb-1" />
            <div className="h-1 w-full rounded bg-black/08" />
            <div className="h-1 w-5/6 rounded bg-black/08 mt-0.5" />
          </div>
        ))}
      </div>
      <div className="flex justify-center pb-2">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 6 — Anúncio: top accent bar + centered content + urgency CTA
function MAnuncio({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#ffffff' }}>
      <div className="h-2" style={{ background: p }} />
      <div className="h-5 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-3">
        <div className="h-2 w-1/2 rounded bg-black/25" />
        <div className="h-1.5 w-full rounded bg-black/10" />
        <div className="h-1.5 w-4/5 rounded bg-black/10" />
        <div className="h-5 w-20 rounded mt-1" style={{ background: p + 'dd' }} />
        <div className="h-1 w-1/3 rounded bg-black/10" />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 7 — Boas-vindas: logo large + greeting + 3 onboarding steps
function MBoasVindas({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#ffffff' }}>
      <div className="h-8 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-3 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="px-2.5 pt-2 pb-1">
        <div className="h-2 w-1/2 rounded bg-black/20 mb-1.5" />
        <div className="h-1.5 w-full rounded bg-black/10 mb-0.5" />
        <div className="h-1.5 w-3/4 rounded bg-black/10 mb-2" />
        {[1,2,3].map(n => (
          <div key={n} className="flex items-center gap-1.5 mb-1">
            <div className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: p + '33', border: `1px solid ${p}88` }} />
            <div className="h-1.5 rounded bg-black/10" style={{ width: `${[70,80,60][n-1]}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-center pb-2 mt-auto">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 8 — Produto: header + side-by-side image+text + bullet benefits + CTA
function MProduto({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#ffffff' }}>
      <div className="h-5 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="flex gap-2 px-2 pt-2 flex-[2]">
        <div className="flex-1 rounded flex items-center justify-center" style={{ background: p + '18' }}>
          <div className="w-5 h-5 rounded opacity-30" style={{ background: p }} />
        </div>
        <div className="flex-[1.4] flex flex-col justify-center gap-1">
          <div className="h-2 w-full rounded bg-black/20" />
          <div className="h-1.5 w-5/6 rounded bg-black/10" />
          <div className="h-1.5 w-full rounded bg-black/10" />
        </div>
      </div>
      <div className="px-2 pt-1.5 flex flex-col gap-0.5">
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p + 'aa' }} />
            <div className="h-1.5 rounded bg-black/10" style={{ width: `${[65,80,55][i]}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-center py-2">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

// 9 — Texto Longo: header + dense paragraphs, no images
function MTextoLongo({ p, bg }: MockupProps) {
  return (
    <div className="w-full h-full flex flex-col text-[0px]" style={{ background: '#ffffff' }}>
      <div className="h-5 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1.5 w-10 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="px-2.5 pt-2 flex-1 flex flex-col gap-0.5">
        <div className="h-2 w-1/2 rounded bg-black/20 mb-1.5" />
        {[1,0.95,1,0.85,1,0.9,1,0.8,1,0.75].map((w,i) => (
          <div key={i} className="h-1 rounded bg-black/10" style={{ width: `${w*100}%` }} />
        ))}
        <div className="h-1.5 mt-1" />
        {[1,0.9,0.95,0.8].map((w,i) => (
          <div key={i} className="h-1 rounded bg-black/10" style={{ width: `${w*100}%` }} />
        ))}
      </div>
      <div className="flex justify-start px-2.5 pb-2">
        <div className="h-4 w-14 rounded" style={{ background: p + 'cc' }} />
      </div>
      <div className="h-4 flex items-center justify-center" style={{ background: bg }}>
        <div className="h-1 w-8 rounded" style={{ background: p + '33' }} />
      </div>
    </div>
  )
}

const MOCKUPS: Record<string, React.FC<MockupProps>> = {
  'newsletter':  MNewsletter,
  'campanha':    MCampanha,
  'simples':     MSimples,
  'hero-full':   MHeroFull,
  'multibloco':  MMultibloco,
  'anuncio':     MAnuncio,
  'boas-vindas': MBoasVindas,
  'produto':     MProduto,
  'texto-longo': MTextoLongo,
}

interface Props {
  template: Template
  bu: BU
  className?: string
}

export function TemplatePreview({ template, bu, className = '' }: Props) {
  const imageUrl = template.preview_urls[bu]
  const p  = BU_COLORS[bu] ?? '#00e7f9'
  const bg = BU_BG[bu]    ?? '#0a0e27'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={template.nome}
        className={`w-full h-full object-cover ${className}`}
      />
    )
  }

  const Mockup = MOCKUPS[template.id]

  if (Mockup) {
    return (
      <div className={`w-full h-full overflow-hidden ${className}`}>
        <Mockup p={p} bg={bg} />
      </div>
    )
  }

  return (
    <div className={`w-full h-full bg-zinc-900 flex items-center justify-center ${className}`}>
      <span className="text-xs text-muted-foreground opacity-50">sem preview</span>
    </div>
  )
}
