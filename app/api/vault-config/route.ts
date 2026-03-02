import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/vault-config — fetch vault config for current user
export async function GET(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('vault_config')
        .select('pin_salt, encrypted_master_key_with_pin, encrypted_master_key_with_recovery, has_pin_setup')
        .eq('clerk_user_id', userId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json(null);

    return NextResponse.json({
        hasPinSetup: data.has_pin_setup,
        pinSalt: data.pin_salt,
        encryptedMasterKeyWithPin: data.encrypted_master_key_with_pin,
        encryptedMasterKeyWithRecovery: data.encrypted_master_key_with_recovery,
    });
}

// POST /api/vault-config — initial vault setup (PIN + master key setup)
export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pinSalt, encryptedMasterKeyWithPin, encryptedMasterKeyWithRecovery } = body;

    if (!pinSalt || !encryptedMasterKeyWithPin || !encryptedMasterKeyWithRecovery) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
        .from('vault_config')
        .upsert({
            clerk_user_id: userId,
            pin_salt: pinSalt,
            encrypted_master_key_with_pin: encryptedMasterKeyWithPin,
            encrypted_master_key_with_recovery: encryptedMasterKeyWithRecovery,
            has_pin_setup: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log the action
    await supabase.from('audit_log').insert({
        clerk_user_id: userId,
        action: 'vault_setup',
    });

    return NextResponse.json({ success: true });
}

// PATCH /api/vault-config — update PIN encryption (PIN change or recovery)
export async function PATCH(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pinSalt, encryptedMasterKeyWithPin } = body;

    if (!pinSalt || !encryptedMasterKeyWithPin) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
        .from('vault_config')
        .update({
            pin_salt: pinSalt,
            encrypted_master_key_with_pin: encryptedMasterKeyWithPin,
            updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
        clerk_user_id: userId,
        action: 'pin_changed',
    });

    return NextResponse.json({ success: true });
}
