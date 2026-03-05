'use client'

import { Button } from '@/components/ui/button'
import { Trash2Icon } from 'lucide-react'

export function ClearCacheButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
      onClick={() => {
        localStorage.removeItem('mktc_emails')
        window.location.reload()
      }}
    >
      <Trash2Icon className="w-3 h-3 mr-1" />
      Limpar cache
    </Button>
  )
}
