'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Prompt, BU } from '@/types'

interface PromptStore {
  prompts: Prompt[]
  addPrompt: (prompt: Omit<Prompt, 'id' | 'created_at'>) => Prompt
  removePrompt: (id: string) => void
  getByBU: (bu: BU) => Prompt[]
}

const PromptContext = createContext<PromptStore | null>(null)

const STORAGE_KEY = 'mktc_prompts'

function load(): Prompt[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Prompt[]) : []
  } catch {
    return []
  }
}

function save(prompts: Prompt[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts))
}

export function PromptStoreProvider({ children }: { children: React.ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>([])

  useEffect(() => {
    setPrompts(load())
  }, [])

  const addPrompt = useCallback((data: Omit<Prompt, 'id' | 'created_at'>): Prompt => {
    const prompt: Prompt = {
      ...data,
      id: `prompt-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    setPrompts(prev => {
      const next = [prompt, ...prev]
      save(next)
      return next
    })
    return prompt
  }, [])

  const removePrompt = useCallback((id: string) => {
    setPrompts(prev => {
      const next = prev.filter(p => p.id !== id)
      save(next)
      return next
    })
  }, [])

  const getByBU = useCallback((bu: BU) => prompts.filter(p => p.bu === bu), [prompts])

  return (
    <PromptContext.Provider value={{ prompts, addPrompt, removePrompt, getByBU }}>
      {children}
    </PromptContext.Provider>
  )
}

export function usePromptStore() {
  const ctx = useContext(PromptContext)
  if (!ctx) throw new Error('usePromptStore must be used inside PromptStoreProvider')
  return ctx
}
