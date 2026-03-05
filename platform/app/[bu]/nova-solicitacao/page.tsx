'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useEmailStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { MOCK_TEMPLATES } from '@/lib/mock-data'
import { BU } from '@/types'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UploadIcon,
  FileTextIcon,
  CheckIcon,
  ZapIcon,
  ImageIcon,
  LinkIcon,
  LayoutTemplateIcon,
} from 'lucide-react'
import { TemplatePreview } from '@/components/platform/template-preview'
import { toast } from 'sonner'

const STEPS = [
  { id: 1, label: 'Tipo' },
  { id: 2, label: 'Copy' },
  { id: 3, label: 'Refs' },
  { id: 4, label: 'Template' },
  { id: 5, label: 'Gerar' },
]

export default function NovaSolicitacaoPage() {
  const params = useParams()
  const router = useRouter()
  const bu = params.bu as BU
  const { addEmail } = useEmailStore()

  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState<'avulso' | 'campanha'>('avulso')
  const [nome, setNome] = useState('')
  const [campanhaId, setCampanhaId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [preheader, setPreheader] = useState('')
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [copyText, setCopyText] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([])
  const [templateId, setTemplateId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [generatedHTML, setGeneratedHTML] = useState('')

  const docxRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleImagesChange(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files)
    setImages(arr)
    const urls = await Promise.all(arr.map(fileToDataUrl))
    setImageDataUrls(urls)
  }

  function addLog(msg: string) {
    setLogs(prev => [...prev, msg])
  }

  async function handleGenerate() {
    setGenerating(true)
    setLogs([])
    setGeneratedHTML('')

    try {
      const form = new FormData()
      form.append('copyText', copyText || nome)
      form.append('assunto', assunto)
      form.append('preheader', preheader)
      form.append('templateId', templateId)

      // Send first reference image for visual DNA extraction
      if (imageDataUrls[0]) {
        form.append('refImage', imageDataUrls[0])
      }

      const res = await fetch(`/api/${bu}/generate`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`API error ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let html = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'log') {
              addLog(event.message)
            } else if (event.type === 'html_chunk') {
              html += event.chunk
              setGeneratedHTML(html)
            } else if (event.type === 'done') {
              setGeneratedHTML(event.html)
              toast.success('Email gerado com sucesso!')
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch {
            // ignore parse errors on partial lines
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na geração'
      addLog(`❌ ${msg}`)
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  function goNext() { if (step < 5) setStep(s => s + 1) }
  function goBack() { if (step > 1) setStep(s => s - 1) }

  function canProceed() {
    if (step === 1) return nome.trim().length > 0
    if (step === 2) return docxFile !== null || copyText.trim().length > 0
    if (step === 4) return templateId.length > 0
    return true
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Novo Email</h1>
          <p className="text-sm text-muted-foreground">Step {step} de {STEPS.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={(step / STEPS.length) * 100} className="h-1.5" />
        <div className="flex justify-between">
          {STEPS.map(s => (
            <span
              key={s.id}
              className={`text-xs ${s.id === step ? 'text-primary font-medium' : s.id < step ? 'text-emerald-500' : 'text-muted-foreground'}`}
            >
              {s.id < step && <CheckIcon className="w-3 h-3 inline mr-0.5" />}
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6 space-y-5">

          {/* STEP 1 — Tipo */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold mb-1">Que tipo de email é esse?</h2>
                <p className="text-sm text-muted-foreground">Emails avulsos são envios únicos. Campanhas agrupam N emails relacionados.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['avulso', 'campanha'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${tipo === t ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}
                  >
                    <p className="font-semibold capitalize">{t}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t === 'avulso' ? 'Um único disparo independente' : 'Série de emails de uma campanha'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome do email *</label>
                  <Input
                    placeholder="ex: VIT0001 Email Venda Vitalício"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                  />
                </div>
                {tipo === 'campanha' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">ID da campanha</label>
                    <Input
                      placeholder="ex: SSL0001"
                      value={campanhaId}
                      onChange={e => setCampanhaId(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — Copy */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold mb-1">Conteúdo do email</h2>
                <p className="text-sm text-muted-foreground">Envie o .docx com a copy ou cole o texto diretamente.</p>
              </div>

              <div
                onClick={() => docxRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${docxFile ? 'border-emerald-600 bg-emerald-950/20' : 'border-border hover:border-primary/50 hover:bg-accent/20'}`}
              >
                <input ref={docxRef} type="file" accept=".docx" className="hidden"
                  onChange={e => setDocxFile(e.target.files?.[0] || null)} />
                {docxFile ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <FileTextIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">{docxFile.name}</span>
                    <CheckIcon className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <UploadIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Toque para selecionar um .docx</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">ou cole o texto</span>
                <Separator className="flex-1" />
              </div>

              <Textarea
                placeholder="Cole aqui a copy do email..."
                value={copyText}
                onChange={e => setCopyText(e.target.value)}
                className="min-h-32 text-sm"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assunto</label>
                  <Input placeholder="Assunto do email" value={assunto} onChange={e => setAssunto(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pré-cabeçalho</label>
                  <Input placeholder="Texto de preview (opcional)" value={preheader} onChange={e => setPreheader(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Referências */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold mb-1">Referências visuais</h2>
                <p className="text-sm text-muted-foreground">Imagens que serão usadas no email. Pode pular se não tiver.</p>
              </div>

              <div
                onClick={() => imgRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/20 transition-colors"
              >
                <input ref={imgRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => handleImagesChange(e.target.files)} />
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Toque para selecionar imagens</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — múltiplos arquivos</p>
              </div>

              {imageDataUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imageDataUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={images[i]?.name}
                        className="h-20 w-20 object-cover rounded-md border border-border"
                      />
                      <button
                        onClick={() => {
                          setImages(prev => prev.filter((_, j) => j !== i))
                          setImageDataUrls(prev => prev.filter((_, j) => j !== i))
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-xs items-center justify-center hidden group-hover:flex"
                      >
                        ×
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 rounded-b-md">
                          Hero
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">ou link do Drive</span>
                <Separator className="flex-1" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Link do Google Drive</label>
                <div className="flex gap-2">
                  <LinkIcon className="w-4 h-4 mt-2.5 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="https://drive.google.com/..."
                    value={driveLink}
                    onChange={e => setDriveLink(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Template */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold mb-1">Escolha um template</h2>
                  <p className="text-sm text-muted-foreground">Layout base para o email.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/${bu}/novo-layout`)}>
                  <LayoutTemplateIcon className="w-3.5 h-3.5 mr-1.5" />
                  Criar novo
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOCK_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${templateId === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}
                  >
                    <div className="aspect-video rounded mb-2 overflow-hidden">
                      <TemplatePreview template={t} bu={bu} className="rounded" />
                    </div>
                    <p className="text-sm font-medium">{t.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.descricao}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 — Geração */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold mb-1">Gerar email</h2>
                <p className="text-sm text-muted-foreground">A IA vai gerar o HTML completo com base nas suas configurações.</p>
              </div>

              {!generating && logs.length === 0 && !generatedHTML && (
                <div className="text-center py-8 space-y-4">
                  {imageDataUrls.length > 0 && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground">Referência enviada pro Claude</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {imageDataUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={images[i]?.name}
                            className="h-24 w-24 object-cover rounded-md border border-border opacity-80"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <ZapIcon className="w-10 h-10 mx-auto text-primary opacity-70" />
                  <p className="text-sm text-muted-foreground">Pronto para gerar o email com Claude.</p>
                  <Button onClick={handleGenerate} size="lg">
                    <ZapIcon className="w-4 h-4 mr-2" />
                    Gerar email
                  </Button>
                </div>
              )}

              {(generating || logs.length > 0) && (
                <div className="space-y-4">
                  {/* Log */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Progresso</p>
                    <div className="bg-zinc-950 rounded-md p-3 font-mono text-xs space-y-1 min-h-24">
                      {logs.map((log, i) => (
                        <div key={i} className="flex items-center gap-2 text-emerald-400">
                          <CheckIcon className="w-3 h-3 shrink-0" />
                          {log}
                        </div>
                      ))}
                      {generating && (
                        <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                          <span className="w-3 h-3 shrink-0">⟳</span>
                          Processando...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  {generatedHTML && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                      <div className="bg-zinc-100 rounded-md overflow-hidden" style={{ height: '220px' }}>
                        <iframe
                          srcDoc={generatedHTML}
                          sandbox="allow-same-origin"
                          style={{ border: 'none', width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: 'top left' }}
                          title="Preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {generatedHTML && !generating && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      const saved = addEmail({
                        bu,
                        tipo,
                        nome,
                        status: 'rascunho',
                        assunto,
                        preheader,
                        html_content: generatedHTML,
                        template_id: templateId,
                      })
                      toast.success('Email salvo na fila!')
                      router.push(`/${bu}/fila/${saved.id}`)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <CheckIcon className="w-4 h-4 mr-1.5" />
                    Revisar e editar
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} disabled={step === 1}>
            <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
            Anterior
          </Button>
          <Button onClick={goNext} disabled={!canProceed()}>
            {step === 4 ? 'Ir para geração' : 'Próximo'}
            <ArrowRightIcon className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
