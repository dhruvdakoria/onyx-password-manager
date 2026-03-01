import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/email/recovery — Send the vault recovery key to the user's email.
 * Called immediately after vault setup so user has a backup.
 */
export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recoveryKey } = await req.json();
    if (!recoveryKey) return NextResponse.json({ error: 'Missing recoveryKey' }, { status: 400 });

    // Get user's email from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 });

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onyx@resend.dev';

    try {
        await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: '🔑 Your Onyx Vault Recovery Key — Store This Safely',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Onyx Recovery Key</title>
</head>
<body style="margin:0;padding:0;background-color:#08080a;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08080a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#16161a;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;max-width:480px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.4);border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">🛡</div>
                <span style="font-size:18px;font-weight:700;color:#f4f4f5;letter-spacing:-0.04em;vertical-align:middle;">Onyx</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;letter-spacing:-0.03em;margin:0 0 12px;">Your Vault Recovery Key</h1>
              <p style="color:#8a8a9a;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi ${user.firstName ?? 'there'}, your Onyx vault is now set up with zero-knowledge encryption. Below is your <strong style="color:#f4f4f5;">recovery key</strong>. If you ever forget your PIN, you'll need this to regain access to your vault.
              </p>
              <div style="background:#1a1a20;border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="color:#818cf8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Recovery Key</p>
                <code style="color:#f4f4f5;font-size:14px;font-family:'Courier New',monospace;letter-spacing:0.04em;word-break:break-all;display:block;">${recoveryKey}</code>
              </div>
              <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="color:#fbbf24;font-size:13px;font-weight:600;margin:0 0 6px;">⚠️ Critical: Store This Safely</p>
                <ul style="color:#8a8a9a;font-size:13px;line-height:1.6;margin:0;padding-left:16px;">
                  <li>Screenshot this email or write the key down</li>
                  <li>Store it somewhere offline (not digitally)</li>
                  <li>This key cannot be regenerated or recovered by Onyx</li>
                  <li>Without it, a forgotten PIN = permanent vault loss</li>
                </ul>
              </div>
              <p style="color:#4a4a5a;font-size:12px;line-height:1.5;margin:0;">
                This is an automated security email. Onyx uses zero-knowledge encryption — we cannot see your passwords, and we cannot recover your vault. Only you can, with this key.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4a4a5a;font-size:12px;margin:0;text-align:center;">Onyx Password Manager — Zero-Knowledge Vault</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
        });

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Email send failed';
        console.error('Recovery email error:', msg);
        // Don't fail the vault setup if email fails — user still set up their vault
        return NextResponse.json({ success: false, warning: msg });
    }
}
