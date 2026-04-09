import { db } from '@/db';
import { setupJobs, setupAgents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { verifySetupGates, SecurityGateError } from '@/lib/setup-gate';
import crypto from 'crypto';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        verifySetupGates();
        const { id: agentId } = await params;
        
        // 1. Verify Agent Auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
             return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
        }
        
        const token = authHeader.substring(7);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        const [agent] = await db.select().from(setupAgents)
            .where(eq(setupAgents.id, agentId))
            .limit(1);
            
        if (!agent || agent.secretHash !== tokenHash) {
             return NextResponse.json({ error: 'Unauthorized: Invalid agent secret' }, { status: 401 });
        }

        // Update last seen
        await db.update(setupAgents)
            .set({ lastSeenAt: new Date() })
            .where(eq(setupAgents.id, agentId));

        // 2. Find and Lease Job (Atomic-ish for now, easy with Drizzle transaction if needed)
        // Simple implementation: Find first queued job for this agent
        const queuedJobs = await db.select().from(setupJobs)
            .where(and(
                eq(setupJobs.agentId, agentId),
                eq(setupJobs.status, 'queued')
            ))
            .limit(1);

        if (queuedJobs.length === 0) {
            return new NextResponse(null, { status: 204 });
        }

        const jobToLease = queuedJobs[0];
        const leaseExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min lease

        // Update status to leased
        const [leasedJob] = await db.update(setupJobs)
            .set({
                status: 'leased',
                leaseExpiresAt: leaseExpires,
                updatedAt: new Date()
            })
            .where(eq(setupJobs.id, jobToLease.id))
            .returning();

        return NextResponse.json({
            job: {
                job_id: leasedJob.id,
                recipe_id: leasedJob.recipeId,
                args: leasedJob.args
            }
        });

    } catch (e) {
        if (e instanceof SecurityGateError) {
             return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
        }
        console.error("Poll error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
