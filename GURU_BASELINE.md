# 🟣 Guru — Mobile Repair Solutions Platform

> **"Better than when you gave it to us."**
> This document is the single source of truth for understanding the Guru platform.
> Always refer back here when making architectural or feature decisions.

---

## Company Overview

**Guru** is a mobile repair solutions startup focused on:
- **Customer care** — making the repair process effortless
- **Speed & efficiency** — getting devices back fast
- **Quality** — delivering devices back better than received

**Brand Identity**: Apple-inspired, premium aesthetic
- **Primary**: Purple `#7C3AED` (vibrant) / `#6D28D9` (deep)
- **Secondary**: White `#FFFFFF`, Black `#0A0A0A`
- **Style**: Clean, minimal, glassmorphism, smooth animations

---

## Platform Architecture

### Two Portals, One Backend

```
┌──────────────────┐     ┌──────────────────┐
│  Customer Portal │     │ Technician Portal │
│   (Public Web)   │     │  (Internal Web)   │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         └────────┬───────────────┘
                  │
         ┌────────▼────────┐
         │    Supabase      │
         │  (Auth, DB,      │
         │   Realtime,      │
         │   Storage)       │
         └─────────────────┘
```

- **Two separate web applications** sharing one Supabase project
- Customer portal: `/customer/` — public-facing
- Technician portal: `/technician/` — internal, restricted access
- Deployed to **AWS** (user manages infrastructure)

### Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | Vite + React + React Router       |
| Styling      | Vanilla CSS (Apple-inspired)      |
| Backend/DB   | Supabase (PostgreSQL)             |
| Auth         | Supabase Auth                     |
| Realtime     | Supabase Realtime (subscriptions) |
| Maps         | Leaflet.js (open source, free)    |
| Signatures   | signature_pad (canvas-based)      |
| Notifications| Email (Supabase Edge Functions), SMS (Twilio — future) |
| Deployment   | AWS (user-managed)                |

---

## Supported Devices

iPhones only, dating back to iPhone 11:

| Device          | Year |
|-----------------|------|
| iPhone 11       | 2019 |
| iPhone 11 Pro   | 2019 |
| iPhone 11 Pro Max | 2019 |
| iPhone SE (2nd) | 2020 |
| iPhone 12 mini  | 2020 |
| iPhone 12       | 2020 |
| iPhone 12 Pro   | 2020 |
| iPhone 12 Pro Max | 2020 |
| iPhone 13 mini  | 2021 |
| iPhone 13       | 2021 |
| iPhone 13 Pro   | 2021 |
| iPhone 13 Pro Max | 2021 |
| iPhone SE (3rd) | 2022 |
| iPhone 14       | 2022 |
| iPhone 14 Plus  | 2022 |
| iPhone 14 Pro   | 2022 |
| iPhone 14 Pro Max | 2022 |
| iPhone 15       | 2023 |
| iPhone 15 Plus  | 2023 |
| iPhone 15 Pro   | 2023 |
| iPhone 15 Pro Max | 2023 |
| iPhone 16       | 2024 |
| iPhone 16 Plus  | 2024 |
| iPhone 16 Pro   | 2024 |
| iPhone 16 Pro Max | 2024 |
| iPhone 16e      | 2025 |

---

## Common Repair Types

- Screen Replacement (cracked / unresponsive)
- Battery Replacement
- Charging Port Repair
- Back Glass Replacement
- Camera Repair (front / rear)
- Speaker / Microphone Repair
- Water Damage Diagnosis & Repair
- Button Repair (power / volume)
- Software Issues (restore, updates)

---

## 3-Tier Parts Pricing Model

| Tier | Label         | Quality      | Price   | Description                          |
|------|---------------|--------------|---------|--------------------------------------|
| 1    | Economy       | Aftermarket  | $       | Budget-friendly, functional parts    |
| 2    | Premium       | High-Quality | $$      | Good quality, reliable performance   |
| 3    | Genuine Apple | OEM / Apple  | $$$     | Apple-certified, best quality        |

Parts are currently ordered per-repair (3-day lead time). As inventory grows, on-demand repairs will become possible.

---

## User Roles

### Customer
- **Auth**: Email OTP (magic code via email)
- **Capabilities**:
  - Submit repair request via guided quiz
  - Choose device, issue, and parts tier
  - Schedule appointment (3+ days out for parts ordering)
  - Provide location for on-site repair
  - Track technician en route via map
  - Live chat with technician (during active repair)
  - Receive email/SMS updates (based on preference)
  - Sign legal documentation digitally

### Technician
- **Auth**: Email/password only (admin-created accounts)
- **Capabilities**:
  - View repair queue (available jobs)
  - Pick up / get assigned to repairs
  - Update repair status (en route → arrived → in progress → complete)
  - Share live location when en route
  - Chat with customer (during active repair)
  - Capture customer signature on legal documents
  - View repair history

---

## Customer Journey (Repair Flow)

```
1. LAND → Landing page
2. START REPAIR → Begin quiz (guest or logged in)
3. SELECT DEVICE → Pick iPhone model
4. SELECT ISSUE → Choose what's wrong (multi-select)
5. CHOOSE TIER → Pick parts quality (Economy / Premium / Genuine)
6. VIEW QUOTE → See estimated pricing
7. SCHEDULE → Pick date/time (3+ days out)
8. LOCATION → Enter address for on-site repair
9. CONFIRM → Review & submit repair request
10. WAIT → Receive status updates (email/SMS)
11. TRACK → Watch technician en route on map
12. CHAT → Communicate with tech during repair
13. SIGN → Digital signature on legal docs
14. COMPLETE → Receive completion confirmation
```

---

## Technician Journey

```
1. LOGIN → Email authentication
2. DASHBOARD → View repair queue
3. ACCEPT → Pick up a repair job
4. PREPARE → Order parts if needed, confirm with customer
5. EN ROUTE → Start navigation, share live location
6. ARRIVE → Mark as arrived
7. DIAGNOSE → Confirm issue, present legal docs for signature
8. REPAIR → Update status, chat with customer
9. COMPLETE → Mark as done, customer confirmation
```

---

## Real-Time Features (Active Repair Phase Only)

These features activate once a technician marks a repair as "en route":
- **Live Location Tracking** — Technician shares GPS, customer sees map
- **Live Chat** — Bidirectional messaging between customer & technician
- **Status Updates** — Real-time status changes pushed via Supabase Realtime

---

## Communication Preferences

Customers choose their preferred notification method:
- **Email** — Order confirmations, status updates, completion notice
- **SMS** — Same as email but via text (Twilio — future integration)
- **Both** — Receive on all channels

---

## Legal Documentation

- Technicians present a digital repair agreement before starting work
- Customer signs on-screen using `signature_pad`
- Signature + timestamp + agreement text stored in Supabase
- Both parties receive a copy via email

---

## Payment (Deferred)

Payment integration is **not in scope for MVP**. Decision pending on:
- Deposit upfront vs. payment after completion
- Payment processor selection (Stripe recommended when ready)

---

## Database Schema (Supabase / PostgreSQL)

### Key Tables

| Table              | Purpose                                    |
|--------------------|--------------------------------------------|
| `users`            | All users (customers + technicians)        |
| `profiles`         | Extended profile info, role, preferences   |
| `devices`          | iPhone models catalog                      |
| `repair_types`     | Types of repairs offered                   |
| `parts_tiers`      | 3-tier pricing per device + repair combo   |
| `repair_requests`  | Customer repair submissions                |
| `appointments`     | Scheduled date/time/location               |
| `repair_status`    | Status history for each repair             |
| `messages`         | Chat messages between customer & tech      |
| `signatures`       | Digital signature records                  |
| `technician_locations` | Live GPS coordinates (ephemeral)       |

---

## Folder Structure

```
Guru_Prototype/
├── packages/
│   ├── shared/            # Shared utilities, types, Supabase client
│   │   ├── src/
│   │   │   ├── supabase.js
│   │   │   ├── types.js
│   │   │   └── constants.js
│   │   └── package.json
│   ├── customer/          # Customer-facing portal
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   └── package.json
│   └── technician/        # Technician portal
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── styles/
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── index.html
│       └── package.json
├── GURU_BASELINE.md       # ← This file (source of truth)
├── package.json           # Workspace root
└── README.md
```

---

## Notes & Decisions Log

| Date       | Decision                                                  |
|------------|-----------------------------------------------------------|
| 2026-02-10 | Two separate portals, one Supabase backend                |
| 2026-02-10 | No payment integration for MVP                            |
| 2026-02-10 | No automatic technician matching — manual queue pickup    |
| 2026-02-10 | Parts ordered per-repair, 3-day lead time for scheduling  |
| 2026-02-10 | iPhone 11+ only                                           |
| 2026-02-10 | AWS deployment (user-managed)                             |
| 2026-02-10 | Supabase for all backend services                         |

---

*Last updated: February 10, 2026*
