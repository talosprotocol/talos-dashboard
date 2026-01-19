import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession();
    if (!session || !session.user) {
        return NextResponse.json({ authenticated: false, session }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user: session.user });
}
