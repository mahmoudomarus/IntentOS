import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ═══════════════════════════════════════════════════════
// Auth Profile API for OpenClaw
// Reads/writes ~/.openclaw/agents/{agentId}/agent/auth-profiles.json
// ═══════════════════════════════════════════════════════

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
const AUTH_STORE_VERSION = 2;

type AuthProfileStore = {
    version: number;
    profiles: Record<string, { type: string; provider: string; key?: string; email?: string }>;
    order?: Record<string, string[]>;
    lastGood?: Record<string, string>;
};

function resolveAgentDir(agentId: string): string {
    return path.join(OPENCLAW_DIR, 'agents', agentId, 'agent');
}

function resolveAuthStorePath(agentId: string): string {
    return path.join(resolveAgentDir(agentId), 'auth-profiles.json');
}

function loadAuthStore(agentId: string): AuthProfileStore {
    const filePath = resolveAuthStorePath(agentId);
    if (fs.existsSync(filePath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (raw && typeof raw === 'object' && raw.profiles) {
                return raw as AuthProfileStore;
            }
        } catch {
            // Corrupted file — start fresh
        }
    }
    return { version: AUTH_STORE_VERSION, profiles: {} };
}

function saveAuthStore(agentId: string, store: AuthProfileStore): void {
    const filePath = resolveAuthStorePath(agentId);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

/** Mask API keys for display (show first 8 + last 4 chars) */
function maskKey(key?: string): string {
    if (!key) return '';
    if (key.length <= 12) return '***';
    return key.slice(0, 8) + '...' + key.slice(-4);
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── OPTIONS (CORS preflight) ───────────────────────
export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ─── GET: List configured auth profiles (keys masked) ───
export async function GET(req: Request) {
    const expectedToken = process.env.INTENT_OS_SECRET;
    const authHeader = req.headers.get('Authorization');
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || 'main';

    const store = loadAuthStore(agentId);
    const profiles = Object.entries(store.profiles).map(([id, cred]) => ({
        id,
        provider: cred.provider,
        type: cred.type,
        maskedKey: maskKey(cred.key),
        configured: Boolean(cred.key),
    }));

    return NextResponse.json({ agentId, profiles }, { headers: CORS_HEADERS });
}

// ─── POST: Upsert an auth profile ──────────────────
export async function POST(req: Request) {
    const expectedToken = process.env.INTENT_OS_SECRET;
    const authHeader = req.headers.get('Authorization');
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const body = await req.json();
        const { agentId = 'main', provider, apiKey, profileId } = body;

        if (!provider || typeof provider !== 'string') {
            return NextResponse.json(
                { error: 'Missing "provider" field' },
                { status: 400, headers: CORS_HEADERS }
            );
        }
        if (!apiKey || typeof apiKey !== 'string') {
            return NextResponse.json(
                { error: 'Missing "apiKey" field' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // Derive profile ID from provider name if not given
        const pid = profileId || `${provider}-api-key`;

        const store = loadAuthStore(agentId);
        store.profiles[pid] = {
            type: 'api_key',
            provider,
            key: apiKey.trim(),
        };
        saveAuthStore(agentId, store);

        return NextResponse.json(
            {
                ok: true,
                agentId,
                profileId: pid,
                provider,
                maskedKey: maskKey(apiKey.trim()),
            },
            { headers: CORS_HEADERS }
        );
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Internal error' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}

// ─── DELETE: Remove an auth profile ─────────────────
export async function DELETE(req: Request) {
    const expectedToken = process.env.INTENT_OS_SECRET;
    const authHeader = req.headers.get('Authorization');
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    try {
        const body = await req.json();
        const { agentId = 'main', profileId } = body;

        if (!profileId || typeof profileId !== 'string') {
            return NextResponse.json(
                { error: 'Missing "profileId" field' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        const store = loadAuthStore(agentId);
        if (store.profiles[profileId]) {
            delete store.profiles[profileId];
            saveAuthStore(agentId, store);
        }

        return NextResponse.json(
            { ok: true, agentId, profileId },
            { headers: CORS_HEADERS }
        );
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Internal error' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
