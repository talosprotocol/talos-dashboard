import { db } from '@/db';
import { setupJobs } from '@/db/schema';
import { NextResponse } from 'next/server';
import { verifySetupGates, SecurityGateError } from '@/lib/setup-gate';

export async function POST(req: Request) {
    try {
        verifySetupGates();
        // TODO: Validate User Session (Auth)
        
        const body = await req.json();
        const { recipe_id, args, agent_id } = body;

        // Validation
        if (!recipe_id || !agent_id) {
             return NextResponse.json({ error: "Missing recipe_id or agent_id" }, { status: 400 });
        }
        
        // Real DB Insert
        const [job] = await db.insert(setupJobs).values({
            recipeId: recipe_id,
            agentId: agent_id,
            args: args || {},
            status: 'queued'
        }).returning();
        
        return NextResponse.json({ job_id: job.id, status: job.status });
    } catch (e) {
        if (e instanceof SecurityGateError) {
             return NextResponse.json({ error: e.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
