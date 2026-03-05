'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MOCK_TEMPLATES } from '@/lib/mock-data'
import { BU } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { SearchIcon, PlusIcon } from 'lucide-react'
import { TemplatePreview } from '@/components/platform/template-preview'
import Link from 'next/link'

export default function CatalogoPage() {
  const params = useParams()
  const router = useRouter()
  const bu = params.bu as BU

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const allTags = Array.from(new Set(MOCK_TEMPLATES.flatMap(t => t.tags)))

  const filtered = MOCK_TEMPLATES.filter(t => {
    const matchSearch = t.nome.toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || t.tags.includes(tagFilter)
    return matchSearch && matchTag
  })

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Catálogo de Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{MOCK_TEMPLATES.length} templates disponíveis</p>
        </div>
        <Button asChild size="sm">
          <Link href={`/${bu}/novo-layout`}>
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            Novo Layout
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={!tagFilter ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setTagFilter('')}
          >
            Todos
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={tagFilter === tag ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(t => (
          <Card key={t.id} className="overflow-hidden hover:border-primary/50 transition-colors group">
            <div className="aspect-video relative overflow-hidden">
              <TemplatePreview template={t} bu={bu} className="absolute inset-0" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/${bu}/nova-solicitacao`)}
                >
                  Usar template
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="font-medium text-sm">{t.nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.descricao}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
