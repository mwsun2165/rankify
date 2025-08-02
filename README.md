# Rankify  
> A minimalist web app for creating and sharing Spotify album / song / artist rankings with friends.

---

## Features

1. **Spotify OAuth Login** – Sign in securely with your Spotify account.
2. **Search** – Fast artist / album search via the Spotify Web API.
3. **Pre-populated Pools** – Pick an artist/album and instantly get all their albums or songs ready to rank.
4. **Drag-and-Drop Ranking Builder** – Smooth ordering, insert-between, and drag-out-to-remove powered by `dnd-kit`.
5. **Saving Rankings** – Persist rankings to Supabase (Postgres) with one click.
6. **Browse Feed** – View your own rankings and public rankings from the community.
7. **Typed End-to-End** – Database types are generated and shared across the monorepo.

---

## Tech Stack

| Layer            | Tech                                                               |
|------------------|--------------------------------------------------------------------|
| Front-end        | **Next.js 14**, React 18, TypeScript, Tailwind CSS                 |
| State / D&D      | Zustand (planned), **dnd-kit** (`@dnd-kit/core`, sortable, etc.)   |
| Back-end / DB    | **Supabase** (PostgreSQL 16) – Auth, RLS, Realtime                |
| Auth             | Supabase Auth (Spotify external provider)                          |
| Package Manager  | **pnpm** (workspaces monorepo)                                     |
| Tooling          | ESLint, Prettier                                                   |

---

## Local Setup

### 1. Prerequisites

* **Node >= 18**
* **pnpm** – `npm i -g pnpm`
* **Supabase CLI** (optional for local DB) – `npm i -g supabase`
* Spotify developer account to create OAuth credentials

### 2. Clone & Install

```bash
# Clone
git clone https://github.com/mwsun2165/rankify.git
cd rankify

# Install all workspace deps
pnpm install
```

### 3. Environment Variables

Create a `.env.local` in the project root (never commit real secrets!).
Reference `.env.example` to setup the right variables.

You can also copy the example and fill in values:

```bash
cp .env.example .env.local
```

### 4. Supabase Local Dev (optional)

If you want to run the database locally:

```bash
# Start Postgres + APIs
supabase start

# Apply migrations & seed data
supabase db reset
```

_(When using the hosted Supabase dashboard you can skip this step – just paste the URL/keys into `.env.local`.)_

### 5. Run the App

```bash
# From repo root
cd frontend
pnpm dev
# → http://localhost:3000
```

---

## Repo Structure

```
rankify/
├─ frontend/          # Next.js app (App Router)
├─ supabase/          # DB migrations, seed, config.toml
├─ packages/
│  └─ db-types/       # Auto-generated shared TypeScript DB types
└─ README.md
```

---

## Scripts

| Command (root)           | Description                       |
|--------------------------|-----------------------------------|
| `pnpm install`           | Install workspace dependencies    |
| `supabase start`         | Run local Postgres + APIs         |
| `supabase db reset`      | Reset & apply migrations          |
| *(frontend)* `pnpm dev`  | Start Next.js dev server          |

---

## Contributing

1. Fork the repo & create a branch.
2. Follow the setup above.
3. Submit a PR – no test requirement for now (per project preference).

Happy ranking! 🎵
