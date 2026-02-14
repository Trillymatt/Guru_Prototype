# CLAUDE.md — Guru Prototype

## Project Overview

Guru is a mobile repair platform connecting customers with technicians for on-site iPhone repairs. It consists of two independent React portals (customer-facing and technician-facing) sharing one Supabase backend, organized as an npm workspaces monorepo.

## Repository Structure

```
packages/
  shared/src/          # Shared utilities, components, design system
    supabase.js        # Supabase client initialization
    AuthProvider.jsx   # React Context auth provider (useAuth hook)
    RepairChat.jsx     # Real-time chat component (Supabase Realtime)
    GuruCalendar.jsx   # Calendar date picker
    constants.js       # Devices, repair types, pricing, statuses
    validation.js      # Email/phone validation
    theme.css          # CSS design system variables
    index.js           # Barrel export

  customer/            # Customer portal (port 5173)
    src/pages/         # LandingPage, RepairQuiz, LoginPage, DashboardPage, RepairDetailPage, ProfilePage
    src/components/    # Navbar, ProtectedRoute
    src/styles/        # Vanilla CSS files

  technician/          # Technician portal (port 5174, dark mode)
    src/pages/         # LoginPage, QueuePage, RepairDetailPage, HistoryPage, ProfilePage, SchedulePage
    src/components/    # TechNav, ProtectedRoute
    src/styles/        # Vanilla CSS files (tech-* prefixed)

supabase/
  schema.sql           # PostgreSQL schema with RLS policies
  migrations/          # Email notification triggers + pg_cron jobs
  functions/           # Edge Functions (TypeScript/Deno)
    send-repair-email/ # Email notifications via Resend

amplify.yml            # AWS Amplify build config (customer)
amplify-tech.yml       # AWS Amplify build config (technician)
GURU_BASELINE.md       # Source of truth documentation for business rules
```

## Tech Stack

- **Frontend:** React 19, React Router 7, Vite 6.1
- **Styling:** Vanilla CSS with CSS custom properties (Apple-inspired design system in `theme.css`)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Auth:** Supabase Auth — email/password, Google, Apple (customer); email/password only (technician)
- **Maps:** Leaflet.js (free, no API key)
- **Signatures:** signature_pad v5.0 (technician portal only)
- **Email:** Resend via Supabase Edge Functions
- **Deployment:** AWS Amplify (separate builds for each portal)
- **Package Manager:** npm workspaces

## Commands

```bash
# Install all dependencies (run from repo root)
npm install

# Development
npm run dev              # Run both portals simultaneously
npm run dev:customer     # Customer portal only (localhost:5173)
npm run dev:tech         # Technician portal only (localhost:5174)

# Build
npm run build            # Build both portals (sequential)
npm run build:customer   # Customer portal only → packages/customer/dist/
npm run build:tech       # Technician portal only → packages/technician/dist/
```

There is no test suite, linter, or formatter configured.

## Environment Variables

Each portal needs a `.env` file (see `.env.example`):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Place `.env` in both `packages/customer/` and `packages/technician/`.

## Architecture & Conventions

### Monorepo Imports

Both portals import shared code via the `@shared` path alias (configured in each `vite.config.js`), which resolves to `packages/shared/src/`. The shared package is also referenced as `@guru/shared` in package.json dependencies.

### Authentication Pattern

`AuthProvider.jsx` wraps the app and provides `useAuth()` → `{ user, session, loading, signOut }`. Both portals use `ProtectedRoute.jsx` components that check auth state and redirect to login.

### Styling

All styling is vanilla CSS — no Tailwind, no CSS-in-JS, no component libraries. The design system is defined in `packages/shared/src/theme.css` using CSS custom properties. Colors: purple (#7C3AED primary), white, black. The technician portal uses a dark theme variant via `app--tech dark` CSS class.

### Real-time Features

Chat, location tracking, and status updates use Supabase Realtime (PostgreSQL change subscriptions). `RepairChat.jsx` handles per-repair chat threads with optimistic updates and deduplication.

### Database

Core tables: `customers`, `technicians`, `repairs`, `messages`, `chat_last_read`, `tech_schedules`. All tables have Row-Level Security (RLS) enabled. The repair status flow is:

```
pending → confirmed → parts_ordered → parts_received →
scheduled → en_route → arrived → in_progress → complete
```

### File Language

All frontend code is JavaScript/JSX (not TypeScript). Only the Supabase Edge Function (`send-repair-email/index.ts`) uses TypeScript.

## Key Domain Data

- **Devices:** iPhone 11 through iPhone 17 (25 models)
- **Repair types:** 10 (Screen, Battery, Charging Port, Back Glass, Cameras, Speaker, Mic, Water Damage, Buttons, Software)
- **Parts tiers:** Economy (aftermarket), Premium (high-quality, recommended), Genuine Apple (OEM)
- **Service fee:** $29 flat
- **Tax rate:** 8.25% (Texas)
- **Scheduling rule:** Appointments must be 3+ days out (for parts ordering)
- All pricing data lives in `packages/shared/src/constants.js`

## Git Workflow

Development uses feature branches merged via pull requests. The main branch is `main`. Commit messages are descriptive and imperative. The primary contributor is Trillymatt.

## Important Notes

- `GURU_BASELINE.md` is the source of truth for business rules, brand identity, and architecture decisions
- No testing, linting, or formatting tooling is configured — do not assume any exist
- Payment integration is deferred (not in MVP scope)
- The customer and technician portals are deployed independently via separate AWS Amplify configs
