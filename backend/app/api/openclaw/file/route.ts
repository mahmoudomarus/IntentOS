import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const ALLOWED_FILES = [
    'SOUL.md',
    'USER.md',
    'IDENTITY.md',
    'TOOLS.md',
    'HEARTBEAT.md',
    'AGENTS.md'
];

function resolveOpenClawPath(agentId: string, filename: string) {
    const homeDir = os.homedir();
    // Safe path joining. path.join normalizes and prevents simple traversal,
    // but we also explicitly strictly check the filename against an allowlist.
    return path.join(homeDir, '.openclaw', 'agents', agentId, 'workspace', filename);
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId') || 'main'; // default to main agent
        const filename = searchParams.get('filename');

        if (!filename || !ALLOWED_FILES.includes(filename)) {
            return NextResponse.json({ error: 'Invalid or unauthorized filename' }, { status: 400 });
        }

        const filePath = resolveOpenClawPath(agentId, filename);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return NextResponse.json({ content });
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                // File doesn't exist yet, return empty content instead of failing
                return NextResponse.json({ content: '' });
            }
            throw err;
        }
    } catch (error) {
        console.error('Error reading OpenClaw workspace file:', error);
        return NextResponse.json({ error: 'Failed to read workspace file' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId') || 'main';
        const filename = searchParams.get('filename');

        if (!filename || !ALLOWED_FILES.includes(filename)) {
            return NextResponse.json({ error: 'Invalid or unauthorized filename' }, { status: 400 });
        }

        const { content } = await request.json();

        if (typeof content !== 'string') {
            return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
        }

        const filePath = resolveOpenClawPath(agentId, filename);

        // Ensure the parent directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        await fs.writeFile(filePath, content, 'utf-8');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error writing OpenClaw workspace file:', error);
        return NextResponse.json({ error: 'Failed to write workspace file' }, { status: 500 });
    }
}
