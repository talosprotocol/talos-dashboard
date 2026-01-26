import 'server-only';
import { db } from '@/db';
import { webauthnChallenges } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import crypto from 'crypto';

export async function createChallenge(purpose: 'registration' | 'authentication', userId?: string) {
    // Generate 32 bytes challenge
    const challenge = crypto.randomBytes(32).toString('base64url');
    
    // TTL 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.insert(webauthnChallenges).values({
        challenge,
        purpose,
        userId: userId || null, // Ensure explicit null if undefined
        expiresAt,
    });

    return challenge;
}

export async function verifyAndConsumeChallenge(challengeStr: string, purpose: 'registration' | 'authentication') {
    // Atomic check and update?
    // Drizzle doesn't support easy "UPDATE ... RETURNING" with where clause filtering in one go for "consume if not consumed" logic cleanly without a transaction or returning *
    // We can do: UPDATE ... SET consumed_at = NOW() WHERE challenge = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > NOW() RETURNING id;
    
    const result = await db.update(webauthnChallenges)
        .set({ consumedAt: new Date() })
        .where(
            and(
                eq(webauthnChallenges.challenge, challengeStr),
                eq(webauthnChallenges.purpose, purpose),
                isNull(webauthnChallenges.consumedAt), 
                gt(webauthnChallenges.expiresAt, new Date())
            )
        )
        .returning({ id: webauthnChallenges.id, userId: webauthnChallenges.userId, challenge: webauthnChallenges.challenge });

    if (result.length === 0) {
        return null; // Invalid or expired or already consumed
    }

    return result[0];
}
