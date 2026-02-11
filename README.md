# 🟣 Guru — Mobile Repair Solutions

> **"Better than when you gave it to us."**

Premium iPhone repair delivered to your door. Guru connects customers with expert technicians for fast, transparent, and guaranteed mobile repair.

## Quick Start

```bash
# Install all dependencies
npm install

# Run customer portal (localhost:5173)
npm run dev:customer

# Run technician portal (localhost:5174)
npm run dev:tech

# Run both simultaneously
npm run dev
```

## Project Structure

```
packages/
├── shared/       # Shared constants, Supabase client, design system
├── customer/     # Customer-facing portal (Vite + React)
└── technician/   # Technician portal (Vite + React)
supabase/
└── schema.sql    # Database schema (paste into Supabase SQL Editor)
```

## Tech Stack

- **Frontend**: Vite + React 19 + React Router 7
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Styling**: Vanilla CSS (Apple-inspired design system)
- **Deployment**: AWS (user-managed)

## Environment Variables

Create a `.env` file in each portal directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Documentation

- [GURU_BASELINE.md](./GURU_BASELINE.md) — Project source of truth
- [supabase/schema.sql](./supabase/schema.sql) — Database schema

---

Built with 💜 by the Guru team
