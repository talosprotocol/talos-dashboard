// Thin re-export from @talosprotocol/contracts
// All cursor logic is owned by contracts, dashboard orchestrates only

export type {
    CursorValidationReason,
    CursorValidationResult,
    DecodedCursor,
} from "@talosprotocol/contracts";

export {
    deriveCursor,
    decodeCursor,
    compareCursor,
    assertCursorInvariant as validateCursor,
    isUuidV7,
} from "@talosprotocol/contracts";
