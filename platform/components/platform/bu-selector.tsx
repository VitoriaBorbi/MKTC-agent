'use client'

import { useRouter, useParams } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { BRANDS, BU_LIST } from '@/lib/brands/config'
import { BU } from '@/types'

const BU_COLORS: Record<BU, string> = {
  'finclass':       'bg-cyan-500',
  'bruno-perini':   'bg-lime-400',
  'faculdade-hub':  'bg-violet-500',
  'thiago-nigro':   'bg-amber-500',
  'portfel':        'bg-emerald-500',
  'grao':           'bg-orange-500',
}

function BUDot({ bu }: { bu: BU }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${BU_COLORS[bu]}`} />
}

export function BUSelector({ currentBU }: { currentBU: BU }) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 font-semibold text-sm h-8 px-3">
          <BUDot bu={currentBU} />
          {BRANDS[currentBU].name}
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {BU_LIST.map((bu) => (
          <DropdownMenuItem
            key={bu}
            onClick={() => router.push(`/${bu}/dashboard`)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <BUDot bu={bu} />
            {BRANDS[bu].name}
            {bu === currentBU && <span className="ml-auto text-xs text-muted-foreground">atual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
