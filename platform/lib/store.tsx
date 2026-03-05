'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Email, BU, EmailStatus } from '@/types'
import { MOCK_EMAILS } from './mock-data'

interface EmailStore {
  emails: Email[]
  addEmail: (email: Omit<Email, 'id' | 'created_at' | 'updated_at'>) => Email
  updateEmail: (id: string, patch: Partial<Email>) => void
  updateStatus: (id: string, status: EmailStatus) => void
  removeEmail: (id: string) => void
  getByBU: (bu: BU) => Email[]
  getById: (id: string) => Email | undefined
}

const StoreContext = createContext<EmailStore | null>(null)

const STORAGE_KEY = 'mktc_emails'

function loadFromStorage(): Email[] {
  if (typeof window === 'undefined') return MOCK_EMAILS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return MOCK_EMAILS
    const parsed: Email[] = JSON.parse(raw)
    // Merge: mock IDs that aren't in storage + stored emails
    const storedIds = new Set(parsed.map(e => e.id))
    const seedMocks = MOCK_EMAILS.filter(e => !storedIds.has(e.id))
    return [...seedMocks, ...parsed]
  } catch {
    return MOCK_EMAILS
  }
}

function saveToStorage(emails: Email[]) {
  if (typeof window === 'undefined') return
  // Only persist non-mock emails (ids not in MOCK_EMAILS) + status changes to mock emails
  const mockIds = new Set(MOCK_EMAILS.map(e => e.id))
  const toStore = emails.filter(e => !mockIds.has(e.id))
  // Also store mock emails if they've been mutated
  const mutatedMocks = emails.filter(e => {
    if (!mockIds.has(e.id)) return false
    const original = MOCK_EMAILS.find(m => m.id === e.id)
    return original && original.status !== e.status
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...toStore, ...mutatedMocks]))
}

export function EmailStoreProvider({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS)

  // Hydrate from localStorage after mount
  useEffect(() => {
    setEmails(loadFromStorage())
  }, [])

  const addEmail = useCallback((data: Omit<Email, 'id' | 'created_at' | 'updated_at'>): Email => {
    const now = new Date().toISOString()
    const email: Email = {
      ...data,
      id: `user-${Date.now()}`,
      created_at: now,
      updated_at: now,
    }
    setEmails(prev => {
      const next = [email, ...prev]
      saveToStorage(next)
      return next
    })
    return email
  }, [])

  const updateEmail = useCallback((id: string, patch: Partial<Email>) => {
    setEmails(prev => {
      const next = prev.map(e =>
        e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e
      )
      saveToStorage(next)
      return next
    })
  }, [])

  const updateStatus = useCallback((id: string, status: EmailStatus) => {
    updateEmail(id, { status })
  }, [updateEmail])

  const removeEmail = useCallback((id: string) => {
    setEmails(prev => {
      const next = prev.filter(e => e.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  const getByBU = useCallback((bu: BU) => emails.filter(e => e.bu === bu), [emails])

  const getById = useCallback((id: string) => emails.find(e => e.id === id), [emails])

  return (
    <StoreContext.Provider value={{ emails, addEmail, updateEmail, updateStatus, removeEmail, getByBU, getById }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useEmailStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useEmailStore must be used inside EmailStoreProvider')
  return ctx
}
