"use client";

import { Bell, Search, User, Zap } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center flex-1 max-w-md bg-slate-900 border border-slate-800 rounded-full px-4 py-2 hover:border-indigo-500/50 transition-colors">
        <Search className="w-4 h-4 text-slate-500 mr-3" />
        <input 
          type="text" 
          placeholder="Search merchants, policies, transactions..." 
          className="bg-transparent border-none outline-none text-sm text-slate-300 w-full placeholder:text-slate-600"
        />
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Gateway Active
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-950"></span>
        </button>

        <div className="h-8 w-px bg-slate-800 mx-2"></div>

        <div className="flex items-center space-x-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-200">Admin User</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Talos Platform</p>
          </div>
        </div>
      </div>
    </header>
  );
}
