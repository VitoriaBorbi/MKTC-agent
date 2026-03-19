'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BU } from '@/types'
import {
  ZapIcon,
  UploadIcon,
  CheckIcon,
  ExternalLinkIcon,
  CopyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  GitBranchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface Step {
  id: number
  name: string
  delay: number
  delayUnit: string
  subject: string
  preheader: string
  copyText: string
  template: string
}

interface CreatedEmail {
  name: string
  assetId: number
}

type Phase = 'briefing' | 'analyzing' | 'review' | 'creating' | 'done'

const SFMC_JB_URL = 'https://mc.exacttarget.com/cloud/#app/Journey%20Builder/journeys'

export default function JornadasPage() {
  const params = useParams()
  const bu = params.bu as BU

  const [phase, setPhase] = useState<Phase>('briefing')

  // Briefing form
  const [journeyName, setJourneyName] = useState('')
  const [briefing, setBriefing] = useState('')
  const [mapImage, setMapImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Generated data
  const [steps, setSteps] = useState<Step[]>([])
  const [journeyDescription, setJourneyDescription] = useState('')
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  // Result
  const [createdEmails, setCreatedEmails] = useState<CreatedEmail[]>([])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setMapImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (!journeyName.trim() || !briefing.trim()) return
    setPhase('analyzing')
    try {
      const res = await fetch('/api/journey/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bu, name: journeyName, briefing, image: mapImage || '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao analisar jornada')
      const j = data.data as { description?: string; steps?: Step[] }
      setJourneyDescription(j.description || '')
      setSteps((j.steps || []).map((s: Step) => ({ ...s, copyText: s.copyText || '' })))
      setExpandedStep(null)
      setPhase('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(msg)
      setPhase('briefing')
    }
  }

  async function handleCreate() {
    setPhase('creating')
    try {
      // Generate HTML for each step
      const stepsWithHtml: (Step & { html: string })[] = []
      for (const step of steps) {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bu,
            copyText: step.copyText,
            assunto: step.subject,
            preheader: step.preheader,
            templateId: step.template || 'full-hero',
            emailNome: step.name,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(`Erro ao gerar HTML do email "${step.name}": ${data.error}`)
        stepsWithHtml.push({ ...step, html: data.html })
      }

      // Create in Content Builder
      const res = await fetch('/api/journey/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bu,
          name: journeyName,
          description: journeyDescription,
          steps: stepsWithHtml.map(s => ({
            id: s.id,
            name: s.name,
            delay: s.delay,
            delayUnit: s.delayUnit,
            subject: s.subject,
            preheader: s.preheader,
            html: s.html,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao criar emails no CB')
      setCreatedEmails(data.emails || [])
      setPhase('done')
      toast.success(`${data.emails?.length || 0} emails criados no Content Builder!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(msg)
      setPhase('review')
    }
  }

  function updateStep(id: number, patch: Partial<Step>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function copyId(id: number) {
    navigator.clipboard.writeText(String(id))
    toast.success('ID copiado!')
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <GitBranchIcon className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Jornadas</h1>
          <p className="text-sm text-muted-foreground">Gere os emails da jornada e configure no Journey Builder</p>
        </div>
      </div>

      {/* ── BRIEFING ── */}
      {phase === 'briefing' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome da jornada *</label>
              <Input
                placeholder="ex: Onboarding Finclass Premium"
                value={journeyName}
                onChange={e => setJourneyName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Briefing *</label>
              <Textarea
                placeholder="Descreva o objetivo da jornada, o público, quantos emails, os intervalos, o tom e qualquer instrução específica..."
                value={briefing}
                onChange={e => setBriefing(e.target.value)}
                className="min-h-32 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Mapa visual da jornada (opcional)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${mapImage ? 'border-emerald-600 bg-emerald-950/20' : 'border-border hover:border-primary/50 hover:bg-accent/20'}`}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {mapImage ? (
                  <div className="space-y-2">
                    <img src={mapImage} alt="Mapa" className="max-h-32 mx-auto rounded object-contain" />
                    <p className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5" /> Imagem carregada
                    </p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <UploadIcon className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Upload do mapa de jornada (PNG, JPG)</p>
                    <p className="text-xs mt-1 opacity-60">A IA vai usar como referência para estruturar os emails</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              className="w-full"
              disabled={!journeyName.trim() || !briefing.trim()}
            >
              <ZapIcon className="w-4 h-4 mr-2" />
              Analisar com IA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── ANALYZING ── */}
      {phase === 'analyzing' && (
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="font-medium">Analisando jornada...</p>
              <p className="text-sm text-muted-foreground mt-1">A IA está estruturando os emails e copiando o conteúdo</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── REVIEW ── */}
      {phase === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{journeyName}</p>
              {journeyDescription && (
                <p className="text-sm text-muted-foreground">{journeyDescription}</p>
              )}
            </div>
            <Badge variant="outline">{steps.length} emails</Badge>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isOpen = expandedStep === step.id
              return (
                <Card key={step.id} className="overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                    onClick={() => setExpandedStep(isOpen ? null : step.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {idx === 0 ? 'Envio imediato' : `+${step.delay} ${step.delayUnit === 'hours' ? 'h' : 'd'} desde o anterior`}
                          {' · '}{step.subject}
                        </p>
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronUpIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDownIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 bg-accent/5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Assunto</label>
                          <Input
                            value={step.subject}
                            onChange={e => updateStep(step.id, { subject: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Pré-cabeçalho</label>
                          <Input
                            value={step.preheader}
                            onChange={e => updateStep(step.id, { preheader: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Delay</label>
                          <div className="flex gap-1">
                            <Input
                              type="number" min={0}
                              value={step.delay}
                              onChange={e => updateStep(step.id, { delay: Number(e.target.value) })}
                              className="h-8 text-sm w-20"
                            />
                            <select
                              value={step.delayUnit}
                              onChange={e => updateStep(step.id, { delayUnit: e.target.value })}
                              className="h-8 text-sm border border-input rounded-md px-2 bg-background"
                            >
                              <option value="days">dias</option>
                              <option value="hours">horas</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Template</label>
                          <select
                            value={step.template}
                            onChange={e => updateStep(step.id, { template: e.target.value })}
                            className="h-8 text-sm border border-input rounded-md px-2 w-full bg-background"
                          >
                            {['full-hero','text-first','side-image','multi-block','minimal','announcement'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Copy</label>
                        <Textarea
                          value={step.copyText}
                          onChange={e => updateStep(step.id, { copyText: e.target.value })}
                          className="text-sm min-h-24"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          <div className="flex gap-2 justify-between">
            <Button variant="outline" onClick={() => setPhase('briefing')}>
              Editar briefing
            </Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <ZapIcon className="w-4 h-4 mr-1.5" />
              Gerar e criar no Content Builder
            </Button>
          </div>
        </div>
      )}

      {/* ── CREATING ── */}
      {phase === 'creating' && (
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="font-medium">Criando emails no Content Builder...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Gerando HTML e fazendo upload de {steps.length} emails
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="space-y-4">
          <Card className="border-emerald-600/30 bg-emerald-950/10">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckIcon className="w-5 h-5 text-emerald-400" />
                <p className="font-semibold text-emerald-400">
                  {createdEmails.length} emails criados no Content Builder
                </p>
              </div>

              <div className="space-y-2 mb-5">
                {createdEmails.map((email, idx) => (
                  <div
                    key={email.assetId}
                    className="flex items-center justify-between bg-background rounded-md px-3 py-2 border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm truncate">{email.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">ID: {email.assetId}</span>
                      <button
                        onClick={() => copyId(email.assetId)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar ID"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-950/30 border border-amber-600/30 rounded-md p-3 space-y-2">
                <p className="text-sm font-medium text-amber-400">Próximo passo: configurar no Journey Builder</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Abra o Journey Builder no SFMC</li>
                  <li>Crie uma nova jornada chamada <span className="font-medium text-foreground">"{journeyName}"</span></li>
                  <li>Adicione as atividades de email usando os asset IDs acima</li>
                  <li>Configure os delays entre cada atividade conforme o briefing</li>
                </ol>
              </div>

              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => window.open(SFMC_JB_URL, '_blank')}
              >
                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                Abrir Journey Builder no SFMC
              </Button>
            </CardContent>
          </Card>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setPhase('briefing')
              setJourneyName('')
              setBriefing('')
              setMapImage(null)
              setSteps([])
              setCreatedEmails([])
            }}
          >
            Criar nova jornada
          </Button>
        </div>
      )}
    </div>
  )
}
