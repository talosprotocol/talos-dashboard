// Thin re-export from @talos-protocol/contracts
// All cursor logic is owned by contracts, dashboard orchestrates only

export type {
    CursorValidationReason,
    CursorValidationResult,
    DecodedCursor,
} from "@talos-protocol/contracts";

export {
    deriveCursor,
    decodeCursor,
    compareCursor,
    assertCursorInvariant as validateCursor,
    isUuidV7,
} from "@talos-protocol/contracts";
