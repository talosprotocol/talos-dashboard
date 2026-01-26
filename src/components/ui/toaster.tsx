"use client"

import { useToast } from "@/lib/hooks/use-toast"
import { Toast } from "./toast"
import { AnimatePresence } from "framer-motion"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-6 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
