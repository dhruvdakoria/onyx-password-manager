import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/breach-check
 * Uses Have I Been Pwned k-anonymity API to check if a password was in a data breach.
 * k-Anonymity: we only send the first 5 chars of the SHA-1 hash, never the full password.
 * The server checks the suffix locally, so HIBP never learns the full hash.
 */
export async function POST(req: NextRequest) {
    const { password } = await req.json().catch(() => ({ password: '' }));
    if (!password) return NextResponse.json({ breached: false });

    try {
        // SHA-1 hash of the password
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = sha1.slice(0, 5);
        const suffix = sha1.slice(5);

        // Query HIBP with only the first 5 chars (k-anonymity)
        const hibpRes = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: { 'Add-Padding': 'true', 'User-Agent': 'OnyxPasswordManager/1.0' },
            signal: AbortSignal.timeout(3000),
        });

        if (!hibpRes.ok) return NextResponse.json({ breached: false });

        const text = await hibpRes.text();
        const lines = text.split('\n');
        const breached = lines.some(line => {
            const [hashSuffix, count] = line.split(':');
            return hashSuffix.trim().toUpperCase() === suffix && parseInt(count) > 0;
        });

        return NextResponse.json({ breached });
    } catch {
        // Don't block the user if HIBP is down
        return NextResponse.json({ breached: false });
    }
}
