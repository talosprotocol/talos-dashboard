// Thin re-export from contracts package
// Base64url logic is owned by contracts, dashboard imports only
//
// Note: Using relative path import for local development.
// In production, this should be: import from "@talosprotocol/contracts"

export {
    base64urlEncodeBytes as base64UrlEncode,
    base64urlDecodeToBytes as base64UrlDecodeToBytes,
    base64urlEncodeUtf8 as base64urlEncodeUtf8,
    base64urlDecodeToUtf8 as base64urlDecodeToUtf8,
} from "../../../../talos-contracts/typescript/dist/index.js";
