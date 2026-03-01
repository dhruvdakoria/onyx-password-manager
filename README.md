# Onyx — Your Intelligent Vault 🛡️

A beautiful, zero-knowledge password manager built with Next.js, Clerk, Supabase, and Resend.

## Features

- **Zero-Knowledge Encryption** — Passwords are encrypted client-side with AES-256-GCM. The server never sees plaintext.
- **PIN + Master Key Architecture** — Your 6-digit PIN derives an encryption key that protects a random master key.
- **Recovery Key** — Emailed once on vault setup. Enables PIN reset without data loss.
- **Breach Monitoring** — Real-time HIBP checks using k-anonymity (your password hash is never fully shared).
- **PWA Ready** — Add to iPhone home screen for a native-like experience.
- **Google & Email Sign-in** — Powered by Clerk.
- **Beautiful Dark UI** — Apple/Wealthsimple-inspired design.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Auth | Clerk (Google + Email) |
| Database | Supabase (PostgreSQL + RLS) |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Email | Resend |
| Hosting | Vercel |

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in your keys (see docs/Setup_Guide.md)
npm run dev
```

## Documentation

- [Product Spec](docs/Product_Spec.md) — Full product specification
- [Setup Guide](docs/Setup_Guide.md) — Step-by-step production deployment
- [Database Schema](docs/supabase-schema.sql) — Supabase SQL schema

## Security Model

```
PIN → PBKDF2(100k iterations) → PIN Key → decrypt → Master Key
Master Key → AES-GCM → encrypted vault items (stored in Supabase)
```

The server only stores encrypted blobs. Even if Supabase is breached, attackers get noise.

## License

Private — All rights reserved.
