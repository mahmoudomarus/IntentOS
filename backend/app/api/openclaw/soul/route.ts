import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');

function resolveWorkspaceDir(agentId: string): string {
    return path.join(OPENCLAW_DIR, 'agents', agentId, 'workspace');
}

function resolveSoulPath(agentId: string): string {
    return path.join(resolveWorkspaceDir(agentId), 'SOUL.md');
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── OPTIONS (CORS preflight) ───────────────────────
export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ─── GET: Read SOUL.md ───
export async function GET(req: Request) {
    const expectedToken = process.env.INTENT_OS_SECRET;
    const authHeader = req.headers.get('Authorization');
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || 'main';

    const filePath = resolveSoulPath(agentId);
    let soul = '';
    if (fs.existsSync(filePath)) {
        try {
            soul = fs.readFileSync(filePath, 'utf-8');
        } catch {
            // Read failed
        }
    }

    return NextResponse.json({ agentId, soul }, { headers: CORS_HEADERS });
}

// ─── POST: Write SOUL.md ──────────────────
export async function POST(req: Request) {
    const expectedToken = process.env.INTENT_OS_SECRET;
    const authHeader = req.headers.get('Authorization');
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const body = await req.json();
        const { agentId = 'main', soul } = body;

        if (typeof soul !== 'string') {
            return NextResponse.json(
                { error: 'Missing "soul" string field' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        const filePath = resolveSoulPath(agentId);
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, soul, 'utf-8');

        return NextResponse.json(
            { ok: true, agentId },
            { headers: CORS_HEADERS }
        );
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Internal error' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
