import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// MED-4: Validate domain to prevent SSRF — only allow valid public domain names
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export async function GET(req: NextRequest) {
    // MED-4: Require authentication
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 });

    // MED-4: Strict domain format validation — block IPs, internal hostnames, and special chars
    if (!DOMAIN_REGEX.test(domain) || domain.length > 253) {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }

    try {
        // Only fetch from Google's favicon CDN — never from user-supplied URLs directly
        const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`, {
            headers: { 'User-Agent': 'OnyxPasswordManager/1.0' },
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) throw new Error('Fetch failed');

        const arrayBuffer = await res.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', res.headers.get('content-type') || 'image/png');
        headers.set('Cache-Control', 'public, max-age=604800, immutable');

        return new NextResponse(arrayBuffer, { headers });
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
