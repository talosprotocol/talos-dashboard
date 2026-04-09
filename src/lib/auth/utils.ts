
import { randomBytes, createHash, createHmac } from 'crypto';

/**
 * Converts a Base64URL string to a Buffer.
 */
export function b64urlToBytes(str: string): Buffer {
    return Buffer.from(str, 'base64url');
}

/**
 * Converts a Buffer (or Uint8Array) to a Base64URL string.
 */
export function bytesToB64url(bytes: Buffer | Uint8Array): string {
    return Buffer.from(bytes).toString('base64url');
}

/**
 * Computes SHA-256 hash of input bytes.
 * Returns raw Buffer.
 */
export function sha256(input: Buffer): Buffer {
    return createHash('sha256').update(input).digest();
}

/**
 * Computes HMAC-SHA256 of input using secret.
 * Returns raw Buffer.
 */
export function hmac(secret: Buffer, input: string | Buffer): Buffer {
    return createHmac('sha256', secret).update(input).digest();
}

/**
 * Generates specific number of random bytes.
 */
export function generateRandomBytes(length: number): Buffer {
    return randomBytes(length);
}

/**
 * Generates an HS256 JWT signed with AUTH_ADMIN_SECRET for internal admin proxy auth.
 */
export function signAdminJwt(payload: object, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const jsonEncode = (obj: object) => JSON.stringify(obj);
    
    const b64Header = bytesToB64url(Buffer.from(jsonEncode(header)));
    const b64Payload = bytesToB64url(Buffer.from(jsonEncode(payload)));
    
    const signature = hmac(Buffer.from(secret), `${b64Header}.${b64Payload}`);
    return `${b64Header}.${b64Payload}.${bytesToB64url(signature)}`;
}
