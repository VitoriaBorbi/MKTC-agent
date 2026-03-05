'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEmailStore } from '@/lib/store'
import { StatusPill } from '@/components/platform/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BU } from '@/types'
import { ArrowLeftIcon, CheckIcon, MonitorIcon, SmartphoneIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AgendarModal } from '@/components/platform/agendar-modal'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0e27;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:20px 0;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0a0e27;padding:24px;text-align:center;">
          <img src="https://image.mkt.finclass.com/lib/fe3715707564047f7c1579/m/1/logo-finclass-branco.png" width="180" alt="Finclass" />
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h1 style="color:#0a0e27;font-size:28px;margin:0 0 16px;">Bem-vindo à Finclass!</h1>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Sua jornada para a liberdade financeira começa agora.
          </p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#00e7f9;border-radius:6px;padding:14px 32px;">
              <a href="#" style="color:#0a0e27;font-weight:bold;text-decoration:none;font-size:16px;">Começar agora</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#0a0e27;padding:24px;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0;">© 2026 Finclass. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

export default function EmailDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bu = params.bu as BU
  const emailId = params.id as string

  const { getById, updateEmail, updateStatus } = useEmailStore()
  const email = getById(emailId)

  const [assunto, setAssunto] = useState(email?.assunto || '')
  const [preheader, setPreheader] = useState(email?.preheader || '')
  const [html, setHtml] = useState(email?.html_content || SAMPLE_HTML)

  // Sync when store hydrates from localStorage (runs after first render)
  useEffect(() => {
    if (email?.html_content) setHtml(email.html_content)
    if (email?.assunto) setAssunto(email.assunto)
    if (email?.preheader) setPreheader(email.preheader)
  }, [email?.id])
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [showAgendar, setShowAgendar] = useState(false)

  if (!email) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Email não encontrado.
      </div>
    )
  }

  function handleCopyHTML() {
    navigator.clipboard.writeText(html)
    toast.success('HTML copiado!')
  }

  function handleSave() {
    updateEmail(emailId, { assunto, preheader, html_content: html })
    toast.success('Alterações salvas!')
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 shrink-0">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-semibold truncate">{email.nome}</h1>
            <StatusPill status={email.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSave} className="hidden sm:flex">
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyHTML} className="hidden sm:flex">
            <CopyIcon className="w-3.5 h-3.5 mr-1.5" />
            HTML
          </Button>
          <Button
            size="sm"
            onClick={() => {
              updateEmail(emailId, { assunto, preheader, html_content: html, status: 'aguardando_aprovacao' })
              setShowAgendar(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
            Aprovar
          </Button>
        </div>
      </div>

      {/* Assunto / Preheader */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
          <Input
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            placeholder="Assunto do email..."
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pré-cabeçalho</label>
          <Input
            value={preheader}
            onChange={e => setPreheader(e.target.value)}
            placeholder="Texto de pré-visualização..."
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Editor + Preview — stacked on mobile, side-by-side on desktop */}
      <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-8 w-full md:w-auto self-start">
          <TabsTrigger value="preview" className="text-xs flex-1 md:flex-none">Preview</TabsTrigger>
          <TabsTrigger value="visual" className="text-xs flex-1 md:flex-none">Visual</TabsTrigger>
          <TabsTrigger value="html" className="text-xs flex-1 md:flex-none">HTML</TabsTrigger>
        </TabsList>

        {/* PREVIEW TAB */}
        <TabsContent value="preview" className="flex-1 flex flex-col mt-2 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Preview do email</span>
            <div className="flex items-center gap-1">
              <Button
                variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                size="icon" className="h-7 w-7"
                onClick={() => setViewport('desktop')}
              >
                <MonitorIcon className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                size="icon" className="h-7 w-7"
                onClick={() => setViewport('mobile')}
              >
                <SmartphoneIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 border border-border rounded-md bg-zinc-100 flex justify-center p-3 overflow-auto min-h-[400px]">
            <iframe
              srcDoc={html}
              sandbox="allow-same-origin allow-popups"
              style={{
                width: viewport === 'desktop' ? '600px' : '375px',
                minHeight: '500px',
                border: 'none',
                background: 'white',
                borderRadius: '4px',
                flexShrink: 0,
              }}
              title="Email preview"
            />
          </div>
        </TabsContent>

        {/* VISUAL TAB */}
        <TabsContent value="visual" className="mt-2">
          <div className="space-y-3">
            {[
              { label: 'Hero', desc: 'Imagem e headline principal' },
              { label: 'Corpo', desc: 'Parágrafos e conteúdo' },
              { label: 'CTA', desc: 'Botão de chamada para ação' },
              { label: 'Rodapé', desc: 'Footer e links legais' },
            ].map(section => (
              <div
                key={section.label}
                className="border border-border rounded-md p-3 hover:bg-accent/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.desc}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Editar</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* HTML TAB */}
        <TabsContent value="html" className="mt-2 flex-1 flex flex-col min-h-0">
          <div className="border border-border rounded-md overflow-hidden" style={{ height: '420px' }}>
            <MonacoEditor
              language="html"
              theme="vs-dark"
              value={html}
              onChange={v => setHtml(v || '')}
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={handleCopyHTML}>
              <CopyIcon className="w-3.5 h-3.5 mr-1.5" />
              Copiar HTML
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {showAgendar && (
        <AgendarModal
          bu={bu}
          emailNome={email.nome}
          assunto={assunto}
          html={html}
          onClose={() => setShowAgendar(false)}
          onConfirm={results => {
            const r = results[0]
            if (r) updateEmail(emailId, { status: 'agendado', sfmc_send_id: r.esdId, sfmc_asset_id: r.emailId })
            setShowAgendar(false)
            router.push(`/${bu}/fila`)
          }}
        />
      )}
    </div>
  )
}
