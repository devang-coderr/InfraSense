# InfraSense — AI-Powered Road Infrastructure Monitoring System

> **A real-time, data-driven public infrastructure management platform connecting citizen reports with automated authority workflows, AI issue intelligence, priority scoring, and GIS tracking.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [System Architecture & Workflow](#system-architecture--workflow)
- [AI / ML Approach & Disclosure](#ai--ml-approach--disclosure)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Current Project Status](#current-project-status)
- [Future Scope](#future-scope)
- [Contributors](#contributors)

---

## 🌟 Overview

**InfraSense** bridges the gap between public defect reporting and municipal infrastructure maintenance. Built with a **Next.js 16 App Router** frontend and a modular **FastAPI** backend, the system enables citizens to upload evidence photos of road damage, automatically routes issues to municipal departments, computes severity and priority scores based on explainable factors, and provides municipal authorities with real-time GIS maps, priority queues, and resolution verification tools.

---

## 🔴 Problem Statement

Municipalities face significant challenges in managing road infrastructure:
1. **Delayed Detection & Reporting**: Road defects (potholes, water leakage, open manholes) often go unnoticed until major accidents occur.
2. **Duplicate Noise & Misrouting**: Citizen reports frequently flood department inboxes with duplicate tickets and mislabeled categories.
3. **Subjective Prioritization**: Maintenance teams lack an objective, data-backed mechanism to determine which issue to fix first.
4. **Lack of Resolution Verification**: Citizens have minimal visibility into post-repair status, creating distrust in public services.

**InfraSense** addresses these challenges by automating issue classification, duplicate detection, severity scoring, department assignment, and verification workflows.

---

## ✨ Key Features

### 👤 Citizen Portal
- **Interactive Photo Upload**: Upload evidence photos with automatic preview and media validation.
- **AI-Assisted Issue Analysis**: Extracts issue categories and calculates initial severity ratings.
- **Real-Time Issue Tracking**: Monitor issue progression through a multi-stage status timeline (`Submitted` → `Verified` → `In Progress` → `Resolved`).
- **Personal Dashboard**: View submitted reports, location badges, and authority updates.

### 🏛️ Authority Command Center
- **GIS Heatmap & Ward Mapping**: Interactive map displaying issue locations, severity heat zones, and spatial filters.
- **Explainable Priority Queue**: Algorithmic sorting of reported issues based on impact score, structural damage baseline, community upvotes, and duplicate frequency.
- **Issue Intelligence View**: In-depth issue diagnostics, factor breakdowns, spatial duplicate detection nodes, and assigned departments.
- **Work Order & Status Management**: Direct authority actions to assign field units, update work orders, and perform AI-assisted before/after resolution verification.
- **Infrastructure Health Analytics**: Real-time aggregation of municipal ward health index, response metrics, and 12-week volume trends.
- **Predictive Risk Modeling**: Ward-level vulnerability index derived from historical density, decay factors, and weather exposure baselines.

---

## 🔄 System Architecture & Workflow

```
Citizen App                 FastAPI Backend                      Database & Storage
 [Photo Upload]  ─────►  POST /api/v1/ai/analyze-issue  ─────► [Rule-Based Vision Engine]
                                   │
 [Submit Report] ─────►  POST /api/v1/issues           ─────► [SQLAlchemy / SQLite]
                                   │
                                   ├──► Duplicate Detection (Haversine + Spatial Radius)
                                   ├──► Severity Baseline + Damage Calculation
                                   ├──► Department Auto-Routing (Roads/Water/Electrical/Sanitation)
                                   └──► Priority Score Engine (Damage + Upvotes + Duplicates)
                                   │
Authority Portal ◄─────  GET /api/v1/authority/*       ◄───── [Real-Time GIS & Analytics]
```

### End-to-End Workflow:
1. **Citizen Submission**: Citizen uploads photo evidence + issue description.
2. **AI Analysis**: System analyzes description and evidence to extract category & initial severity.
3. **Duplicate Detection**: Computes geographical proximity (Haversine formula) to identify existing nearby issues within threshold radius.
4. **Automated Routing & Severity**: Assigns relevant municipal department (`Roads`, `Water`, `Electrical`, `Sanitation`, `Traffic`) and calculates damage score.
5. **Priority Queueing**: Computes unified priority score ($0-100$) and exposes factor breakdowns to authority users.
6. **Resolution Verification**: Field workers upload post-repair photos for comparison against original evidence.

---

## 🤖 AI / ML Approach & Disclosure

- **Current Implementation**: The current backend implements a **lightweight, deterministic rule-based baseline AI classifier** (`backend/app/ai/vision.py`). It analyzes keyword indicators and structural rules to generate baseline confidence scores and category tagging without requiring external heavy GPU dependencies during local development.
- **AI Explainability Layer**: All severity, priority, and ward risk calculations present transparent, human-readable factor breakdowns (structural damage, traffic density, public impact) rather than black-box outputs.
- **ML Roadmap**: Prepared for seamless drop-in integration of an **EfficientNet-B0 transfer learning model** trained on public road damage datasets for pixel-level visual feature extraction.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + `next-themes` (Dark/Light mode)
- **3D & Graphics**: Three.js / React Three Fiber + Canvas Starfield
- **Icons & UI**: Lucide React + Radix UI Primitives

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **ORM & Migrations**: SQLAlchemy 2.0 + Alembic
- **Validation**: Pydantic v2
- **Auth**: Passlib (Bcrypt) + PyJWT (Bearer Token authentication)

---

## 📁 Repository Structure

```
InfraSense/
├── backend/
│   ├── app/
│   │   ├── ai/               # Baseline AI classifier engine
│   │   ├── core/             # Configuration, security (JWT), exceptions
│   │   ├── database/         # SQLAlchemy engine & DB session setup
│   │   ├── models/           # Database models (User, Issue, AIAnalysis, WorkOrder, etc.)
│   │   ├── routes/           # REST API endpoints (Auth, Issues, Authority, Analytics)
│   │   ├── schemas/          # Pydantic schemas for request/response validation
│   │   ├── services/         # Core business logic & scoring algorithms
│   │   └── storage/          # Local disk / Supabase media storage provider
│   ├── alembic/              # Database schema migration files
│   ├── tests/                # Pytest unit & integration test suite
│   ├── seed.py               # Database seeder (creates test accounts & sample issues)
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
├── frontend/
│   ├── app/                  # Next.js App Router pages (Citizen, Authority, Public)
│   ├── components/           # UI components, 3D Canvas scenes, maps, charts
│   ├── lib/                  # API client, types, state management, mocks
│   ├── package.json          # Node dependencies & scripts
│   └── .env.local.example    # Frontend environment template
├── .gitignore                # Root gitignore rules
├── .env.example              # Root environment template
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **Python**: `v3.10` - `v3.12`
- **Git**

---

### 🐍 Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Defaults to local SQLite database with zero external setup required)*.

5. **Seed database with test data**:
   ```bash
   python seed.py
   ```
   *Creates seed accounts:*
   - **Citizen**: `citizen@infrasense.gov.in` / `password123`
   - **Authority**: `authority@infrasense.gov.in` / `password123`

6. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 💻 Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   - **Application URL**: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Environment Variables

Environment templates are provided in `.env.example` (Root), `backend/.env.example`, and `frontend/.env.local.example`.

> [!IMPORTANT]
> Never commit real secrets, private API keys, JWT secret keys, or database credentials to Git repositories.

### Key Environment Variables:
- `DATABASE_URL`: Connection string for SQLAlchemy (defaults to `sqlite:///./infrasense.db`).
- `SECRET_KEY`: Random string for JWT token signing.
- `CORS_ORIGINS`: Allowed origins for cross-origin API calls (defaults to `http://localhost:3000`).
- `NEXT_PUBLIC_API_URL`: Backend API base URL for Next.js frontend calls (`http://localhost:8000/api/v1`).

---

## 📊 Current Project Status

- ✅ **Full Stack Integration**: Complete end-to-end integration between Next.js frontend and FastAPI backend.
- ✅ **Authentication**: JWT authentication with role-based routing (Citizen vs Authority).
- ✅ **Issue Lifecycle Pipeline**: Full report creation, photo upload, duplicate detection, department routing, and priority queueing.
- ✅ **GIS Mapping & Heatmap**: Interactive map filtering by severity, category, and municipal ward.
- ✅ **Resolution Verification**: Assisted before/after repair verification flow.
- ⚙️ **Baseline AI**: Keyword/rule-based vision classifier (`is_baseline: true` disclosure in API responses).

---

## 🔮 Future Scope

- 🎯 **Deep Learning Vision Model**: Fine-tuning EfficientNet-B0 on custom road defect datasets.
- 📡 **IoT Sensor Integration**: Connecting telematics and accelerometer data from municipal fleet vehicles for passive defect scanning.
- 🏢 **Multi-Department Dispatching**: Deep integration with municipal ERP and work order dispatch APIs.
- 📱 **Offline Citizen Mobile App**: React Native mobile app with offline report drafting and GPS geotagging.

---

## 👥 Contributors

- **Devang & InfraSense Engineering Team**

---

*InfraSense — Built for Smart Infrastructure & Safer Cities.*
