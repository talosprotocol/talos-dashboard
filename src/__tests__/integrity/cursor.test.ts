import { describe, it, expect } from "vitest";
import { deriveCursor, validateCursor } from "../../lib/integrity/cursor";
import { AuditEvent } from "../../lib/data/schemas";

// Valid UUIDv7 for testing (version 7, variant 8-b)
const VALID_UUID_V7 = "0190a5e0-7c3a-7000-8000-000000000001";
const VALID_UUID_V7_2 = "0190a5e0-7c3a-7000-8000-000000000002";

describe("Cursor Integrity (v3.2 Frozen)", () => {

    // Test Vector 1: Basic Derivation with UUIDv7
    it("should derive correct base64url cursor for standard inputs", () => {
        const timestamp = 1700000000;
        const eventId = VALID_UUID_V7;

        const cursor = deriveCursor(timestamp, eventId);

        // Manual verification:
        // "1700000000:0190a5e0-7c3a-7000-8000-000000000001" -> Buffer -> Base64URL
        const manual = Buffer.from(`${timestamp}:${eventId}`).toString('base64url');
        expect(cursor).toBe(manual);
    });

    // Test Vector 2: Validation Success with UUIDv7
    it("should validate a correct cursor", () => {
        const event: AuditEvent = {
            schema_version: "1",
            event_id: VALID_UUID_V7,
            timestamp: 1234567890,
            cursor: deriveCursor(1234567890, VALID_UUID_V7),
            event_type: "SESSION",
            outcome: "OK",
            session_id: "s1",
            correlation_id: "c1",
            agent_id: "a1",
            peer_id: "p1",
            tool: "t1",
            method: "m1",
            hashes: {},
            integrity: {
                proof_state: "VERIFIED",
                signature_state: "VALID",
                anchor_state: "NOT_ENABLED",
                verifier_version: "1.0"
            },
            metadata: {}
        };

        const result = validateCursor(event);
        expect(result.ok).toBe(true);
        expect(result.derived).toBe(event.cursor);
    });

    // Test Vector 3: Cursor Mismatch (tampered cursor)
    it("should detect CURSOR_MISMATCH on tampered cursor", () => {
        // Create valid cursor for one event, then assign to different event
        const correctCursor = deriveCursor(1234567890, VALID_UUID_V7);
        const event: AuditEvent = {
            schema_version: "1",
            event_id: VALID_UUID_V7_2, // Different event ID
            timestamp: 1234567890,
            cursor: correctCursor, // Cursor from different event
            event_type: "SESSION",
            outcome: "OK",
            session_id: "s1",
            correlation_id: "c1",
            agent_id: "a1",
            peer_id: "p1",
            tool: "t1",
            method: "m1",
            hashes: {},
            integrity: {
                proof_state: "VERIFIED",
                signature_state: "VALID",
                anchor_state: "NOT_ENABLED",
                verifier_version: "1.0"
            },
            metadata: {}
        };

        const result = validateCursor(event);
        expect(result).toMatchObject({
            ok: false,
            reason: "CURSOR_MISMATCH"
        });
        expect(result.derived).not.toBe(event.cursor);
    });

    // Test Vector 4: Invalid Types (Frame Check)
    it("should detect INVALID_FRAME on bad types", () => {
        const event = {
            timestamp: "not-a-number", // Invalid
            event_id: 123, // Invalid
            cursor: null // Invalid
        } as unknown as AuditEvent;

        const result = validateCursor(event);
        expect(result).toMatchObject({
            ok: false,
            reason: "INVALID_FRAME"
        });
    });

    // Test Vector 5: Timestamp precision (Strict Integer Check)
    it("should reject floating point timestamps", () => {
        const tsFloat = 1700000000.999;
        const eventId = VALID_UUID_V7;

        // Per spec: floating point timestamps must be rejected
        expect(() => deriveCursor(tsFloat, eventId)).toThrow();
    });
});
