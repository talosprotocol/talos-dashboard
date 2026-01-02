// Thin re-export from contracts package
// All cursor logic is owned by contracts, dashboard orchestrates only
// 
// Note: Using relative path import for local development.
// In production, this should be: import from "@talosprotocol/contracts"

import type { CursorValidationResult as ContractsCursorValidationResult } from "../../../../talos-contracts/typescript/dist/index.js";

export type CursorValidationReason = "CURSOR_MISMATCH" | "INVALID_FRAME";

export type CursorValidationResult = ContractsCursorValidationResult;

export type DecodedCursor = { timestamp: number; event_id: string };

export {
    deriveCursor,
    decodeCursor,
    compareCursor,
    assertCursorInvariant as validateCursor,
    isUuidV7,
} from "../../../../talos-contracts/typescript/dist/index.js";
