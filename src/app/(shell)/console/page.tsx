"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import ConsoleContent from "@/components/dashboard/ConsoleContent";

export default function ConsolePage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return <ConsoleContent />;
}
