import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeAndValidatePath, createRecastRequest } from './proxy';
import { NextRequest, NextResponse } from 'next/server';

// Mock session validation to avoid DB deps
vi.mock('./auth/session', () => ({
    validateRequest: vi.fn()
}));

import { validateRequest } from './auth/session';

describe('Proxy Security Logic', () => {

    describe('normalizeAndValidatePath', () => {
        it('should allow clean paths', () => {
            expect(normalizeAndValidatePath(['health'])).toBe('/health');
            expect(normalizeAndValidatePath(['validate'])).toBe('/validate');
        });

        it('should join clean segments', () => {
             expect(normalizeAndValidatePath(['v1', 'resource'])).toBe('/v1/resource');
        });

        it('should reject traversal attempts', () => {
             expect(normalizeAndValidatePath(['..', 'secret'])).toBeNull();
             expect(normalizeAndValidatePath(['.'])).toBeNull();
        });

        it('should reject encoded traversal (strict)', () => {
             expect(normalizeAndValidatePath(['%2e%2e'])).toBeNull();
             expect(normalizeAndValidatePath(['%2e'])).toBeNull();
        });

        it('should reject encoded separators (strict)', () => {
             expect(normalizeAndValidatePath(['a%2fb'])).toBeNull();
             expect(normalizeAndValidatePath(['a%5cb'])).toBeNull();
        });
    });

    describe('createRecastRequest', () => {
        beforeEach(() => {
            vi.resetAllMocks();
        });

        const mockOptions = { upstreamUrl: 'http://upstream' };

        it('should return 401 if session is invalid', async () => {
            vi.mocked(validateRequest).mockResolvedValue(null);
            // Use a valid path to ensure we hit the session check
            const req = new NextRequest('http://localhost/api/config/health');
            
            const res = await createRecastRequest(req, ['health'], mockOptions);
            expect((res as NextResponse).status).toBe(401);
        });

        it('should return 403 if session has no identity', async () => {
            // @ts-expect-error - mock partial session return type
            vi.mocked(validateRequest).mockResolvedValue({ user: {} }); 
            const req = new NextRequest('http://localhost/api/config/health');
            
            const res = await createRecastRequest(req, ['health'], mockOptions);
            expect((res as NextResponse).status).toBe(403);
        });

        it('should return 404 if path is not allowed', async () => {
            // @ts-expect-error - mock partial session return type
            vi.mocked(validateRequest).mockResolvedValue({ user: { id: 'user-1' } });
            const req = new NextRequest('http://localhost/api/config/secret');
            
            const res = await createRecastRequest(req, ['secret'], mockOptions);
            expect((res as NextResponse).status).toBe(404);
        });

        it('should inject headers and strip auth for valid request', async () => {
            // @ts-expect-error - mock partial session return type
            vi.mocked(validateRequest).mockResolvedValue({ user: { id: 'user-1' } });
            
            const req = new NextRequest('http://localhost/api/config/health', {
                headers: {
                    'Authorization': 'Bearer fake-client-token',
                    'Idempotency-Key': 'valid-key-123'
                }
            });

            const res = await createRecastRequest(req, ['health'], { upstreamUrl: 'http://upstream', serviceToken: 's2s-token' });
            
            if (res instanceof NextResponse) throw new Error("Should not be response");
            
            expect(res.headers.get('Authorization')).toBe('Bearer s2s-token');
            expect(res.headers.get('X-Talos-Principal-Id')).toBe('user-1');
            // GET request should strip Idempotency-Key
            expect(res.headers.has('Idempotency-Key')).toBe(false);
            expect(res.headers.get('X-Request-Id')).toBeDefined();
        });
        
        it('should return 400 for invalid Idempotency Key', async () => {
            // @ts-expect-error - mock partial session return type
            vi.mocked(validateRequest).mockResolvedValue({ user: { id: 'user-1' } });
            
            const req = new NextRequest('http://localhost/api/config/drafts', {
                method: 'POST',
                headers: { 'Idempotency-Key': 'bad key with spaces' }
            });

            const res = await createRecastRequest(req, ['drafts'], mockOptions);
            expect((res as NextResponse).status).toBe(400);
        });

        it('should return 405 if method is wrong for allowed path', async () => {
             // @ts-expect-error - mock partial session return type
             vi.mocked(validateRequest).mockResolvedValue({ user: { id: 'user-1' } });
             
             // /health is GET only
             const req = new NextRequest('http://localhost/api/config/health', { method: 'POST' });
             
             const res = await createRecastRequest(req, ['health'], mockOptions);
             expect((res as NextResponse).status).toBe(405);
        });

        it('should strip Idempotency-Key on GET request', async () => {
            // @ts-expect-error - mock partial session return type
            vi.mocked(validateRequest).mockResolvedValue({ user: { id: 'user-1' } });
            
            const req = new NextRequest('http://localhost/api/config/health', {
                method: 'GET',
                headers: { 'Idempotency-Key': 'some-key' }
            });

            const res = await createRecastRequest(req, ['health'], mockOptions);
            
            if (res instanceof NextResponse) throw new Error("Should be valid proxy object");
            expect(res.headers.has('Idempotency-Key')).toBe(false);
        });
        
        it('should forward Idempotency-Key on POST request', async () => {
            // @ts-expect-error - mock partial session return type
            vi.mocked(validateRequest).mockResolvedValue({ user: { id: 'user-1' } });
            
            const req = new NextRequest('http://localhost/api/config/drafts', {
                method: 'POST',
                headers: { 'Idempotency-Key': 'valid-key' }
            });

            const res = await createRecastRequest(req, ['drafts'], mockOptions);
            
            if (res instanceof NextResponse) throw new Error("Should be valid proxy object");
            expect(res.headers.get('Idempotency-Key')).toBe('valid-key');
        });
    });
});
