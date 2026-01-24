'use client'

import React, { useActionState } from 'react'
import { TalosLogo } from '@/components/ui/TalosLogo'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { authenticate } from './action'
import { Loader2, Lock, Github, Chrome } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)] opacity-[0.05] blur-[120px] rounded-full" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent)] opacity-[0.05] blur-[120px] rounded-full" />
      </div>

      <GlassPanel className="w-full max-w-md p-8 relative z-10 border-white/5">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <TalosLogo width={48} height={48} />
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Welcome back
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Sign in to your security console
            </p>
          </div>

          <form action={dispatch} className="w-full space-y-4">
            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                   Email Address
                 </label>
                 <input
                   className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text-primary)]"
                   id="email"
                   type="email"
                   name="email"
                   placeholder="admin@talos.security"
                   required
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                   Password
                 </label>
                 <input
                   className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-black/20 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text-primary)]"
                   id="password"
                   type="password"
                   name="password"
                   placeholder="••••••••"
                   required
                 />
               </div>
            </div>

            {errorMessage && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {errorMessage}
              </div>
            )}

            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--text-primary)]/90 h-10 px-4 py-2 w-full"
              type="submit"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Sign In
            </button>
          </form>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--glass-border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg)] px-2 text-[var(--text-muted)] container-bg-hack">
                Or continue with
              </span>
            </div>
             {/* Hack: The glass panel has bg, so bg-background might not match. Using transparent or text-muted-foreground for text */}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              disabled
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[var(--glass-border)] bg-transparent hover:bg-[var(--glass-border)] h-10 px-4 py-2 w-full opacity-50 cursor-not-allowed"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </button>
             <button
              disabled
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[var(--glass-border)] bg-transparent hover:bg-[var(--glass-border)] h-10 px-4 py-2 w-full opacity-50 cursor-not-allowed"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </button>
          </div>

          <div className="text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline underline-offset-4 hover:text-[var(--text-primary)]">
              Sign up
            </Link>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
