# Onyx — Production Setup Checklist

> Complete these steps in order. Most take 2-5 minutes each.

---

## Step 1: Run the Supabase Schema ✅ (5 min)

1. Go to [supabase.com](https://supabase.com) → Your **onyx-vault** project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file [supabase-schema.sql](file:///Users/dhruv/Development/PasswordManager/onyx/supabase-schema.sql) and paste its entire contents
5. Click **Run** → you should see 4 tables created: `profiles`, `vault_config`, `vault_items`, `audit_log`

> [!IMPORTANT]
> Also note your keys from **Settings → API**:
> - `URL` (looks like `https://xxxxx.supabase.co`)
> - `anon public` key
> - `service_role` key (secret!)

---

## Step 2: Get Resend API Key ✅ (2 min)

You pasted the Clerk keys twice earlier. Here's how to get the Resend key:

1. Go to [resend.com](https://resend.com) → Sign in / Sign up
2. Click **API Keys** in the left sidebar
3. Click **Create API Key** → Name it "Onyx" → Click **Add**
4. Copy the key (starts with `re_`)

---

## Step 3: Update .env.local ✅ (2 min)

Edit [.env.local](file:///Users/dhruv/Development/PasswordManager/onyx/.env.local) and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
```

> [!NOTE]
> The Clerk keys are already filled in from what you provided.

---

## Step 4: Set Up Clerk Webhook ✅ (5 min)

This creates Supabase profile records when users sign up.

1. Go to [clerk.com](https://clerk.com) → **Dashboard** → Your **Onyx** app
2. Click **Webhooks** in the left sidebar
3. Click **Add Endpoint**
4. Set **Endpoint URL**: `https://YOUR-APP.vercel.app/api/webhooks/clerk`
   - (Use localhost tunnel for testing: see below)
5. Under **Subscribe to events**, check:
   - `user.created`
   - `user.updated`  
   - `user.deleted`
6. Click **Create**
7. Copy the **Signing Secret** (starts with `whsec_`)
8. Add to `.env.local`: `CLERK_WEBHOOK_SECRET=whsec_...`

> [!TIP]
> For local testing, use `npx ngrok http 3000` to get a tunnel URL for the webhook.

---

## Step 5: Push to GitHub & Deploy on Vercel ✅ (5 min)

```bash
# In /Users/dhruv/Development/PasswordManager/onyx
git init
git add .
git commit -m "feat: production-ready Onyx password manager"
git remote add origin https://github.com/YOUR_USERNAME/onyx-vault.git
git push -u origin main
```

Then in **Vercel dashboard**:
1. Import the `onyx-vault` repository
2. Go to **Settings → Environment Variables**
3. Add ALL the variables from `.env.local` (but use production URL for `NEXT_PUBLIC_APP_URL`)
4. Click **Redeploy**

> [!IMPORTANT]
> After deploying, update the webhook URL in Clerk to your Vercel URL.

---

## Step 6: Add Vercel Environment Variables ✅

These go in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_Z3Jh...` |
| `CLERK_SECRET_KEY` | `sk_test_05Gv...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `RESEND_API_KEY` | `re_...` |
| `RESEND_FROM_EMAIL` | `onyx@resend.dev` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

> [!NOTE]
> If you linked Vercel + Supabase directly, some Supabase vars may already be set.

---

## Step 7: Use on iPhone 📱 (2 min)

Once deployed to Vercel:

1. Open **Safari** on your iPhone
2. Navigate to `https://your-app.vercel.app`
3. Tap the **Share** button (box with arrow, bottom of screen)
4. Scroll down and tap **"Add to Home Screen"**
5. Name it **"Onyx"** → Tap **Add**

The Onyx icon will appear on your home screen. When you open it:
- It runs in **full-screen mode** (no Safari address bar)
- It looks and feels like a native app
- **Face ID** works via the browser's biometric API on iOS 16+

---

## Architecture Summary

```
iPhone Safari (PWA)  ──→  Vercel (Next.js)  ──→  Supabase
                                │                  ↑
                         Clerk Session        Encrypted blobs only
                                │                  (zero-knowledge)
                         ─────────────
                         |  Your PIN  |
                         | derives    |
                         | Master Key |
                         | (in memory)|
                         ─────────────
                                │
                         Resend Email API
                         (breach alerts + 
                          recovery key email)
```

**Security guarantees:**
- ✅ Supabase never sees your actual passwords
- ✅ Vercel servers never see the vault key
- ✅ If Supabase is breached → attackers get encrypted noise
- ✅ PIN is never stored anywhere — derived ephemerally on unlock
- ✅ Recovery key was emailed to you once — store it offline
- ✅ Breach detection via k-anonymity (HIBP never gets full hash)

---

## Current Status

| Component | Status |
|-----------|--------|
| Clerk Auth (Google + Email) | ✅ Configured |
| Next.js app + security headers | ✅ Built |
| Zero-knowledge crypto layer | ✅ Built |
| Supabase API routes | ✅ Built |
| Vault CRUD (encrypted) | ✅ Built |
| Recovery key (Resend email) | ✅ Built |
| Breach monitoring (HIBP) | ✅ Built |
| Clerk webhook (profile sync) | ✅ Built |
| PWA manifest + service worker | ✅ Built |
| iPhone home screen icon | ✅ Generated |
| **Supabase schema** | ⏳ Run SQL |
| **Resend key** | ⏳ Need key |
| **Supabase keys** | ⏳ Need keys |
| **Clerk webhook** | ⏳ Set up |
| **Vercel deploy** | ⏳ Push & deploy |
