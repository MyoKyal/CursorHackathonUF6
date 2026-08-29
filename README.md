# Loopify

Loopify is a **Yangon** donation-first network (English UI). Neighbors in Bahan, Kamayut, Insein, Tamwe, and other Yangon townships post unused but usable items. People who need them — or who can haul bottles to a recovery workshop instead of a monsoon drain — request pickup. Donors choose a recipient and arrange collection in chat. Item exchange is optional.

The feed is Meetup-style with an emerald theme and the Loopify recycle-loop logo. Photograph an item on **Give** and AI (Gemini, then OpenAI, then OpenRouter) fills title, category, condition, description, weight, reuse/repair/recycle advice, safety notes, and keywords.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:43177](http://127.0.0.1:43177).

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
```

Set the same variables on Netlify. There is no payment integration.

## Connect the database

In the Supabase SQL editor, run in order:

1. `supabase/schema.sql`
2. `supabase/storage.sql`
3. `supabase/seed.sql` — Myanmar community stories

Turn **off** “Confirm email” while testing demo logins.

## Demo accounts

Created for testers (see Sign in). Use these after email confirmation is disabled:

| Name | Email | Password | Role |
| --- | --- | --- | --- |
| Su Su Win | susu.yangon@loopify.demo | Loopify2026SuSu! | Donor, Bahan |
| Ko Aung Min | aung.volunteer@loopify.demo | Loopify2026Aung! | Volunteer pickup |
| May Thiri | may.mandalay@loopify.demo | Loopify2026May! | Tamwe, Yangon organiser |
| Yangon Green Loop | recycle.yangon@loopify.demo | Loopify2026Org! | Recycling org |

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, Leaflet, Gemini / OpenAI / OpenRouter vision.
