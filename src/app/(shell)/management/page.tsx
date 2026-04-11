"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import ManagementContent from "@/components/dashboard/ManagementContent";

export default function ManagementPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return <ManagementContent />;
}
