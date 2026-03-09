'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getBrand } from '@/lib/brands/config'
import { useEmailStore } from '@/lib/store'
import { BU } from '@/types'
import { StatusPill } from '@/components/platform/status-pill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  SendIcon,
  MailOpenIcon,
  MousePointerClickIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  PlusIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  Loader2Icon,
  UserMinusIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DataviewStats {
  sends: number
  opens: number
  openRate: number
  clicks: number
  ctr: number
  bounces: number
  unsubscribes: number
}

const KPI_CONFIG = [
  { key: 'sends',        label: 'Envios',          icon: SendIcon,                  color: 'text-blue-400',    bg: 'bg-blue-900/20',    fmt: (v: number) => v.toLocaleString('pt-BR') },
  { key: 'opens',        label: 'Aberturas únicas', icon: MailOpenIcon,             color: 'text-emerald-400', bg: 'bg-emerald-900/20', fmt: (v: number) => v.toLocaleString('pt-BR') },
  { key: 'openRate',     label: 'Taxa de abertura', icon: TrendingUpIcon,           color: 'text-green-400',   bg: 'bg-green-900/20',   fmt: (v: number) => `${v}%` },
  { key: 'clicks',       label: 'Cliques únicos',   icon: MousePointerClickIcon,    color: 'text-cyan-400',    bg: 'bg-cyan-900/20',    fmt: (v: number) => v.toLocaleString('pt-BR') },
  { key: 'ctr',          label: 'CTR',              icon: TrendingUpIcon,           color: 'text-violet-400',  bg: 'bg-violet-900/20',  fmt: (v: number) => `${v}%` },
  { key: 'bounces',      label: 'Bounces',          icon: AlertTriangleIcon,        color: 'text-red-400',     bg: 'bg-red-900/20',     fmt: (v: number) => v.toLocaleString('pt-BR') },
] as const

const DAYS_OPTIONS = [7, 30, 90] as const

export default function DashboardPage() {
  const params = useParams()
  const bu = params.bu as BU
  const brand = getBrand(bu)
  const { getByBU } = useEmailStore()
  const emails = getByBU(bu)
  const agendados = emails.filter(e => e.status === 'agendado')

  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [stats, setStats] = useState<DataviewStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNote(null)
    try {
      const res = await fetch(`/api/${bu}/dataviews?days=${days}`, { cache: 'no-store' })
      const json = await res.json()
      console.log('[dashboard] API response:', JSON.stringify(json))
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar stats')
      setStats(json.data)
      if (json.note) setNote(json.note)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [bu, days])

  useEffect(() => { fetchStats() }, [fetchStats])

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

      {/* Performance Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Performance SFMC
            </h2>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Todos os envios do Grupo Primo</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              {DAYS_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`text-xs px-2.5 py-1 transition-colors ${
                    days === d
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchStats} disabled={loading}>
              {loading
                ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCwIcon className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {note && (
          <p className="text-xs text-muted-foreground bg-accent/20 border border-border rounded px-3 py-1.5">
            {note}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded px-3 py-1.5">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading && !stats
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border bg-card animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-3 bg-accent/40 rounded mb-3 w-3/4" />
                    <div className="h-7 bg-accent/40 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))
            : KPI_CONFIG.map(({ key, label, icon: Icon, color, bg, fmt }) => (
                <Card key={key} className="border-border bg-card hover:bg-accent/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                      <div className={`p-1 rounded-md ${bg}`}>
                        <Icon className={`w-3 h-3 ${color}`} />
                      </div>
                    </div>
                    <span className="text-2xl font-bold tabular-nums">
                      {stats ? fmt(stats[key as keyof DataviewStats] as number) : '—'}
                    </span>
                  </CardContent>
                </Card>
              ))}
        </div>
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
