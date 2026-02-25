import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ═══════════════════════════════════════════════════════
// OpenClaw Status API
// Reports gateway connection status and configured profiles
// ═══════════════════════════════════════════════════════

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
    const expectedToken = process.env.INTENT_OS_SECRET;
    const authHeader = req.headers.get('Authorization');
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const agentDir = path.join(OPENCLAW_DIR, 'agents', 'main', 'agent');
    const authPath = path.join(agentDir, 'auth-profiles.json');

    // Check auth profile status
    let authConfigured = false;
    let configuredProviders: string[] = [];
    try {
        if (fs.existsSync(authPath)) {
            const raw = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
            if (raw?.profiles && typeof raw.profiles === 'object') {
                configuredProviders = Object.values(raw.profiles)
                    .filter((p: any) => p?.key)
                    .map((p: any) => p.provider);
                authConfigured = configuredProviders.length > 0;
            }
        }
    } catch {
        // Ignore parse errors
    }

    // Check gateway connectivity
    let gatewayReachable = false;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch('http://localhost:4200/health', {
            signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeout);
        gatewayReachable = resp?.ok === true || resp?.status === 404; // 404 = gateway running but no /health route
    } catch {
        // Gateway not reachable
    }

    return NextResponse.json(
        {
            gateway: {
                reachable: gatewayReachable,
                url: 'ws://localhost:4200',
            },
            auth: {
                configured: authConfigured,
                providers: configuredProviders,
            },
            agentId: 'main',
        },
        { headers: CORS_HEADERS }
    );
}
