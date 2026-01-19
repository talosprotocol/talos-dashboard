'use client'

import React, { useState } from 'react'
import { TalosLogo } from '@/components/ui/TalosLogo'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setSuccess(true)
    
    // Redirect after delay
    setTimeout(() => {
        router.push('/login')
    }, 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--success)] opacity-[0.05] blur-[120px] rounded-full" />
         <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent)] opacity-[0.05] blur-[120px] rounded-full" />
      </div>

      <GlassPanel className="w-full max-w-md p-8 relative z-10 border-white/5">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <TalosLogo width={48} height={48} />
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Create an account
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Enter your email below to create your account
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center animate-in fade-in zoom-in duration-300">
               <div className="w-12 h-12 rounded-full bg-[var(--success-glow)] flex items-center justify-center text-[var(--success)]">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
</svg>
               </div>
               <div className="space-y-2">
                 <h3 className="text-lg font-medium text-[var(--text-primary)]">Account verified</h3>
                 <p className="text-sm text-[var(--text-muted)]">
                    This is a mock signup. Redirecting you to login...
                    <br/>
                    (Please use the default admin credentials)
                 </p>
               </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium leading-none text-[var(--text-secondary)]" htmlFor="email">
                   Email Address
                 </label>
                 <input
                   className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-[var(--text-primary)]"
                   id="email"
                   type="email"
                   required
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium leading-none text-[var(--text-secondary)]" htmlFor="password">
                   Password
                 </label>
                 <input
                   className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-[var(--text-primary)]"
                   id="password"
                   type="password"
                   required
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium leading-none text-[var(--text-secondary)]" htmlFor="confirm">
                   Confirm Password
                 </label>
                 <input
                   className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-[var(--text-primary)]"
                   id="confirm"
                   type="password"
                   required
                 />
               </div>
            </div>

            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--text-primary)]/90 h-10 px-4 py-2 w-full"
              type="submit"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Sign Up
            </button>
          </form>
          )}

          <div className="text-center text-sm text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-[var(--text-primary)]">
              Sign in
            </Link>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
