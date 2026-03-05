'use client'

import { useParams } from 'next/navigation'
import { getEmailsByBU } from '@/lib/mock-data'
import { StatusPill } from '@/components/platform/status-pill'
import { BU } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SendIcon, ExternalLinkIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function HistoricoPage() {
  const params = useParams()
  const bu = params.bu as BU
  const sent = getEmailsByBU(bu).filter(e => e.status === 'enviado' || e.status === 'agendado')

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Histórico de envios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{sent.length} registros</p>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {sent.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum envio registrado ainda.
          </div>
        ) : (
          sent.map(email => (
            <div key={email.id} className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SendIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{email.nome}</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {email.data_envio && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(email.data_envio), "d MMM yyyy, HH'h'mm", { locale: ptBR })}
                    </span>
                  )}
                  {email.sfmc_asset_id && (
                    <Badge variant="outline" className="text-xs">CB #{email.sfmc_asset_id}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <StatusPill status={email.status} />
                {email.sfmc_send_id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
