# Platinum Pulse AI Hub V10

A focused subscription AI workspace built with:

- Next.js and TypeScript
- Supabase authentication and database
- OpenAI
- Claude
- Composio connected apps
- Stripe subscriptions

## Main user experience

The visible navigation contains only:

- Dashboard
- AI Chat
- Integrations
- Billing

OpenAI and Claude share one ChatGPT-style interface with a model switcher.
The Integrations page is separate and lets users connect their own services
through Composio.

## Private administrator access

There is no visible Admin link or Admin button.

The normal login form accepts:

- a customer email and password, or
- the private administrator username and password from `.env.local`

A successful administrator login creates a secure, HTTP-only session and opens
the hidden administrator overview. Users cannot access it without a valid
administrator session.

Add these values to `.env.local`:

```env
ADMIN_USERNAME=ppn7
ADMIN_PASSWORD=use-a-new-private-password
ADMIN_SESSION_SECRET=use-a-long-random-secret
```

Do not hardcode the password in React files. The password previously discussed
should be changed before public deployment.

## Important: environment file location

Put `.env.local` in the same folder as `package.json`. If the Supabase public
variables are missing, V11.1 now opens a guided setup screen rather than
crashing. Both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the newer
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are supported.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add your real Supabase, OpenAI, Claude, Composio and Stripe values.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Install and start:

```powershell
npm install
npm run dev
```

## Included product features

- Email sign-up and login
- Google login
- Password reset
- Unified OpenAI and Claude chat
- Model switching
- Chat history
- File and image attachments
- Voice input where supported
- Password-protected incognito conversations
- Composio connection cards
- Free, Pro and Business subscriptions
- Stripe Checkout and billing portal
- Monthly AI usage limits
- Hidden administrator overview
- Responsive Platinum Pulse interface

## Security notes

Keep all secret keys in `.env.local` or your deployment environment.
Never commit `.env.local`.
Use a unique administrator password and a long random session secret.


## V11 additions

- Dedicated OpenAI image-generation page
- Square, landscape and portrait generation
- Image download and regeneration controls
- Six-month OpenAI and Claude usage chart
- Image requests count against the OpenAI monthly allowance

No new database migration is required because the charts use the existing
`usage_monthly` table. Set `OPENAI_IMAGE_MODEL=gpt-image-1` in `.env.local`
or use the default included by the route.
