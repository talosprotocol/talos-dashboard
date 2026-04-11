"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import SecretsContent from "@/components/admin/SecretsContent";

export default function SecretsPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return <SecretsContent />;
}
