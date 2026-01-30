
export const COOKIE_NAME_PROD = '__Host-talos.sid';
export const COOKIE_NAME_DEV = 'talos.sid';

export function getCookieName() {
  return process.env.NODE_ENV === 'production' ? COOKIE_NAME_PROD : COOKIE_NAME_DEV;
}

export async function verifyCookieSignature(
  cookieValue: string,
  secret: string
): Promise<boolean> {
  const parts = cookieValue.split('.');
  if (parts.length !== 4) return false;

  const [version, expStr, token, sig] = parts;
  if (version !== 'v1') return false;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (exp < now) return false;

  const dataToSign = `${version}.${expStr}.${token}`;
  
  // WebCrypto HMAC comparison
  const enc = new TextEncoder();
  
  // Secret is Base64URL encoded, need to decode to raw bytes
  const secretBytes = base64UrlDecode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Decode base64url signature
  const sigBuffer = base64UrlDecode(sig);
  
  return await crypto.subtle.verify(
    'HMAC',
    key,
    sigBuffer as BufferSource,
    enc.encode(dataToSign)
  );
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLen, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
