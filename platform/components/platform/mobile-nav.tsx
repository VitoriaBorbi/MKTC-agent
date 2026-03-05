'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboardIcon,
  InboxIcon,
  GridIcon,
  PlusIcon,
  HistoryIcon,
} from 'lucide-react'
import { BU } from '@/types'

export function MobileNav() {
  const params = useParams()
  const pathname = usePathname()
  const bu = (params?.bu as BU) || 'finclass'

  const items = [
    { label: 'Dashboard', icon: LayoutDashboardIcon, href: `/${bu}/dashboard` },
    { label: 'Fila',      icon: InboxIcon,            href: `/${bu}/fila` },
    { label: 'Novo',      icon: PlusIcon,             href: `/${bu}/nova-solicitacao`, primary: true },
    { label: 'Catálogo',  icon: GridIcon,             href: `/${bu}/catalogo` },
    { label: 'Histórico', icon: HistoryIcon,          href: `/${bu}/historico` },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(({ label, icon: Icon, href, primary }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors',
                primary
                  ? 'text-background'
                  : active
                    ? 'text-primary'
                    : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center rounded-full transition-all',
                primary ? 'bg-primary w-10 h-10' : 'w-6 h-6'
              )}>
                <Icon className={cn('w-5 h-5', primary ? 'text-background' : '')} />
              </div>
              <span className={cn('text-xs', primary ? 'text-primary font-medium' : '')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
