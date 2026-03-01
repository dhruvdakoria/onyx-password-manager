import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// PATCH /api/vault/[id] — update a vault item
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Only allow updating these fields
    const allowed = ['name', 'category', 'is_favorite', 'url', 'encrypted_data'];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
        if (key in body) updates[key] = body[key];
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership before updating
    const { data, error } = await supabase
        .from('vault_items')
        .update(updates)
        .eq('id', id)
        .eq('clerk_user_id', userId) // enforce ownership
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(data);
}

// DELETE /api/vault/[id] — delete a vault item
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', id)
        .eq('clerk_user_id', userId); // enforce ownership

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
        clerk_user_id: userId,
        action: 'delete_item',
    });

    return new NextResponse(null, { status: 204 });
}
