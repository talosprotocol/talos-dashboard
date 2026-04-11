"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return <LoginForm />;
}
