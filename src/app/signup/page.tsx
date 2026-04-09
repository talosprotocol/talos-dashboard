'use client'

import React, { useState } from 'react'
import { TalosLogo } from '@/components/ui/TalosLogo'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Loader2, Shield } from 'lucide-react'
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
              Secure Onboarding
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Initialize your admin account with Passkeys
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center animate-in fade-in zoom-in duration-300">
               <div className="w-12 h-12 rounded-full bg-[var(--success-glow)] flex items-center justify-center text-[var(--success)]">
                  <Shield className="w-6 h-6" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-lg font-medium text-[var(--text-primary)]">Device Registered</h3>
                 <p className="text-sm text-[var(--text-muted)]">
                    Your passkey has been linked to the Postgres security store.
                    <br/>
                    Redirecting to login...
                 </p>
               </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    <strong>Note:</strong> Talos uses WebAuthn for first-class security. 
                    Ensure your <code>DATABASE_URL</code> is configured for persistence.
                </div>

                <button
                    onClick={handleSubmit}
                    className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 bg-[var(--accent)] text-white shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.5)] h-12 px-4 py-2 w-full"
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    Register Passkey
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[var(--bg)] px-2 text-[var(--text-muted)]">Or legacy fallback</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] text-[var(--text-primary)]"
                            id="email"
                            type="email"
                            placeholder="admin@talosprotocol.com"
                            required
                        />
                    </div>
                    <button
                        className="inline-flex items-center justify-center rounded-md text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 border border-white/10 hover:bg-white/5 h-10 px-4 py-2 w-full"
                        type="submit"
                        disabled={isPending}
                    >
                        Sign up with password
                    </button>
                </form>
            </div>
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
