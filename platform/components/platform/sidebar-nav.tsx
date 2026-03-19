'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboardIcon,
  InboxIcon,
  FolderOpenIcon,
  GridIcon,
  HistoryIcon,
  BookmarkIcon,
  PaletteIcon,
  DatabaseIcon,
  GitBranchIcon,
} from 'lucide-react'
import { BU } from '@/types'

const NAV_ITEMS = [
  { label: 'Dashboard',   icon: LayoutDashboardIcon, href: 'dashboard' },
  { label: 'Fila',        icon: InboxIcon,            href: 'fila' },
  { label: 'Campanhas',   icon: FolderOpenIcon,       href: 'campanhas' },
  { label: 'Jornadas',    icon: GitBranchIcon,        href: 'jornadas' },
  { label: 'Catálogo',    icon: GridIcon,             href: 'catalogo' },
  { label: 'Histórico',   icon: HistoryIcon,          href: 'historico' },
]

const CONFIG_ITEMS = [
  { label: 'Prompts',     icon: BookmarkIcon,         href: 'config/prompts' },
  { label: 'Marca',       icon: PaletteIcon,          href: 'config/marca' },
  { label: 'DEs',         icon: DatabaseIcon,         href: 'config/des' },
]

export function SidebarNav() {
  const params = useParams()
  const pathname = usePathname()
  const bu = (params?.bu as BU) || 'finclass'

  function isActive(href: string) {
    return pathname.includes(`/${bu}/${href}`)
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border h-full flex flex-col py-4 gap-1 px-2">
      <div className="px-2 mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Principal</p>
      </div>
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
        <Link
          key={href}
          href={`/${bu}/${href}`}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
            isActive(href)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}

      <div className="px-2 mt-4 mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Config</p>
      </div>
      {CONFIG_ITEMS.map(({ label, icon: Icon, href }) => (
        <Link
          key={href}
          href={`/${bu}/${href}`}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
            isActive(href)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </aside>
  )
}
