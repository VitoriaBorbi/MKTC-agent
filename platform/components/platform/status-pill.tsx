'use client'

import { Badge } from '@/components/ui/badge'
import { EmailStatus } from '@/types'

const STATUS_CONFIG: Record<EmailStatus, { label: string; className: string }> = {
  rascunho:            { label: 'Rascunho',           className: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  pendente:            { label: 'Pendente',            className: 'bg-yellow-950 text-yellow-300 border-yellow-800' },
  aguardando_aprovacao:{ label: 'Aguardando aprovação',className: 'bg-orange-950 text-orange-300 border-orange-800' },
  aprovado:            { label: 'Aprovado',            className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  agendado:            { label: 'Agendado',            className: 'bg-blue-950 text-blue-300 border-blue-800' },
  enviado:             { label: 'Enviado',             className: 'bg-green-950 text-green-300 border-green-800' },
  erro:                { label: 'Erro',                className: 'bg-red-950 text-red-300 border-red-800' },
}

export function StatusPill({ status }: { status: EmailStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  )
}
