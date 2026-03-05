'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { getCampanhasByBU, getEmailsByBU } from '@/lib/mock-data'
import { useEmailStore } from '@/lib/store'
import { StatusPill } from '@/components/platform/status-pill'
import { AgendarModal, CampaignEmail, ScheduleResult } from '@/components/platform/agendar-modal'
import { BU } from '@/types'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRightIcon, FolderOpenIcon, CalendarIcon } from 'lucide-react'

export default function CampanhasPage() {
  const params = useParams()
  const bu = params.bu as BU
  const campanhas = getCampanhasByBU(bu)
  const mockEmails = getEmailsByBU(bu)
  const { getById, updateEmail } = useEmailStore()

  const [agendarCampanhaId, setAgendarCampanhaId] = useState<string | null>(null)

  // Build campaign emails list for the modal
  function getCampaignEmails(campanhaId: string): CampaignEmail[] {
    return mockEmails
      .filter(e => e.campanha_id === campanhaId)
      .map(e => {
        // Try to get latest version from store (has html_content)
        const stored = getById(e.id)
        return {
          id: e.id,
          nome: e.nome,
          assunto: (stored?.assunto ?? e.assunto) || '',
          html: stored?.html_content ?? e.html_content ?? '',
        }
      })
  }

  const activeCampanha = campanhas.find(c => c.id === agendarCampanhaId)
  const activeCampaignEmails = agendarCampanhaId ? getCampaignEmails(agendarCampanhaId) : []

  function handleAgendarConfirm(results: ScheduleResult[]) {
    for (const r of results) {
      updateEmail(r.id, { status: 'agendado', sfmc_send_id: r.esdId, sfmc_asset_id: r.emailId })
    }
    setAgendarCampanhaId(null)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-xl font-bold tracking-tight">Campanhas</h1>

      {campanhas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <FolderOpenIcon className="w-8 h-8 opacity-40" />
          <p className="text-sm">Nenhuma campanha criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanhas.map(campanha => {
            const campanhaEmails = mockEmails.filter(e => e.campanha_id === campanha.id)
            return (
              <Card key={campanha.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-2.5">
                    <FolderOpenIcon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{campanha.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground">{campanha.campanha_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{campanhaEmails.length} emails</Badge>
                    <StatusPill status={campanha.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setAgendarCampanhaId(campanha.id)}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Agendar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1.5">
                    {campanhaEmails.map(email => (
                      <Link
                        key={email.id}
                        href={`/${bu}/fila/${email.id}`}
                        className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/40 transition-colors"
                      >
                        <span className="text-sm">{email.nome}</span>
                        <div className="flex items-center gap-2">
                          <StatusPill status={email.status} />
                          <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {agendarCampanhaId && activeCampanha && (
        <AgendarModal
          bu={bu}
          emailNome={activeCampanha.nome}
          assunto=""
          html=""
          campaignEmails={activeCampaignEmails}
          onClose={() => setAgendarCampanhaId(null)}
          onConfirm={handleAgendarConfirm}
        />
      )}
    </div>
  )
}
