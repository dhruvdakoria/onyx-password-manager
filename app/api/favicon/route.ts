import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 });

    try {
        const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`, {
            headers: { 'User-Agent': 'OnyxPasswordManager/1.0' },
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
