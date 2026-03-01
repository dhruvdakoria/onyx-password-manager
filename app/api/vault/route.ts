import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/vault — list all vault items (encrypted) for current user
export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('vault_items')
        .select('id, name, category, is_favorite, url, encrypted_data, created_at, updated_at')
        .eq('clerk_user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
}

// POST /api/vault — create a new vault item
export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, category, is_favorite, url, encrypted_data } = body;

    if (!name || !encrypted_data) {
        return NextResponse.json({ error: 'Missing name or encrypted_data' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('vault_items')
        .insert({
            clerk_user_id: userId,
            name,
            category: category ?? 'other',
            is_favorite: is_favorite ?? false,
            url: url ?? null,
            encrypted_data,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
        clerk_user_id: userId,
        action: 'add_item',
    });

    return NextResponse.json(data, { status: 201 });
}
