"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Globe, Settings, FileCode, ShoppingCart, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/" },
  { icon: ShieldCheck, label: "UCP Policies", href: "/policies" },
  { icon: Globe, label: "Merchants", href: "/merchants" },
  { icon: ShoppingCart, label: "Transactions", href: "/transactions" },
  { icon: FileCode, label: "API Explorer", href: "/api-explorer" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-full border-r border-slate-800 bg-slate-950 flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Talos <span className="text-indigo-500">UCP</span></span>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                pathname === item.href
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent"
              )}
            >
              <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-indigo-400" : "text-slate-500")} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-900">
        <Link
          href="/help"
          className="flex items-center space-x-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-200"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Documentation</span>
        </Link>
      </div>
    </div>
  );
}
