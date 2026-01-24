
import { NextResponse } from 'next/server';
import { DATA_SOURCE_MODE, TALOS_AUDIT_URL, TALOS_GATEWAY_URL, TALOS_CONNECTOR_URL, TALOS_CHAT_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        mode: DATA_SOURCE_MODE,
        services: {
            audit: TALOS_AUDIT_URL,
            gateway: TALOS_GATEWAY_URL,
            connector: TALOS_CONNECTOR_URL,
            chat: TALOS_CHAT_URL
        },
        version: process.env.npm_package_version || '0.0.0',
        timestamp: new Date().toISOString()
    });
}
