import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionData = await validateRequest();
    
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      user: sessionData.user,
      expires: sessionData.session.expiresAt
    });
  } catch (error) {
    console.error("[api/auth/session] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
