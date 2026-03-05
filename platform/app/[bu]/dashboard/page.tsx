'use client'

import { useParams } from 'next/navigation'
import { getBrand } from '@/lib/brands/config'
import { useEmailStore } from '@/lib/store'
import { BU } from '@/types'
import { StatusPill } from '@/components/platform/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  FileTextIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  SendIcon,
  ArrowRightIcon,
  PlusIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DashboardPage() {
  const params = useParams()
  const bu = params.bu as BU
  const brand = getBrand(bu)
  const { getByBU } = useEmailStore()
  const emails = getByBU(bu)
  const agendados = emails.filter(e => e.status === 'agendado')
  const stats = {
    rascunho:  emails.filter(e => e.status === 'rascunho').length,
    aguardando: emails.filter(e => e.status === 'aguardando_aprovacao' || e.status === 'pendente').length,
    aprovado:  emails.filter(e => e.status === 'aprovado').length,
    agendado:  emails.filter(e => e.status === 'agendado').length,
    enviado:   emails.filter(e => e.status === 'enviado').length,
  }

  const KPI_CARDS = [
    { label: 'Rascunhos',    value: stats.rascunho,  icon: FileTextIcon,    color: 'text-zinc-400' },
    { label: 'Ag. aprovação',value: stats.aguardando, icon: ClockIcon,       color: 'text-orange-400' },
    { label: 'Aprovados',    value: stats.aprovado,   icon: CheckCircleIcon, color: 'text-emerald-400' },
    { label: 'Agendados',    value: stats.agendado,   icon: CalendarIcon,    color: 'text-blue-400' },
    { label: 'Enviados',     value: stats.enviado,    icon: SendIcon,        color: 'text-green-400' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{brand.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card hover:bg-accent/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-3xl font-bold">{value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fila ativa */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Fila ativa</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${bu}/fila`}>
              Ver tudo <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {emails.filter(e => e.status !== 'enviado').length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-4">Nenhum email na fila.</p>
          ) : (
            <div className="divide-y divide-border">
              {emails
                .filter(e => e.status !== 'enviado')
                .slice(0, 5)
                .map(email => (
                  <Link
                    key={email.id}
                    href={`/${bu}/fila/${email.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{email.nome}</p>
                      {email.data_envio && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(email.data_envio), "d MMM, HH'h'", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill status={email.status} />
                      <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos envios */}
      {agendados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Próximos envios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {agendados.map(email => (
                <Link
                  key={email.id}
                  href={`/${bu}/fila/${email.id}`}
                  className="shrink-0 p-3 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition-colors w-52"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {email.data_envio
                      ? format(new Date(email.data_envio), "d MMM, HH'h'mm", { locale: ptBR })
                      : '—'}
                  </p>
                  <p className="text-sm font-medium leading-tight">{email.nome}</p>
                  <div className="mt-2">
                    <StatusPill status={email.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
