import { createClient } from '@supabase/supabase-js';

// ── Server-side client (uses service role key — never in browser) ────────────
export function createServerSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase server env vars not set');
    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

// ── Client-side client (uses anon key — safe for browser) ───────────────────
export function createBrowserSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase client env vars not set');
    return createClient(url, key);
}
