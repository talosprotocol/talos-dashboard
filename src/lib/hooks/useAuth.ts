"use client";

import { dataSource, UserProfile } from "@/lib/data/DataSource";
import { useEffect, useState } from "react";

export function useAuth() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUser() {
            try {
                const profile = await dataSource.getMe();
                setUser(profile);
            } catch (err) {
                console.error("Failed to fetch user profile", err);
                setError("Failed to load user profile");
            } finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, []);

    return { user, loading, error };
}
