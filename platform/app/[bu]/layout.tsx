'use client'

import { useState } from 'react'
import { Topbar } from '@/components/platform/topbar'
import { SidebarNav } from '@/components/platform/sidebar-nav'
import { MobileNav } from '@/components/platform/mobile-nav'

export default function BULayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <SidebarNav />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background pb-20 md:pb-6">
          {children}
        </main>
      </div>
      {/* Bottom nav — mobile only */}
      <MobileNav />
    </div>
  )
}
