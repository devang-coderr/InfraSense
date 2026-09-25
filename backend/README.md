# InfraSense Backend

A FastAPI backend built to make the existing InfraSense Next.js frontend
fully functional — real authentication, real issue reporting, real
duplicate detection, severity/priority scoring, authority dashboards,
work orders, analytics, and a baseline risk predictor.

**Read this whole file once before running anything.** It's written for
someone who hasn't built a backend before — every command and every
credential is explained.

---

## 1. What this actually is (honest summary)

- **Real**: authentication (JWT), database (SQLite by default, Postgres-
  ready), the full issue-reporting pipeline, severity/priority scoring,
  duplicate detection, department routing, work orders, analytics
  (real SQL aggregation, not hardcoded numbers), file upload.
- **Baseline / placeholder, clearly labelled `is_baseline: true` in the
  API**: the "AI" that classifies a photo (`app/ai/vision.py`) and the
  ward risk predictor (`app/services/prediction_service.py`). Neither is
  a trained model — see those files' docstrings for exactly what they
  do and how to swap in a real model later. **Do not present these as
  trained AI in a report or demo** — call them "baseline/rule-based," as
  the API itself does.
- **Simplified from the original PostGIS plan**: no PostGIS extension.
  GIS features (nearest ward, nearby issues, map positioning) use plain
  lat/lng + the haversine formula. This was a deliberate trade-off — see
  `app/services/gis_service.py` docstring — because installing PostGIS is
  a real hurdle on a fresh Windows machine, and it isn't needed at this
  project's scale.

---

## 2. Architecture

```
Frontend (Next.js, unchanged)
        │  fetch() with JWT bearer token
        ▼
FastAPI  (app/routes/*.py)       — receives HTTP requests only
        ▼
Services (app/services/*.py)     — all business logic lives here
        ▼
SQLAlchemy models (app/database/models/*.py)
        ▼
SQLite (dev, zero setup) or PostgreSQL (production)
```

A **modular monolith** — one FastAPI process, organised into folders by
responsibility. No microservices, no Redis, no Celery, no Kubernetes.
That's a deliberate choice for a project this size (see spec's own "Do
not overengineer" instruction).

### Folder structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, route registration
│   ├── core/
│   │   ├── config.py           # reads .env
│   │   ├── security.py         # password hashing + JWT
│   │   ├── dependencies.py     # get_current_user, role guards
│   │   ├── response.py         # {"success", "data"} envelope helper
│   │   └── exceptions.py       # centralized error handling
│   ├── database/
│   │   ├── database.py         # SQLAlchemy engine/session
│   │   └── models/              # one file per table
│   ├── schemas/                 # Pydantic request/response shapes
│   ├── routes/                  # HTTP endpoints only — no logic here
│   ├── services/                # all business logic
│   ├── ai/vision.py             # baseline "AI" — see disclosure above
│   └── storage/                 # local disk / Supabase file storage
├── alembic/                      # database migrations
├── tests/                        # pytest suite
├── seed.py                       # creates test accounts + sample data
├── requirements.txt
├── .env.example
├── Dockerfile / docker-compose.yml  (optional)
└── README.md                     # this file
```

---

## 3. Beginner glossary (read once, skip if familiar)

| Term | Plain-English meaning |
|---|---|
| **API** | A set of URLs your frontend calls to get/send data, instead of talking to the database directly. |
| **REST** | A style of API where URLs represent "things" (`/issues`) and HTTP verbs represent actions (GET=read, POST=create, PATCH=update). |
| **Endpoint** | One specific URL+verb combination, e.g. `POST /api/v1/issues`. |
| **HTTP** | The protocol browsers/servers use to talk. Every API call is an HTTP request. |
| **JSON** | The text format almost all APIs use to send data — `{"key": "value"}`. |
| **FastAPI** | The Python framework this backend is built with. |
| **PostgreSQL** | A production-grade database. This project defaults to SQLite (simpler) but can switch to Postgres with one env variable. |
| **SQLAlchemy** | The Python library that turns Python classes into database tables and back. |
| **Alembic** | The tool that tracks database schema changes over time ("migrations") so you never manually recreate tables. |
| **JWT (JSON Web Token)** | A signed string proving "this is user #12, logged in until [time]". The frontend stores it and sends it on every request. |
| **Middleware** | Code that runs on every request before your route, e.g. CORS checking. |
| **CORS** | A browser security rule: your API must explicitly say "yes, http://localhost:3000 may call me." |
| **Environment variable / .env** | A place to put configuration (URLs, secrets) OUTSIDE your code, so code never contains passwords. |
| **Authentication** | Proving *who* you are (login). |
| **Authorization** | Deciding *what* you're allowed to do once we know who you are (e.g. only officers see the authority dashboard). |
| **API key / secret key / service-role key** | Different flavours of "password for a service": an API key identifies your app to a third party; a secret key signs your own JWTs; a service-role key is a Supabase master key that bypasses its normal access rules — never expose it to a browser. |
| **Connection string** | One string that contains everything needed to connect to a database (host, user, password, database name). |

---

## 4. Environment variables

Copy `.env.example` to `.env` in this folder and fill it in. Full
explanation of every variable is already inside `.env.example` as
comments. Quick summary:

| Variable | Required now? | Secret? | Where it's used |
|---|---|---|---|
| `DATABASE_URL` | Yes (default works instantly) | Not secret itself, but contains a password once you switch to Postgres | Backend |
| `SECRET_KEY` | Yes | **Yes** — you generate it, it's not from any website | Backend |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes (default fine) | No | Backend |
| `CORS_ORIGINS` | Yes (default fine for local dev) | No | Backend |
| `STORAGE_PROVIDER` | Yes (default `local`, zero setup) | No | Backend |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Only if `STORAGE_PROVIDER=supabase` | Service role key is **secret** | Backend only — NEVER the frontend |
| `AI_MODEL_PATH`, `WEATHER_API_KEY` | No — future | Would be secret | Backend, later |

**Generating `SECRET_KEY`:** run this once and paste the output into `.env`:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 5. Installation guide (Windows / PowerShell)

### Step 1 — Install Python
Download Python 3.12+ from python.org, run the installer, **check "Add
Python to PATH"**. Verify:
```powershell
python --version
```

### Step 2 — Set up the backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```
`venv\Scripts\activate` turns on a private Python environment just for
this project, so packages you install here don't clash with anything
else on your machine. You'll see `(venv)` appear in your prompt.

```powershell
pip install -r requirements.txt
```
This downloads FastAPI, SQLAlchemy, and everything else this project needs.

### Step 3 — Configure environment
```powershell
copy .env.example .env
```
Open `.env` in VS Code, set `SECRET_KEY` (see command above). Everything
else can stay at its default for local development.

### Step 4 — Create the database tables
```powershell
alembic upgrade head
```
This reads `alembic/versions/` and creates every table in `infrasense.db`
(a SQLite file that appears in this folder — that's your whole database,
nothing else to install).

### Step 5 — Seed test data
```powershell
python seed.py
```
Creates departments, wards, 3 test accounts, and a few sample issues so
the dashboards aren't empty. Test credentials are printed at the end —
also listed in section 9 below.

### Step 6 — Run the backend
```powershell
uvicorn app.main:app --reload
```
Leave this terminal running. Your API is now live at `http://localhost:8000`.

### Step 7 — Open the interactive docs
Go to `http://localhost:8000/docs` in your browser. This is Swagger UI —
every endpoint, testable from the browser, no extra tools needed.

---

## 6. Database setup — two options

**Option A — SQLite (default, what you just did).** Zero install, the
whole database is one file (`infrasense.db`). Perfect for development
and for a college/SIH demo. This is what `DATABASE_URL=sqlite:///./infrasense.db`
gives you out of the box.

**Option B — Cloud PostgreSQL via Supabase (recommended before any real
deployment).** Free tier, no local install, and gives you Postgres for
production. Steps:
1. Create a free account at supabase.com.
2. Create a new project (choose a database password — write it down).
3. In the project dashboard: Settings → Database → Connection string →
   copy the "URI" one.
4. It looks like: `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`
5. In your `.env`, set:
   ```
   DATABASE_URL=postgresql+psycopg://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
   (note the `+psycopg` — that tells SQLAlchemy which driver to use)
6. Uncomment `psycopg[binary]` in `requirements.txt` and `pip install -r requirements.txt` again.
7. Run `alembic upgrade head` and `python seed.py` again against this new database.

You do **not** need both — pick one. SQLite for local dev is genuinely
fine; switch to Option B only when you deploy somewhere real.

---

## 7. Supabase Storage setup (only if you want cloud file storage)

By default `STORAGE_PROVIDER=local` saves uploaded photos to
`backend/media/` on disk — nothing to configure, works immediately. Use
this for local development.

If you want files in the cloud (needed once you deploy, since a hosting
platform's disk usually isn't permanent):

1. In your Supabase project: Storage → Create a new bucket, e.g.
   `infrasense-media`. Choose **Public** (so uploaded photos can be
   viewed directly by URL) unless you specifically want private files.
2. Settings → API → copy the **Project URL** and the **service_role**
   key (NOT the `anon` key — that one's for the frontend in other kinds
   of apps, not what we need here).
3. In `.env`:
   ```
   STORAGE_PROVIDER=supabase
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (long string, keep secret)
   SUPABASE_STORAGE_BUCKET=infrasense-media
   ```
4. **The service_role key must NEVER be sent to the frontend or put in
   any `NEXT_PUBLIC_*` variable.** It can bypass every access rule in
   your Supabase project.
5. Test by uploading a file via `/docs` → `POST /api/v1/media/upload`
   (see section 10, "Testing file upload").

If you're using Supabase for BOTH the database and storage, that's one
account serving two purposes — you don't need two separate services.

---

## 8. Running frontend + backend together

Terminal 1:
```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

Terminal 2:
```powershell
cd infrasense    # the frontend folder
npm run dev
```

Then:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### Connecting the frontend

1. In the frontend folder (`infrasense/`), copy `.env.local.example` to
   `.env.local`.
2. It already contains the one variable needed:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
3. A `lib/api/` folder has been added to the frontend with real API
   calls (`auth.ts`, `issues.ts`, `media.ts`, `authority.ts`,
   `analytics.ts`, `predictions.ts`, `workOrders.ts`, `client.ts`).
   `lib/mocks.ts` and `lib/types.ts` were **not** touched.
4. `app/login/page.tsx`, `app/signup/page.tsx`, and
   `components/citizen/ReportForm.tsx` were updated to call these real
   API functions instead of doing nothing / faking a timeout — this was
   the **minimum change** needed to make those specific screens
   functional (see spec: "only make the minimum frontend changes
   required to connect APIs"). No visual/design change was made.
5. Every other page (`/citizen`, `/citizen/reports`, `/authority/*`)
   still imports from `lib/mocks.ts` — swap those imports for the
   matching `lib/api/*` function when you're ready (see table below).
   They were intentionally left alone so you can migrate one screen at
   a time and compare against the working mock version.

| Page currently uses | Replace with |
|---|---|
| `import { issues } from "@/lib/mocks"` | `import { getIssues } from "@/lib/api/issues"` (it's now `async`) |
| mock `wardRisks` | `import { getWardRisks } from "@/lib/api/predictions"` |
| mock `cityHealthScore`/`categorySeries` | `import { getHealth } from "@/lib/api/analytics"` |
| mock `trendSeries` | `import { getTrends } from "@/lib/api/analytics"` |

**Known gap:** the original frontend has no citizen login/signup screen
at all (only an authority login/signup exists) — `/citizen/report` calls
now require a logged-in user. Until a citizen auth screen is added,
log in as the seeded `citizen@infrasense.test` account via `/login`
(it will redirect to `/citizen` correctly) to test the report flow.
Adding a citizen-facing login screen was intentionally left undone here
since it's a new screen, not a wire-up of an existing one, and the spec
says not to redesign/add UI beyond what's needed.

---

## 9. Test accounts (created by `python seed.py`)

**LOCAL DEVELOPMENT ONLY — change or delete these before any real deployment.**

| Email | Password | Role |
|---|---|---|
| admin@infrasense.test | Password123! | super_admin |
| officer@infrasense.test | Password123! | officer (Roads dept) |
| citizen@infrasense.test | Password123! | citizen |

---

## 10. Testing the API via Swagger

Go to http://localhost:8000/docs.

1. Expand `POST /api/v1/auth/login`, click "Try it out", enter
   `citizen@infrasense.test` / `Password123!`, click Execute. Copy the
   `access_token` from the response.
2. Click the green **Authorize** button (top right), paste the token
   into the box (just the token, Swagger adds "Bearer " for you),
   click Authorize, then Close.
3. Now every endpoint you try will include your login automatically.
4. Try `POST /api/v1/issues` with a body like:
   ```json
   {"description": "Pothole near market", "latitude": 22.7196, "longitude": 75.8577}
   ```
5. Try `GET /api/v1/issues` to see it listed.
6. Log in as `officer@infrasense.test` instead (repeat step 1-2) to
   test `GET /api/v1/authority/dashboard`, `/authority/priority`, etc.

### Testing file upload
`POST /api/v1/media/upload` — click "Try it out", choose a small image
file, Execute. You'll get back a `file_url` — open
`http://localhost:8000` + that URL in your browser to confirm it saved.

---

## 11. Database migrations (Alembic) — going forward

The very first migration is already written for you
(`alembic/versions/ff5cd99a6c80_initial_schema.py`) so `alembic upgrade
head` works immediately. When you change a model later:

```powershell
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```
Never manually edit tables in the database — always change the
SQLAlchemy model, then generate a migration, so the schema history stays
tracked and reproducible on any machine.

---

## 12. Running tests

```powershell
pytest
```
Covers: registration/login, wrong password, duplicate email, protected
routes, the full issue-creation pipeline (AI → severity → duplicate
detection → priority → department), role-based access (citizen blocked
from authority routes), and the severity/priority/department scoring
functions directly. Not exhaustive, but covers the critical paths per
the project's own "don't require 100% coverage, focus on critical
behaviour" guidance.

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| `python : command not found` | Reinstall Python, check "Add to PATH" during install, restart terminal |
| `pip : command not found` | Same as above — pip ships with Python |
| Can't activate venv (execution policy error) | Run PowerShell as admin once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Address already in use` / port 8000 busy | Another process is using it — run `uvicorn app.main:app --reload --port 8001` and update `NEXT_PUBLIC_API_URL` to match |
| CORS error in browser console | Make sure `CORS_ORIGINS` in `.env` includes your frontend's exact URL (`http://localhost:3000`), then restart uvicorn |
| `401 Unauthorized` | You're not sending a token, or it expired — log in again |
| `403 Forbidden` | You're logged in but your role isn't allowed for that endpoint (e.g. a citizen calling `/authority/*`) |
| `404 Not Found` | Check the URL/ID — Swagger's `/docs` shows the exact path |
| `422 Unprocessable Entity` | Your request body is missing a required field or has the wrong type — Swagger shows exactly which field |
| `500 Internal Server Error` | Check the terminal running uvicorn — the real error is logged there, not shown to the client |
| Alembic says "target database is not up to date" | Run `alembic upgrade head` |
| `sqlite3.OperationalError: no such table` | You skipped `alembic upgrade head` — run it |
| Supabase upload fails | Double-check `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/bucket name; the error message from Supabase is passed straight through |
| Frontend can't reach backend | Confirm uvicorn is actually running, `NEXT_PUBLIC_API_URL` matches its port, and you restarted `npm run dev` after editing `.env.local` |

---

## 14. Security checklist

- [x] Passwords hashed with bcrypt, never stored/returned in plain text
- [x] JWT-based auth, `SECRET_KEY` only in `.env`
- [x] Role-based authorization on every authority/officer endpoint
- [x] `reported_by` always taken from the JWT, never trusted from the client
- [x] Pydantic validates every request body server-side
- [x] File type/size limits on uploads
- [x] `.env` is git-ignored; `.env.example` has no real secrets
- [x] Centralized error handler never leaks stack traces to the client
- [ ] **You must do before production**: change/remove the seeded test
      accounts, generate a fresh `SECRET_KEY`, set `CORS_ORIGINS` to your
      real frontend domain only (never `*`), switch to Postgres, enable
      HTTPS on your host.

---

## 15. Deployment (do this only after local dev + frontend integration work)

Recommended split:
- **Frontend** → Vercel (it's a Next.js app, this is the easiest fit)
- **Backend** → Render or Railway (both have a free/low-cost tier, both
  read `DATABASE_URL` etc. from their own dashboard's environment
  variables — same names as `.env.example`)
- **Database** → the managed Postgres from Supabase/Render/Railway
- **Storage** → Supabase Storage (see section 7)

Production checklist:
- Set every `.env` variable in your host's dashboard (never commit `.env`)
- `CORS_ORIGINS` = your real deployed frontend URL, not `localhost`
- `NEXT_PUBLIC_API_URL` in Vercel's env settings = your deployed backend URL
- Run `alembic upgrade head` against the production database once (most
  hosts let you run a one-off command, or add it to your start script)
- Run `python seed.py` only if you want the demo accounts in production
  too — otherwise register a real admin manually via `/docs`

---

## 16. What you must create yourself

| Item | Required now? | Where to get it | Secret? |
|---|---|---|---|
| Python installation | Yes | python.org | No |
| `SECRET_KEY` value | Yes | Generate yourself (command in section 4) | **Yes** |
| `.env` file | Yes | Copy from `.env.example` | Contains secrets |
| Supabase account | Only if using Postgres or Supabase Storage | supabase.com | Account itself no; keys yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Only if `STORAGE_PROVIDER=supabase` | Supabase dashboard → Settings → API | **Yes, backend-only** |
| `frontend/.env.local` | Yes, to connect frontend | Copy from `.env.local.example` | No |
| Test accounts | Auto-created by `seed.py` | — | Change before production |
| Weather / AI model API keys | No — future only | N/A yet | N/A |

Nothing here should be committed to Git — `.gitignore` already excludes `.env`.

---

## 17. What you need now vs later

**NOW (already implemented):**
Python, FastAPI, SQLite, SQLAlchemy, Alembic, JWT, CORS, local file
storage, every endpoint listed in `docs/API.md`.

**LATER (architecture supports it, not required for MVP):**
Real YOLO/PyTorch model (drop-in replacement for `app/ai/vision.py`),
NLP/text classification, image embeddings for smarter duplicate
detection, `pgvector`, PostGIS polygons, a real weather API, a real map
provider (Mapbox/Leaflet) for `/authority/map`, Redis/Celery for
background jobs, a trained prediction model.

None of these block anything you have today.

---

## 18. Your exact checklist

**Step 1 — Environment**
- [ ] Install Python 3.12+
- [ ] `cd backend && python -m venv venv && venv\Scripts\activate`
- [ ] `pip install -r requirements.txt`

**Step 2 — Configure**
- [ ] `copy .env.example .env`
- [ ] Generate and paste a `SECRET_KEY`

**Step 3 — Database**
- [ ] `alembic upgrade head`
- [ ] `python seed.py`

**Step 4 — Run backend**
- [ ] `uvicorn app.main:app --reload`
- [ ] Open http://localhost:8000/docs, test login with a seeded account

**Step 5 — Frontend**
- [ ] `cd infrasense && copy .env.local.example .env.local`
- [ ] `npm run dev`
- [ ] Visit http://localhost:3000/login, sign in as
      `citizen@infrasense.test` (redirects to `/citizen`)
- [ ] Try `/citizen/report` end to end — real AI-baseline scan, real
      submit

**Step 6 — Explore**
- [ ] Log in as `officer@infrasense.test` and check `/authority` pages
      still show mock data (expected — see section 8 migration table)
      until you swap those specific pages' imports over

**Step 7 — When ready for more**
- [ ] Swap remaining pages' `lib/mocks.ts` imports for `lib/api/*`
- [ ] Consider Postgres + Supabase Storage before deploying
- [ ] Plug in a real vision model in `app/ai/vision.py` when you have one
