
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
