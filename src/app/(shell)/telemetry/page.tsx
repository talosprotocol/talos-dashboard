"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import TelemetryContent from "@/components/dashboard/TelemetryContent";

export default function TelemetryPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return <TelemetryContent />;
}
