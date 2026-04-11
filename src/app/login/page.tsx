'use client'

export const dynamic = 'force-dynamic'

import React, { useState, Suspense, useEffect } from 'react'
import { TalosLogo } from '@/components/ui/TalosLogo'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Loader2, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login')
  const [bootstrapToken, setBootstrapToken] = useState('')

  useEffect(() => { setMounted(true); }, [])

  async function handlePasskeyLogin(useEmail: boolean) {
    setIsPending(true)
    setError(null)
    try {
      // 1. Get Options
      const resOptions = await fetch('/api/auth/webauthn/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useEmail ? { email } : {}),
      })
      const options = await resOptions.json()
      if (!resOptions.ok) throw new Error(options.error || 'Failed to get auth options')

      // 2. Browser Prompt
      const authResp = await startAuthentication(options)

      // 3. Verify
      const resVerify = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp }),
      })
      const verifyResult = await resVerify.json()
      
      if (!resVerify.ok) throw new Error(verifyResult.error || 'Verification failed')

      // Success
      router.push('/console')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsPending(false)
    }
  }

  async function handleBootstrap() {
    setIsPending(true)
    setError(null)
    try {
        // 1. Get Registration Options
        const resOptions = await fetch('/api/auth/webauthn/register/options', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Talos-Bootstrap-Token': bootstrapToken
            },
            body: JSON.stringify({}),
        });
        const options = await resOptions.json();
        if (!resOptions.ok) throw new Error(options.error || 'Bootstrapping failed');

        // 2. Create Passkey
        const attResp = await startRegistration(options);

        // 3. Verify
        const resVerify = await fetch('/api/auth/webauthn/register/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Talos-Bootstrap-Token': bootstrapToken
            },
            body: JSON.stringify(attResp),
        });
        const verifyResult = await resVerify.json();
        if (!resVerify.ok) throw new Error(verifyResult.error || 'Bootstrap verification failed');

        router.push('/console');
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Bootstrap failed');
    } finally {
        setIsPending(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)] opacity-[0.05] blur-[120px] rounded-full" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent)] opacity-[0.05] blur-[120px] rounded-full" />
      </div>

      <GlassPanel className="w-full max-w-md p-8 relative z-10 border-white/5">
        <div className="flex flex-col items-center space-y-8">
          <div className="flex flex-col items-center space-y-2">
            <TalosLogo width={48} height={48} />
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {mode === 'login' ? 'Security Console' : 'Initial Setup'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {mode === 'login' ? 'Authenticate with your secure passkey' : 'Bootstrap admin access'}
            </p>
          </div>

          <div className="w-full space-y-4">
            
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {error}
              </div>
            )}

            {mode === 'login' && (
                <>
                <button
                onClick={() => handlePasskeyLogin(false)}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 h-11 px-4 py-2 w-full shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
                >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Sign in with Passkey
                </button>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[var(--glass-border)]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0A0A0A] px-2 text-[var(--text-muted)]">
                        Or enter account email
                    </span>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <input
                    className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text-primary)]"
                    placeholder="admin@talosprotocol.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && email) {
                            handlePasskeyLogin(true);
                        }
                    }}
                    />
                    <button
                    onClick={() => handlePasskeyLogin(true)}
                    disabled={isPending || !email}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[var(--glass-border)] hover:bg-[var(--glass-border)] h-10 px-3"
                    >
                    <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
                </>
            )}

            {mode === 'bootstrap' && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Bootstrap Token</label>
                        <input
                            className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] font-mono"
                            type="password"
                            placeholder="TALOS_BOOTSTRAP_TOKEN"
                            value={bootstrapToken}
                            onChange={(e) => setBootstrapToken(e.target.value)}
                        />
                    </div>
                     <button
                        onClick={handleBootstrap}
                        disabled={isPending || !bootstrapToken}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-black hover:bg-white/90 h-10 px-4 py-2 w-full"
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Register Admin Device
                    </button>
                </div>
            )}
            
          </div>

          <div className="text-center text-xs text-[var(--text-muted)]">
            {mode === 'login' ? (
                <button onClick={() => setMode('bootstrap')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Setup Admin Access
                </button>
            ) : (
                <button onClick={() => setMode('login')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Back to Login
                </button>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
    }>
        <LoginForm />
    </Suspense>
  )
}
