'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { BU } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BookmarkIcon, PlusIcon, CopyIcon, TrashIcon } from 'lucide-react'
import { toast } from 'sonner'

const MOCK_PROMPTS = [
  {
    id: '1',
    nome: 'Email de venda vitalício',
    conteudo: 'Gere um email de vendas com urgência e escassez para uma oferta vitalícia. Tom premium, focado nos benefícios de longo prazo.',
    tags: ['vendas', 'urgência', 'vitalício'],
  },
  {
    id: '2',
    nome: 'Newsletter educativa',
    conteudo: 'Crie um email no estilo newsletter com conteúdo educativo sobre finanças pessoais. Tom amigável e didático.',
    tags: ['newsletter', 'educação', 'finanças'],
  },
]

export default function PromptsPage() {
  const params = useParams()
  const bu = params.bu as BU

  const [prompts, setPrompts] = useState(MOCK_PROMPTS)
  const [novo, setNovo] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [conteudoNovo, setConteudoNovo] = useState('')

  function savePrompt() {
    if (!nomeNovo || !conteudoNovo) return
    setPrompts(p => [...p, { id: Date.now().toString(), nome: nomeNovo, conteudo: conteudoNovo, tags: [] }])
    setNomeNovo('')
    setConteudoNovo('')
    setNovo(false)
    toast.success('Prompt salvo!')
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Biblioteca de Prompts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Prompts salvos para reutilizar em novas gerações</p>
        </div>
        <Button size="sm" onClick={() => setNovo(true)}>
          <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
          Novo prompt
        </Button>
      </div>

      {novo && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Input placeholder="Nome do prompt..." value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} />
            <Textarea
              placeholder="Instrução para a IA..."
              value={conteudoNovo}
              onChange={e => setConteudoNovo(e.target.value)}
              className="min-h-24 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setNovo(false)}>Cancelar</Button>
              <Button size="sm" onClick={savePrompt}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {prompts.map(p => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <BookmarkIcon className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{p.nome}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => { navigator.clipboard.writeText(p.conteudo); toast.success('Copiado!') }}>
                  <CopyIcon className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setPrompts(prev => prev.filter(x => x.id !== p.id))}>
                  <TrashIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{p.conteudo}</p>
              <div className="flex gap-1.5 mt-2">
                {p.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
