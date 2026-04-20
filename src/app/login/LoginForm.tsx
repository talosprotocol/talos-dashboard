'use client'

import React, { useState } from 'react'
import { TalosLogo } from '@/components/ui/TalosLogo'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Loader2, KeyRound, ArrowRight, ShieldCheck, LogIn } from 'lucide-react'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'bootstrap' | 'dev-login'>('login')
  const [bootstrapToken, setBootstrapToken] = useState('')

  async function handleDevLogin() {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      let result;
      const text = await res.text();
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`);
      }
      
      if (!res.ok) throw new Error(result.error || 'Login failed')

      // Success
      router.push('/console')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsPending(false)
    }
  }

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
      
      let options;
      const optionsText = await resOptions.text();
      try {
        options = JSON.parse(optionsText);
      } catch {
        throw new Error(`Server returned non-JSON response. This usually means the database is unavailable. Use Dev Login instead.`);
      }
      
      if (!resOptions.ok) throw new Error(options.error || 'Failed to get auth options')

      // 2. Browser Prompt
      const authResp = await startAuthentication(options)

      // 3. Verify
      const resVerify = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp }),
      })
      
      let verifyResult;
      const verifyText = await resVerify.text();
      try {
        verifyResult = JSON.parse(verifyText);
      } catch {
        throw new Error(`Verification returned non-JSON response. Database may be unavailable.`);
      }
      
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
        
        let options;
        const optionsText = await resOptions.text();
        try {
          options = JSON.parse(optionsText);
        } catch {
          throw new Error(`Server returned non-JSON response. Database may be unavailable.`);
        }
        
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
        
        let verifyResult;
        const verifyText = await resVerify.text();
        try {
          verifyResult = JSON.parse(verifyText);
        } catch {
          throw new Error(`Verification returned non-JSON response. Database may be unavailable.`);
        }
        
        if (!resVerify.ok) throw new Error(verifyResult.error || 'Bootstrap verification failed');

        router.push('/console');
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Bootstrap failed');
    } finally {
        setIsPending(false);
    }
  }

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
              {mode === 'login' ? 'Security Console' : mode === 'bootstrap' ? 'Initial Setup' : 'Dev Login'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {mode === 'login' ? 'Authenticate with your secure passkey' 
                : mode === 'bootstrap' ? 'Bootstrap admin access' 
                : 'Sign in with admin credentials'}
            </p>
          </div>

          <div className="w-full space-y-4">
            
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {error}
              </div>
            )}

            {mode === 'dev-login' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-muted)]">Email</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                    type="email"
                    placeholder="admin@talosprotocol.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-muted)]">Password</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email && password) {
                        handleDevLogin();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleDevLogin}
                  disabled={isPending || !email || !password}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 h-11 px-4 py-2 w-full shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In
                </button>
                <p className="text-xs text-center text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded p-2">
                  ⚠ Dev-mode login. For production, use Passkey authentication.
                </p>
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

          <div className="flex flex-col items-center gap-2 text-xs text-[var(--text-muted)]">
            {mode === 'dev-login' && (
              <>
                <button onClick={() => setMode('login')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Passkey Login
                </button>
                <button onClick={() => setMode('bootstrap')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Setup Admin Access
                </button>
              </>
            )}
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('dev-login')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Dev Login (Email/Password)
                </button>
                <button onClick={() => setMode('bootstrap')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Setup Admin Access
                </button>
              </>
            )}
            {mode === 'bootstrap' && (
              <>
                <button onClick={() => setMode('dev-login')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Dev Login (Email/Password)
                </button>
                <button onClick={() => setMode('login')} className="hover:text-[var(--text-primary)] underline underline-offset-4">
                    Back to Passkey Login
                </button>
              </>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
