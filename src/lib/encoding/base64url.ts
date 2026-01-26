// Thin re-export from @talos-protocol/contracts
// Base64url logic is owned by contracts, dashboard imports only

export {
    base64urlEncodeBytes as base64UrlEncode,
    base64urlDecodeToBytes as base64UrlDecodeToBytes,
    base64urlEncodeUtf8 as base64urlEncodeUtf8,
    base64urlDecodeToUtf8 as base64urlDecodeToUtf8,
} from "@talos-protocol/contracts";
