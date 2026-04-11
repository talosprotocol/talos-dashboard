"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SettingsContent = dynamic(() => import('@/components/dashboard/SettingsContent'), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    )
});

export default function SettingsPage() {
    return <SettingsContent />;
}
