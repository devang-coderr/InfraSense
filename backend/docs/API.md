# InfraSense API reference

Base URL (local dev): `http://localhost:8000/api/v1`

Every response is wrapped:
```json
{ "success": true, "data": { ... }, "message": "..." }
```
or on error:
```json
{ "success": false, "error": { "code": "ISSUE_NOT_FOUND", "message": "Issue not found." } }
```

Send the login token as `Authorization: Bearer <token>` on every
protected endpoint.

---

## Auth

| Method | Endpoint | Auth | Role | Request | Response | Table(s) | Frontend screen |
|---|---|---|---|---|---|---|---|
| POST | `/auth/register` | No | Public | name, email, password, role | token + user | users | `/signup` |
| POST | `/auth/login` | No | Public | email, password | token + user | users | `/login` |
| GET | `/auth/me` | Yes | Any | — | user | users | (any authed page) |
| POST | `/auth/logout` | No | Any | — | message only | — | (any authed page) |

## Users

| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/users/me` | Yes | Any |
| PATCH | `/users/me` | Yes | Any |

## Departments / Wards

| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/departments` | Yes | Any |
| GET | `/wards` | Yes | Any |
| GET | `/wards/{id}` | Yes | Any |

## Media / AI

| Method | Endpoint | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/media/upload` | Yes | Any | multipart file, 10MB max, jpeg/png/webp/mp4 |
| POST | `/ai/analyze-image` | Yes | Any | **baseline placeholder** — see `app/ai/vision.py` |

## Issues

| Method | Endpoint | Auth | Role | Frontend screen |
|---|---|---|---|---|
| POST | `/issues` | Yes | Citizen | `/citizen/report` |
| GET | `/issues` | Yes | Any | `/citizen/reports` (with `mine=true`), `/authority` |
| GET | `/issues/map` | Yes | Any | `/authority/map` |
| GET | `/issues/nearby?lat=&lng=&radius=` | Yes | Any | duplicate-check UI |
| GET | `/issues/{id}` | Yes | Any | `/citizen/issue/[id]` |
| PATCH | `/issues/{id}` | Yes | Officer+ | `/authority/issues/[id]` |

Filters on `GET /issues`: `status`, `category`, `severity`, `department`, `ward`, `mine`.

## Citizen

| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/citizen/dashboard` | Yes | Citizen |
| GET | `/citizen/reports` | Yes | Citizen |
| GET | `/citizen/reports/{id}` | Yes | Citizen (own reports only) |

## Authority

| Method | Endpoint | Auth | Role | Frontend screen |
|---|---|---|---|---|
| GET | `/authority/dashboard` | Yes | Officer+ | `/authority` |
| GET | `/authority/priority` | Yes | Officer+ | `/authority/priority` |
| GET | `/authority/issues` | Yes | Officer+ | `/authority` |
| GET | `/authority/issues/{id}` | Yes | Officer+ | `/authority/issues/[id]` |
| GET | `/authority/map` | Yes | Officer+ | `/authority/map` |

## Work orders

| Method | Endpoint | Auth | Role |
|---|---|---|---|
| POST | `/work-orders` | Yes | Officer+ |
| GET | `/work-orders` | Yes | Officer+ |
| GET | `/work-orders/{id}` | Yes | Officer+ |
| PATCH | `/work-orders/{id}` | Yes | Officer+ |
| POST | `/work-orders/{id}/resolution-evidence` | Yes | Officer+ |

Status flow: `assigned → in_progress → completed → verification → resolved`

## Analytics

| Method | Endpoint | Auth | Role | Frontend screen |
|---|---|---|---|---|
| GET | `/analytics/categories` | Yes | Officer+ | `/authority/analytics` |
| GET | `/analytics/trends` | Yes | Officer+ | `/authority/analytics` |
| GET | `/analytics/resolution` | Yes | Officer+ | `/authority/analytics` |
| GET | `/analytics/health` | Yes | Officer+ | `/authority/analytics` |

## Predictions (baseline/rule-based — see disclosure in README)

| Method | Endpoint | Auth | Role | Frontend screen |
|---|---|---|---|---|
| GET | `/predictions/risks` | Yes | Officer+ | `/authority/predictions` |
| GET | `/predictions/hotspots` | Yes | Officer+ | `/authority/predictions` |
| GET | `/predictions/{ward_id}` | Yes | Officer+ | `/authority/predictions` |

## Notifications

| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/notifications` | Yes | Any |
| PATCH | `/notifications/{id}/read` | Yes | Any |

---

## Frontend page → backend mapping

| Frontend route | Calls |
|---|---|
| `/login` | `POST /auth/login` |
| `/signup` | `POST /auth/register` |
| `/citizen` | `GET /citizen/dashboard` |
| `/citizen/report` | `POST /ai/analyze-image` then `POST /issues` |
| `/citizen/reports` | `GET /citizen/reports` |
| `/citizen/issue/[id]` | `GET /issues/{id}` |
| `/authority` | `GET /authority/dashboard`, `GET /authority/issues` |
| `/authority/map` | `GET /authority/map` |
| `/authority/priority` | `GET /authority/priority` |
| `/authority/issues/[id]` | `GET /authority/issues/{id}`, `POST /work-orders` |
| `/authority/analytics` | `GET /analytics/*` |
| `/authority/predictions` | `GET /predictions/risks` |

---

## Why some planned endpoints were folded into others

The original planning notes listed `POST /ai/check-duplicate`,
`POST /ai/calculate-priority`, and `POST /ai/verify-resolution` as public
endpoints. They're implemented as **internal service functions**
(`duplicate_service`, `priority_service`, called from inside
`issue_service.create_issue_pipeline`) instead — the same document that
proposed them also noted "I would not expose every AI function publicly
in production." Exposing internal scoring steps as separate public
endpoints would let a client fake or skip steps in the pipeline; keeping
them internal means severity/duplicate/priority are always computed
together, server-side, exactly once per issue.
