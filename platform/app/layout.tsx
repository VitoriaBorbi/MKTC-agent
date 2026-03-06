import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { EmailStoreProvider } from '@/lib/store'
import { PromptStoreProvider } from '@/lib/prompt-store'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MKTC Platform',
  description: 'Email marketing platform — Grupo Primo',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <EmailStoreProvider>
          <PromptStoreProvider>
            {children}
          </PromptStoreProvider>
        </EmailStoreProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
