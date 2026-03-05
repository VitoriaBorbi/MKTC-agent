'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BU } from '@/types'
import {
  ArrowLeftIcon,
  UploadIcon,
  LinkIcon,
  CheckIcon,
  ZapIcon,
  ExpandIcon,
} from 'lucide-react'
import { toast } from 'sonner'

const LAYOUT_VARIANTS = [
  { id: 1, label: 'Estrutura equilibrada', desc: 'Hero + copy + CTA balanceados' },
  { id: 2, label: 'Hierarquia forte', desc: 'Headline dominante, copy menor' },
  { id: 3, label: 'CTA em destaque', desc: 'Botão grande e central como âncora' },
  { id: 4, label: 'Espaçamento limpo', desc: 'Respiração máxima, minimalista' },
]

export default function NovoLayoutPage() {
  const params = useParams()
  const router = useRouter()
  const bu = params.bu as BU

  const [step, setStep] = useState<'upload' | 'generating' | 'gallery'>('upload')
  const [refFile, setRefFile] = useState<File | null>(null)
  const [driveLink, setDriveLink] = useState('')
  const [campanhaName, setCampanhaName] = useState('')
  const [progresses, setProgresses] = useState([0, 0, 0, 0])
  const [selected, setSelected] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  async function handleGenerate() {
    if (!refFile && !driveLink) {
      toast.error('Selecione uma imagem de referência')
      return
    }
    setStep('generating')

    // Simulate 4 parallel generation progresses
    const intervals = [0, 1, 2, 3].map(i =>
      setInterval(() => {
        setProgresses(prev => {
          const next = [...prev]
          next[i] = Math.min(next[i] + Math.random() * 15, 100)
          return next
        })
      }, 300 + i * 100)
    )

    await new Promise(r => setTimeout(r, 5000))
    intervals.forEach(clearInterval)
    setProgresses([100, 100, 100, 100])
    setStep('gallery')
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Novo Layout</h1>
          <p className="text-sm text-muted-foreground">Gere 4 variações de layout a partir de uma referência visual</p>
        </div>
      </div>

      {/* UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome da campanha</label>
                <Input
                  placeholder="ex: Black Friday 2026"
                  value={campanhaName}
                  onChange={e => setCampanhaName(e.target.value)}
                />
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${refFile ? 'border-emerald-600 bg-emerald-950/20' : 'border-border hover:border-primary/50 hover:bg-accent/20'}`}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setRefFile(e.target.files?.[0] || null)} />
                {refFile ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(refFile)}
                      alt="Referência"
                      className="max-h-40 mx-auto rounded object-contain"
                    />
                    <p className="text-sm text-emerald-400 flex items-center justify-center gap-1">
                      <CheckIcon className="w-4 h-4" />
                      {refFile.name}
                    </p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <UploadIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Arraste uma imagem de referência ou clique para selecionar</p>
                    <p className="text-xs mt-1 opacity-60">PNG, JPG, WebP</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou link do Drive</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-2">
                <LinkIcon className="w-4 h-4 mt-2.5 text-muted-foreground shrink-0" />
                <Input
                  placeholder="https://drive.google.com/..."
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerate}
                className="w-full"
                disabled={!refFile && !driveLink}
              >
                <ZapIcon className="w-4 h-4 mr-2" />
                Gerar 4 variações
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GENERATING */}
      {step === 'generating' && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="text-center mb-2">
              <ZapIcon className="w-8 h-8 mx-auto mb-2 text-primary animate-pulse" />
              <p className="font-medium">Gerando variações de layout...</p>
              <p className="text-sm text-muted-foreground">A IA está criando 4 propostas diferentes</p>
            </div>
            {LAYOUT_VARIANTS.map((v, i) => (
              <div key={v.id} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{v.label}</span>
                  <span className="text-muted-foreground">{Math.round(progresses[i])}%</span>
                </div>
                <Progress value={progresses[i]} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* GALLERY */}
      {step === 'gallery' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">4 variações geradas</p>
              <p className="text-sm text-muted-foreground">Selecione uma para publicar no catálogo</p>
            </div>
            {selected !== null && (
              <Button
                onClick={() => {
                  toast.success('Layout publicado no catálogo!')
                  router.push(`/${bu}/catalogo`)
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckIcon className="w-4 h-4 mr-1.5" />
                Publicar no catálogo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LAYOUT_VARIANTS.map((v, i) => (
              <div
                key={v.id}
                className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${selected === i ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-border/80'}`}
                onClick={() => setSelected(i)}
              >
                {/* Placeholder preview */}
                <div className="aspect-video bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center relative">
                  <div className="text-center space-y-2 p-4">
                    <div className="h-3 bg-primary/40 rounded w-3/4 mx-auto" />
                    <div className="h-2 bg-zinc-600 rounded w-full" />
                    <div className="h-2 bg-zinc-600 rounded w-5/6 mx-auto" />
                    <div className="h-8 bg-primary/60 rounded w-1/2 mx-auto mt-3" />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setExpanded(i) }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded p-1 transition-colors"
                  >
                    <ExpandIcon className="w-3.5 h-3.5 text-white" />
                  </button>
                  {selected === i && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        Selecionado
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="text-xs text-muted-foreground">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
