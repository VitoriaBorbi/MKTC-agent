'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BUSelector } from './bu-selector'
import { Separator } from '@/components/ui/separator'
import { PlusIcon, LayoutTemplateIcon, ZapIcon } from 'lucide-react'
import { BU } from '@/types'
import { ClearCacheButton } from './clear-cache-button'

export function Topbar() {
  const params = useParams()
  const bu = (params?.bu as BU) || 'finclass'

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50 flex items-center px-4 gap-3">
      {/* Logo */}
      <Link href={`/${bu}/dashboard`} className="flex items-center gap-2 mr-2">
        <ZapIcon className="w-5 h-5 text-primary" />
        <span className="font-bold text-sm tracking-tight">MKTC Platform</span>
      </Link>

      <Separator orientation="vertical" className="h-5" />

      {/* BU Selector */}
      <BUSelector currentBU={bu} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions — desktop only */}
      <nav className="hidden md:flex items-center gap-2">
        <ClearCacheButton />
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${bu}/catalogo`}>
            <LayoutTemplateIcon className="w-4 h-4 mr-1.5" />
            Catálogo
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm">
          <Link href={`/${bu}/novo-layout`}>
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            Novo Layout
          </Link>
        </Button>

        <Button asChild size="sm">
          <Link href={`/${bu}/nova-solicitacao`}>
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            Novo Email
          </Link>
        </Button>
      </nav>
    </header>
  )
}
