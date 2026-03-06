'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { BU } from '@/types'
import { usePromptStore } from '@/lib/prompt-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BookmarkIcon, PlusIcon, CopyIcon, TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PromptsPage() {
  const params = useParams()
  const bu = params.bu as BU
  const { getByBU, addPrompt, removePrompt } = usePromptStore()
  const prompts = getByBU(bu)

  const [novo, setNovo] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [conteudoNovo, setConteudoNovo] = useState('')

  function savePrompt() {
    if (!nomeNovo.trim() || !conteudoNovo.trim()) return
    addPrompt({ bu, nome: nomeNovo.trim(), conteudo: conteudoNovo.trim(), tags: [] })
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
          <p className="text-sm text-muted-foreground mt-0.5">
            Prompts salvos para reutilizar em novas gerações
          </p>
        </div>
        <Button size="sm" onClick={() => setNovo(true)}>
          <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
          Novo prompt
        </Button>
      </div>

      {novo && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Input
              placeholder="Nome do prompt..."
              value={nomeNovo}
              onChange={e => setNomeNovo(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Instrução para a IA / copy do email..."
              value={conteudoNovo}
              onChange={e => setConteudoNovo(e.target.value)}
              className="min-h-24 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setNovo(false); setNomeNovo(''); setConteudoNovo('') }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={savePrompt} disabled={!nomeNovo.trim() || !conteudoNovo.trim()}>
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {prompts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm space-y-2">
          <BookmarkIcon className="w-8 h-8 mx-auto opacity-30" />
          <p>Nenhum prompt salvo ainda.</p>
          <p className="text-xs">Salve prompts a partir de emails na fila ou crie manualmente acima.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map(p => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <BookmarkIcon className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-medium text-sm">{p.nome}</span>
                    {p.template_id && (
                      <span className="text-xs text-muted-foreground ml-2">· {p.template_id}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    title="Copiar"
                    onClick={() => { navigator.clipboard.writeText(p.conteudo); toast.success('Copiado!') }}
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Excluir"
                    onClick={() => removePrompt(p.id)}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {p.conteudo}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {p.tags.map(t => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(p.created_at), "d MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
