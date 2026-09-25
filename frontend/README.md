# InfraSense — Frontend

AI-Powered Public Infrastructure Intelligence Platform.
Built for SIH 2026 as a complete, production-structured Next.js frontend.

## What this is

A real, working Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 codebase —
not a static mockup. It builds cleanly (`npm run build`) and every route below
is a real page you can click through.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

No environment variables or API keys are required to run the frontend —
everything currently runs on typed mock data in `lib/mocks.ts`, structured
so a backend team can swap it for real API calls (see "Connecting a backend"
below).

## Design system

- **Dark mode**: charcoal / graphite (`#0D0D0C` base), not navy — "a city at night"
- **Light mode**: warm ivory / stone (`#F5F3EE` base) — "a city waking up"
- **Accent**: muted amber/gold, used sparingly
- All tokens live in `app/globals.css` as CSS variables (`--bg`, `--surface`,
  `--text`, `--accent`, `--critical`, `--high`, `--medium`, `--low`, etc.)
  and are consumed by both Tailwind utilities and inline styles.
- Theme toggling is via `next-themes`, class-based (`.dark` on `<html>`).

## The signature 3D experience

`components/landing/Hero.tsx` + `components/3d/CityScene.tsx` implement a
genuine scroll-driven React Three Fiber scene — not a static image with CSS
rotation. As the user scrolls through the (tall, sticky) hero section, a
real camera rig interpolates between waypoints while a low-poly city, a
scanning pothole, merging duplicate-report nodes, severity heat zones and
predicted-risk rings appear and fade, matching the six-stage story:

`SEE -> UNDERSTAND -> CONNECT -> PRIORITIZE -> PREDICT -> ACT`

It's dynamically imported (`next/dynamic`, `ssr:false`) so it never blocks
first paint, and falls back to a static gradient when
`prefers-reduced-motion: reduce` is set.

`components/3d/Particles.tsx` is a lightweight canvas background (not
Three.js) giving dark mode a "data-point starfield" and light mode "data
meteors," both cursor-reactive and reduced-motion aware.

## Routes implemented

```
/                             Cinematic landing page (all sections below)
/citizen                      Citizen home
/citizen/report                Report an issue (interactive AI-detection demo)
/citizen/reports                Track my reports
/citizen/issue/[id]              Single report tracking detail

/authority                     Command-center dashboard
/authority/map                   Live GIS map (filterable, hotspot heatmap)
/authority/priority               Priority queue (sortable by score)
/authority/issues/[id]              Issue Intelligence detail - explainable AI,
                                     duplicate count, status timeline, AI-assisted
                                     before/after resolution verification
/authority/analytics              Charts: category volume, resolution donut,
                                     12-week trend, infrastructure health
/authority/predictions            Predictive risk cards - risk %, "why", and
                                     recommended actions per ward

/about  /contact  /login  /signup
```

Landing page sections: Hero/3D, Problem stats, How InfraSense Thinks,
Mobile showcase (3 phones), For Citizens, For Authorities, Infrastructure
Health, Predictive Risk, **Explainable AI**, About, Contact, Footer.

## Explainability layer

Every AI-generated score in the app (severity, priority, ward risk) is
backed by a visible factor breakdown rather than a bare number — see
`lib/mocks.ts` (`severityFactors`, `priorityFactors`, `wardRisks[].reasons`)
and the `ScoreBar` component in `components/ui/Primitives.tsx`. This directly
implements the "AI that explains its decisions" requirement.

## Project structure

```
app/                    Next.js App Router routes (see above)
components/
  landing/              Hero, ProblemSection, HowItWorks, MobileShowcase,
                         CitizenSection, AuthoritySection, HealthSection,
                         PredictionSection, ExplainableAI, AboutSection,
                         ContactSection, Footer
  3d/                   CityScene.tsx, Particles.tsx
  navigation/           Navbar, ThemeToggle
  citizen/               ReportForm
  authority/             AuthorityShell (sidebar layout), GISMap, AnalyticsCharts
  ui/                    Button, Primitives (Card/Badge/ScoreBar/StatusPill),
                         PageHeader, CountUp
lib/
  types.ts              Issue / Severity / WardRisk / HealthCategory types
  mocks.ts              All demo data - swap this for real API calls
  useScrollProgress.ts   Hook powering the 3D scroll story
```

## Connecting a backend

Nothing is hard-wired to mock data at the component level — every page
imports from `lib/mocks.ts`. To connect a real API:

1. Create `lib/api/*.ts` service files matching the shapes in `lib/types.ts`
   (`Issue`, `WardRisk`, `HealthCategory`).
2. Replace the `lib/mocks.ts` imports in each page/component with calls to
   your new service functions (ideally via a data-fetching library or
   Next.js server components / route handlers).
3. The `ReportForm` component (`components/citizen/ReportForm.tsx`) currently
   simulates the AI-scan step with a `setTimeout` — replace `handleUpload`
   with a real upload + inference call.

## Notes on scope

This is a complete, coherent frontend covering the full citizen -> AI ->
authority -> prediction loop described in the product brief, built to be
handed to a backend team. A few things were deliberately kept simple for a
first build and can be extended:

- `/login` and `/signup` are styled but not wired to real auth.
- The GIS map is a stylised, dependency-free SVG/CSS map (no Mapbox key
  required) — swap in Mapbox/Leaflet by replacing `components/authority/GISMap.tsx`.
- All numbers, ward names and images are clearly sample/demo data.
