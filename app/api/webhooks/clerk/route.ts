import { WebhookEvent } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/webhooks/clerk
 * Handles Clerk user lifecycle events (user.created, user.deleted)
 * Syncs Clerk users to Supabase profiles table.
 *
 * Setup: Clerk Dashboard → Webhooks → Add endpoint:
 *   URL: https://your-app.vercel.app/api/webhooks/clerk
 *   Events: user.created, user.deleted, user.updated
 *   Copy the signing secret → CLERK_WEBHOOK_SECRET env var
 */
export async function POST(req: NextRequest) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    const payload = await req.text();

    let event: WebhookEvent;
    try {
        const wh = new Webhook(webhookSecret);
        event = wh.verify(payload, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        }) as WebhookEvent;
    } catch {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    switch (event.type) {
        case 'user.created': {
            const { id, email_addresses, first_name, last_name } = event.data;
            const email = email_addresses[0]?.email_address ?? '';

            const { error } = await supabase.from('profiles').upsert({
                clerk_user_id: id,
                email,
                first_name: first_name ?? null,
                last_name: last_name ?? null,
            }, { onConflict: 'clerk_user_id' });

            if (error) console.error('Failed to create profile:', error);
            break;
        }

        case 'user.updated': {
            const { id, email_addresses, first_name, last_name } = event.data;
            const email = email_addresses[0]?.email_address ?? '';

            await supabase.from('profiles').update({
                email,
                first_name: first_name ?? null,
                last_name: last_name ?? null,
                updated_at: new Date().toISOString(),
            }).eq('clerk_user_id', id);
            break;
        }

        case 'user.deleted': {
            const { id } = event.data;
            if (!id) break;
            // CASCADE deletes will clean up vault_items, vault_config, audit_log
            await supabase.from('profiles').delete().eq('clerk_user_id', id);
            break;
        }
    }

    return NextResponse.json({ received: true });
}
