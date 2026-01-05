import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const SUBS_PATH = path.join(process.cwd(), "submodules");
const MANIFEST_PATH = path.join(
  SUBS_PATH,
  "talos-contracts",
  "examples_manifest.json",
);

// Taxonomy Error Codes
const ERR_MISSING_DEPENDENCY = "TALOS_MISSING_DEPENDENCY";
const ERR_INVALID_MANIFEST = "TALOS_INVALID_MANIFEST";

export async function GET() {
  try {
    // 1. Read Manifest File
    let fileContent: string;
    try {
      fileContent = await fs.readFile(MANIFEST_PATH, "utf-8");
    } catch (error) {
      console.error(`Failed to read manifest at ${MANIFEST_PATH}:`, error);
      return NextResponse.json(
        {
          code: ERR_MISSING_DEPENDENCY,
          details: {
            path: MANIFEST_PATH,
            reason: "Contracts submodule not initialized or manifest missing",
          },
        },
        { status: 500 },
      );
    }

    // 2. Parse JSON
    let manifest;
    try {
      manifest = JSON.parse(fileContent);
    } catch {
      return NextResponse.json(
        {
          code: ERR_INVALID_MANIFEST,
          details: { reason: "JSON parse failed" },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(manifest);
  } catch (error) {
    return NextResponse.json(
      { code: "TALOS_INTERNAL_ERROR", details: { message: String(error) } },
      { status: 500 },
    );
  }
}
