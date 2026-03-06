'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BU } from '@/types'
import { XIcon, PlusIcon, CalendarIcon, Loader2Icon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { toast } from 'sonner'

// ─── Static config ────────────────────────────────────────────────────────────

/** CB folders where the email asset will be stored, per BU. '' = use BU default */
const EMAIL_FOLDERS: Record<BU, { id: string; label: string }[]> = {
  'finclass': [
    { id: '',       label: 'Padrão da BU' },
    { id: '275176', label: 'Email' },
    { id: '275626', label: 'Campanha' },
    { id: '275234', label: 'Outros (avulsos)' },
  ],
  'bruno-perini':  [{ id: '', label: 'Padrão da BU' }],
  'faculdade-hub': [{ id: '', label: 'Padrão da BU' }],
  'thiago-nigro':  [{ id: '', label: 'Padrão da BU' }],
  'portfel':       [{ id: '', label: 'Padrão da BU' }],
  'grao':          [{ id: '', label: 'Padrão da BU' }],
}

const SEND_CLASSIFICATIONS: Record<BU, { id: string; label: string }[]> = {
  'finclass':      [{ id: '84', label: 'Equipe Finclass' }, { id: '85', label: 'Finclass Transacional' }],
  'bruno-perini':  [{ id: '1', label: 'Bruno Perini' }],
  'faculdade-hub': [{ id: '1', label: 'Faculdade Hub' }],
  'thiago-nigro':  [{ id: '1', label: 'Thiago Nigro' }],
  'portfel':       [{ id: '1', label: 'Portfel' }],
  'grao':          [{ id: '1', label: 'Grão' }],
}

const COMMON_DES: Record<BU, string[]> = {
  'finclass':      ['tb_assinantes_recentes', 'SSL0001_Assinantes', 'SSL0001_Leads_Manual', 'SSL0001_Leads_SMS', 'testes_vitoria'],
  'bruno-perini':  ['subscribers_bp'],
  'faculdade-hub': ['subscribers_hub'],
  'thiago-nigro':  ['subscribers_tn'],
  'portfel':       ['subscribers_portfel'],
  'grao':          ['subscribers_grao'],
}

const EXCL_DES: Record<BU, string[]> = {
  'finclass':      ['Tb_CP_Email', 'Tb_CP_TodasComunicacoes'],
  'bruno-perini':  [],
  'faculdade-hub': [],
  'thiago-nigro':  [],
  'portfel':       [],
  'grao':          [],
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampaignEmail {
  id: string
  nome: string
  assunto: string
  html: string
}

export interface ScheduleResult {
  id: string
  esdId: string
  emailId: string
}

interface Props {
  bu: BU
  emailNome: string
  assunto: string
  html: string
  /** Provide all campaign emails (including the current one) to enable campaign mode */
  campaignEmails?: CampaignEmail[]
  onClose: () => void
  onConfirm: (results: ScheduleResult[]) => void
}

// ─── DE Tags sub-component ────────────────────────────────────────────────────

function DEList({
  bu,
  list,
  setList,
  suggestions,
  placeholder,
  disabled,
  id,
}: {
  bu: BU
  list: string[]
  setList: (v: string[]) => void
  suggestions: string[]
  placeholder: string
  disabled: boolean
  id: string
}) {
  const [input, setInput] = useState('')

  function add(value: string) {
    if (value && !list.includes(value)) setList([...list, value])
    setInput('')
  }

  function remove(value: string) {
    setList(list.filter(d => d !== value))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
          className="h-8 text-sm flex-1"
          list={id}
          disabled={disabled}
        />
        <datalist id={id}>
          {suggestions.map(d => <option key={d} value={d} />)}
        </datalist>
        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" disabled={disabled}
          onClick={() => add(input)}>
          <PlusIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map(de => (
          <Badge key={de} variant="secondary" className="text-xs gap-1">
            {de}
            <button onClick={() => remove(de)} disabled={disabled}>
              <XIcon className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgendarModal({ bu, emailNome, assunto, html, campaignEmails, onClose, onConfirm }: Props) {
  const isCampaign = (campaignEmails?.length ?? 0) > 1

  // Dynamic send classifications — load from SFMC, fall back to static list
  const [sendClassOptions, setSendClassOptions] = useState<{ id: string; label: string }[]>(
    SEND_CLASSIFICATIONS[bu] || []
  )
  const [loadingClassifications, setLoadingClassifications] = useState(false)

  useEffect(() => {
    setLoadingClassifications(true)
    fetch(`/api/${bu}/send-classifications`)
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSendClassOptions(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingClassifications(false))
  }, [bu])

  // Global settings
  const [sendClass, setSendClass] = useState(SEND_CLASSIFICATIONS[bu][0]?.id || '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [trackingFolder, setTrackingFolder] = useState('')

  // Global DEs (used for single email mode OR as default in campaign mode)
  const [desEnvio, setDesEnvio] = useState<string[]>(COMMON_DES[bu].slice(0, 1))
  const [desExclusao, setDesExclusao] = useState<string[]>(EXCL_DES[bu])

  // Campaign per-email DEs
  const [usePerEmailDEs, setUsePerEmailDEs] = useState(false)
  const [emailDEsMap, setEmailDEsMap] = useState<Record<string, { envio: string[]; exclusao: string[] }>>(() => {
    if (!campaignEmails) return {}
    return Object.fromEntries(
      campaignEmails.map(e => [e.id, { envio: COMMON_DES[bu].slice(0, 1), exclusao: EXCL_DES[bu] }])
    )
  })
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const canConfirm = date && time && sendClass && desEnvio.length > 0

  function updateEmailDEs(emailId: string, key: 'envio' | 'exclusao', value: string[]) {
    setEmailDEsMap(prev => ({
      ...prev,
      [emailId]: { ...prev[emailId], [key]: value },
    }))
  }

  async function scheduleOne(params: {
    nome: string; assunto: string; html: string
    desEnvio: string[]; desExclusao: string[]
  }) {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bu,
        nome: params.nome,
        assunto: params.assunto,
        html: params.html,
        sendClassificationId: sendClass,
        desEnvio: params.desEnvio,
        desExclusao: params.desExclusao,
        sendDate: date,
        sendTime: time,
        trackingFolderId: trackingFolder || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Erro desconhecido ao agendar')
    return data as { esdId: string; emailId: string }
  }

  async function handleConfirm() {
    if (!canConfirm || loading) return
    setLoading(true)
    setProgress(0)

    try {
      // Determine which emails to schedule
      const emailsToSchedule: CampaignEmail[] = campaignEmails ?? [
        { id: '_single', nome: emailNome, assunto, html }
      ]
      const total = emailsToSchedule.length
      const results: ScheduleResult[] = []

      for (let i = 0; i < emailsToSchedule.length; i++) {
        const email = emailsToSchedule[i]
        const des = (usePerEmailDEs && campaignEmails)
          ? emailDEsMap[email.id] ?? { envio: desEnvio, exclusao: desExclusao }
          : { envio: desEnvio, exclusao: desExclusao }

        const data = await scheduleOne({
          nome: email.nome,
          assunto: email.assunto,
          html: email.html,
          desEnvio: des.envio,
          desExclusao: des.exclusao,
        })
        results.push({ id: email.id, esdId: data.esdId, emailId: data.emailId })
        setProgress(Math.round(((i + 1) / total) * 100))
      }

      toast.success(total > 1
        ? `${total} emails agendados com sucesso!`
        : `Agendado! ESD: ${results[0].esdId}`
      )
      onConfirm(results)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Falha no agendamento: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  function utcPreview() {
    if (!date || !time) return ''
    const dt = new Date(`${date}T${time}:00-03:00`)
    return dt.toISOString().slice(0, 19) + 'Z'
  }

  return (
    <Dialog open onOpenChange={loading ? undefined : onClose}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {isCampaign ? 'Agendar campanha' : 'Agendar envio'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {isCampaign ? `${campaignEmails!.length} emails` : emailNome}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Remetente */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Remetente
              {loadingClassifications && <span className="text-xs text-muted-foreground ml-2">(carregando...)</span>}
            </label>
            <Select value={sendClass} onValueChange={setSendClass} disabled={loading}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {sendClassOptions.map(sc => (
                  <SelectItem key={sc.id} value={sc.id}>{sc.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data e horário */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0]
            const now = new Date()
            const pad = (n: number) => String(n).padStart(2, '0')
            const minTime = date === todayStr
              ? `${pad(now.getHours())}:${pad(now.getMinutes())}`
              : undefined
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data (BRT)</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    min={todayStr}
                    className="h-9"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Horário (BRT)</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    min={minTime}
                    className="h-9"
                    disabled={loading}
                  />
                </div>
              </div>
            )
          })()}

          {/* Pasta do email no CB */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pasta no Content Builder</label>
            <Select value={trackingFolder} onValueChange={setTrackingFolder} disabled={loading}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione a pasta..." />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_FOLDERS[bu].map(f => (
                  <SelectItem key={f.id || '__default'} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pasta onde o email criado vai aparecer no Email Studio.
            </p>
          </div>

          {/* DEs — modo único ou global de campanha */}
          {(!isCampaign || !usePerEmailDEs) && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">DEs de Envio</label>
                <DEList
                  bu={bu}
                  list={desEnvio}
                  setList={setDesEnvio}
                  suggestions={COMMON_DES[bu]}
                  placeholder="Nome da DE..."
                  disabled={loading}
                  id="des-envio-global"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">DEs de Exclusão</label>
                <DEList
                  bu={bu}
                  list={desExclusao}
                  setList={setDesExclusao}
                  suggestions={EXCL_DES[bu]}
                  placeholder="Nome da DE..."
                  disabled={loading}
                  id="des-excl-global"
                />
              </div>
            </>
          )}

          {/* Campaign per-email toggle */}
          {isCampaign && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Configuração de DEs</label>
                <button
                  onClick={() => setUsePerEmailDEs(v => !v)}
                  disabled={loading}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    usePerEmailDEs
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:border-border/60'
                  }`}
                >
                  {usePerEmailDEs ? 'Por email ✓' : 'Mesmo para todos'}
                </button>
              </div>

              {usePerEmailDEs && (
                <div className="space-y-2">
                  {campaignEmails!.map(email => {
                    const isOpen = expandedEmail === email.id
                    const emailDEs = emailDEsMap[email.id] ?? { envio: desEnvio, exclusao: desExclusao }
                    return (
                      <div key={email.id} className="border border-border rounded-md overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent/20 transition-colors"
                          onClick={() => setExpandedEmail(isOpen ? null : email.id)}
                          disabled={loading}
                        >
                          <span className="text-sm font-medium truncate">{email.nome}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {emailDEs.envio.length} envio · {emailDEs.exclusao.length} excl
                            </span>
                            {isOpen
                              ? <ChevronUpIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              : <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            }
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3 bg-accent/5">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">DEs de Envio</label>
                              <DEList
                                bu={bu}
                                list={emailDEs.envio}
                                setList={v => updateEmailDEs(email.id, 'envio', v)}
                                suggestions={COMMON_DES[bu]}
                                placeholder="Nome da DE..."
                                disabled={loading}
                                id={`des-envio-${email.id}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">DEs de Exclusão</label>
                              <DEList
                                bu={bu}
                                list={emailDEs.exclusao}
                                setList={v => updateEmailDEs(email.id, 'exclusao', v)}
                                suggestions={EXCL_DES[bu]}
                                placeholder="Nome da DE..."
                                disabled={loading}
                                id={`des-excl-${email.id}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          {canConfirm && (
            <div className="bg-accent/30 rounded-md p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Resumo do disparo</p>
              <p>Horário SFMC (UTC): {utcPreview()}</p>
              {!usePerEmailDEs && <>
                <p>Envio para: {desEnvio.join(', ')}</p>
                {desExclusao.length > 0 && <p>Excluindo: {desExclusao.join(', ')}</p>}
              </>}
              {isCampaign && <p>{campaignEmails!.length} emails · {usePerEmailDEs ? 'DEs individuais' : 'DEs iguais para todos'}</p>}
              {trackingFolder && <p>Tracking folder: {trackingFolder}</p>}
            </div>
          )}

          {/* Progress bar during campaign scheduling */}
          {loading && (campaignEmails?.length ?? 0) > 1 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Agendando emails...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-accent rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {loading ? (
              <>
                <Loader2Icon className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                {isCampaign ? `Agendar ${campaignEmails!.length} emails` : 'Confirmar agendamento'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
