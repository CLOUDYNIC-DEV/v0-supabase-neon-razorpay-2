'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DashboardHeaderProps {
  userName?: string
}

export default function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-foreground text-background border-b-4 border-foreground p-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold hover:underline">
          CLOUDYNIC
        </Link>
        <div className="flex items-center gap-6">
          {userName && <span className="text-sm">Welcome, {userName.split('@')[0]}</span>}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-bold bg-background text-foreground border-2 border-background hover:bg-foreground hover:text-background transition-all"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  )
}
