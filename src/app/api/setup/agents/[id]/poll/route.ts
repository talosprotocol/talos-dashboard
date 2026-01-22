import { db } from '@/db';
import { setupJobs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { verifySetupGates } from '@/lib/setup-gate';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        verifySetupGates();
        const { id: agentId } = await params;
        
        // 1. Verify Agent Auth
        // In real impl, check Bearer token hash against setupAgents table
        // const authHeader = req.headers.get('Authorization'); 
        // ... verify logic ...

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
        console.error("Poll error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
