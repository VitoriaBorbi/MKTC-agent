'use client'

import { BU, Template } from '@/types'

const LAYOUT_MOCKUPS: Record<string, React.FC<{ primary: string }>> = {
  'full-hero': ({ primary }) => (
    <div className="w-full h-full flex flex-col gap-1.5 p-2">
      <div className="w-full rounded flex-[3] flex items-center justify-center" style={{ background: primary + '22' }}>
        <div className="w-8 h-8 rounded opacity-40" style={{ background: primary }} />
      </div>
      <div className="w-3/4 h-2 rounded bg-foreground/20" />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-1/2 h-6 rounded mx-auto mt-1" style={{ background: primary + '99' }} />
    </div>
  ),
  'text-first': ({ primary }) => (
    <div className="w-full h-full flex flex-col gap-1.5 p-2 pt-3">
      <div className="w-2/3 h-3 rounded bg-foreground/30" />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-5/6 h-1.5 rounded bg-foreground/10" />
      <div className="w-full h-1.5 rounded bg-foreground/10 mt-1" />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-4/5 h-1.5 rounded bg-foreground/10" />
      <div className="w-1/3 h-5 rounded mt-2" style={{ background: primary + '99' }} />
    </div>
  ),
  'side-image': ({ primary }) => (
    <div className="w-full h-full flex gap-2 p-2">
      <div className="flex-1 rounded flex items-center justify-center" style={{ background: primary + '22' }}>
        <div className="w-6 h-6 rounded opacity-40" style={{ background: primary }} />
      </div>
      <div className="flex-[1.5] flex flex-col justify-center gap-1.5">
        <div className="w-full h-2 rounded bg-foreground/30" />
        <div className="w-full h-1.5 rounded bg-foreground/10" />
        <div className="w-4/5 h-1.5 rounded bg-foreground/10" />
        <div className="w-2/3 h-5 rounded mt-1" style={{ background: primary + '99' }} />
      </div>
    </div>
  ),
  'multi-block': ({ primary }) => (
    <div className="w-full h-full flex flex-col gap-1.5 p-2">
      <div className="w-full h-8 rounded" style={{ background: primary + '22' }} />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="flex gap-1.5 flex-1">
        <div className="flex-1 rounded bg-foreground/10" />
        <div className="flex-1 rounded bg-foreground/10" />
      </div>
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-1/2 h-5 rounded mx-auto" style={{ background: primary + '99' }} />
    </div>
  ),
  'minimal': ({ primary }) => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
      <div className="w-1/2 h-2 rounded bg-foreground/30" />
      <div className="w-full h-1.5 rounded bg-foreground/10" />
      <div className="w-4/5 h-1.5 rounded bg-foreground/10" />
      <div className="w-1/3 h-5 rounded mt-2" style={{ background: primary + '99' }} />
    </div>
  ),
  'announcement': ({ primary }) => (
    <div className="w-full h-full flex flex-col gap-1.5 p-2">
      <div className="w-full h-2 rounded" style={{ background: primary }} />
      <div className="w-full flex-1 rounded flex flex-col items-center justify-center gap-1.5 border border-dashed border-foreground/20">
        <div className="w-2/3 h-3 rounded bg-foreground/30" />
        <div className="w-1/2 h-1.5 rounded bg-foreground/10" />
        <div className="w-1/3 h-6 rounded mt-1" style={{ background: primary + 'cc' }} />
      </div>
    </div>
  ),
}

const BU_COLORS: Record<BU, string> = {
  'finclass':       '#00e7f9',
  'bruno-perini':   '#b2ec05',
  'faculdade-hub':  '#7c3aed',
  'thiago-nigro':   '#f59e0b',
  'portfel':        '#10b981',
  'grao':           '#d97706',
}

interface Props {
  template: Template
  bu: BU
  className?: string
}

export function TemplatePreview({ template, bu, className = '' }: Props) {
  const imageUrl = template.preview_urls[bu]
  const primary = BU_COLORS[bu]
  const Mockup = LAYOUT_MOCKUPS[template.id]

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={template.nome}
        className={`w-full h-full object-cover ${className}`}
      />
    )
  }

  if (Mockup) {
    return (
      <div className={`w-full h-full bg-zinc-900 ${className}`}>
        <Mockup primary={primary} />
      </div>
    )
  }

  return (
    <div className={`w-full h-full bg-zinc-900 flex items-center justify-center ${className}`}>
      <span className="text-xs text-muted-foreground opacity-50">sem preview</span>
    </div>
  )
}
