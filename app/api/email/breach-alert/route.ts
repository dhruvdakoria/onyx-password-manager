import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/email/breach-alert — Send a breach notification email.
 * Called when HIBP returns a breach for a saved credential.
 */
export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { credentialName } = await req.json();
    if (!credentialName) return NextResponse.json({ error: 'Missing credentialName' }, { status: 400 });

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 });

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onyx@resend.dev';

    try {
        await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `🚨 Breach Alert: Your ${credentialName} password was found in a data breach`,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#08080a;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08080a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#16161a;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;max-width:480px;width:100%;">
          <tr>
            <td style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.4);border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">🚨</div>
                <span style="font-size:18px;font-weight:700;color:#f4f4f5;letter-spacing:-0.04em;vertical-align:middle;">Onyx Security Alert</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#f87171;font-size:22px;font-weight:700;letter-spacing:-0.03em;margin:0 0 12px;">Password Found in Data Breach</h1>
              <p style="color:#8a8a9a;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Hi ${user.firstName ?? 'there'}, Onyx detected that the password you saved for <strong style="color:#f4f4f5;">${credentialName}</strong> appears in a known data breach database. This means attackers may have access to this password.
              </p>
              <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="color:#f87171;font-size:15px;font-weight:600;margin:0 0 8px;">Recommended action: Change this password immediately</p>
                <ol style="color:#8a8a9a;font-size:13px;line-height:1.8;margin:0;padding-left:16px;">
                  <li>Open your Onyx vault and find <strong style="color:#f4f4f5;">${credentialName}</strong></li>
                  <li>Use the 🔄 button to generate a new strong password</li>
                  <li>Update the password on the ${credentialName} website/app</li>
                  <li>Save the new password in Onyx</li>
                </ol>
              </div>
              <p style="color:#4a4a5a;font-size:12px;line-height:1.5;margin:0;">
                Breach data is sourced from Have I Been Pwned using k-anonymity — Onyx never shares your actual password with any third party.
              </p>
            </td>
          </tr>
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
        console.error('Breach alert email error:', err);
        return NextResponse.json({ success: false });
    }
}
