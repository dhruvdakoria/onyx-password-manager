import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Helper to check lockout status
async function checkLockout(userId: string, supabase: any) {
    const { data: logs } = await supabase
        .from('audit_log')
        .select('action, created_at')
        .eq('clerk_user_id', userId)
        .in('action', ['PIN_FAILED', 'PIN_SUCCESS'])
        .order('created_at', { ascending: false })
        .limit(10);

    let failCount = 0;
    let newestFailTime = 0;

    for (const log of (logs || [])) {
        if (log.action === 'PIN_SUCCESS') break;
        if (log.action === 'PIN_FAILED') {
            failCount++;
            if (failCount === 1) newestFailTime = new Date(log.created_at).getTime();
        }
    }

    const now = Date.now();
    if (failCount >= 10 && now - newestFailTime < 5 * 60 * 1000) return { locked: true, failCount, retryAfter: 5 * 60 - Math.floor((now - newestFailTime) / 1000) };
    if (failCount >= 5 && now - newestFailTime < 30 * 1000) return { locked: true, failCount, retryAfter: 30 - Math.floor((now - newestFailTime) / 1000) };

    return { locked: false, failCount };
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();

    // Check if locked out before allowing an attempt
    const status = await checkLockout(userId, supabase);
    if (status.locked) {
        return NextResponse.json({ error: 'Locked out', retryAfter: status.retryAfter }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.success === true) {
        // Log success to reset counter
        await supabase.from('audit_log').insert({ clerk_user_id: userId, action: 'PIN_SUCCESS' });
        return NextResponse.json({ ok: true });
    } else {
        // Log failure
        await supabase.from('audit_log').insert({ clerk_user_id: userId, action: 'PIN_FAILED' });

        // Re-check lockout to immediately return if they just crossed the threshold
        const newStatus = await checkLockout(userId, supabase);
        return NextResponse.json({ ok: true, failCount: status.failCount + 1, locked: !!newStatus.locked, retryAfter: newStatus.retryAfter || 0 });
    }
}
