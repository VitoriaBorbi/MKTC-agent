'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEmailStore } from '@/lib/store'
import { StatusPill } from '@/components/platform/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BU, EmailStatus } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SearchIcon, ArrowRightIcon, PlusIcon, Trash2Icon, CheckIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_FILTERS: { label: string; value: EmailStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Rascunho', value: 'rascunho' },
  { label: 'Ag. aprovação', value: 'aguardando_aprovacao' },
  { label: 'Aprovado', value: 'aprovado' },
  { label: 'Agendado', value: 'agendado' },
  { label: 'Enviado', value: 'enviado' },
]

export default function FilaPage() {
  const params = useParams()
  const bu = params.bu as BU
  const { getByBU, removeEmail } = useEmailStore()
  const emails = getByBU(bu)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'all'>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = emails.filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  function handleDeleteConfirm(id: string, nome: string) {
    removeEmail(id)
    setConfirmDeleteId(null)
    toast.success(`"${nome}" removido da fila.`)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Fila de envios</h1>
        <Button asChild size="sm">
          <Link href={`/${bu}/nova-solicitacao`}>
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            Novo Email
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <Badge
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum email encontrado.
          </div>
        ) : (
          filtered.map(email => (
            <div key={email.id} className="flex items-center hover:bg-accent/30 transition-colors group">
              {/* Main link area */}
              <Link
                href={`/${bu}/fila/${email.id}`}
                className="flex items-center justify-between px-5 py-3.5 flex-1 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-medium truncate">{email.nome}</p>
                    {email.tipo === 'campanha' && (
                      <Badge variant="outline" className="text-xs shrink-0">Campanha</Badge>
                    )}
                  </div>
                  {email.assunto && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{email.assunto}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {email.data_envio && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(email.data_envio), "d MMM, HH'h'", { locale: ptBR })}
                    </span>
                  )}
                  <StatusPill status={email.status} />
                  <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>

              {/* Delete area */}
              <div className="pr-3 shrink-0">
                {confirmDeleteId === email.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteConfirm(email.id, email.nome)}
                      className="h-7 w-7 flex items-center justify-center rounded text-red-400 hover:bg-red-900/30 transition-colors"
                      title="Confirmar exclusão"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-accent/40 transition-colors"
                      title="Cancelar"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(email.id)}
                    className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Excluir email"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
