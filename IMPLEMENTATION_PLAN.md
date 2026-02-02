# Vestwise User Authentication & PostgreSQL Implementation

> Implemented: 2026-02-01
> Status: Complete (Python/FastAPI backend)

## Overview
Added user authentication (Supabase Auth) and PostgreSQL (self-hosted in k8s) to vestwise, replacing AWS Lambda + S3 completely.

## Architecture
- **Backend**: Python + FastAPI (`/api` directory)
- **API routing**: Path-based (`/api/*`) - same origin
- **Auth**: Supabase Auth, self-hosted Postgres for app data
- **Data**: All configs require login

---

## What Was Implemented

### Phase 1: Backend API Service (Python/FastAPI)

Created `/api` directory structure:
```
api/
├── src/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Env configuration
│   ├── db.py                # Postgres connection pool (asyncpg)
│   ├── middleware/
│   │   └── auth.py          # Supabase JWT validation
│   ├── routes/
│   │   ├── health.py        # Health endpoints
│   │   └── configs.py       # CRUD endpoints
│   └── models/
│       └── config.py        # Pydantic models
├── requirements.txt
├── Dockerfile
└── .env.example
```

API Endpoints:
- `GET /api/health` - Health check (public)
- `GET /api/health/ready` - Readiness check with DB
- `GET /api/configs` - List user's configs
- `GET /api/configs/:id` - Get specific config
- `POST /api/configs` - Create config
- `PUT /api/configs/:id` - Update config
- `DELETE /api/configs/:id` - Delete config

---

### Phase 2: PostgreSQL in Kubernetes

Updated `infrastructure/index.ts` with:
- PostgreSQL credentials secret
- Init SQL ConfigMap with schema
- PersistentVolume + PVC (2Gi)
- StatefulSet (postgres:16-alpine)
- ClusterIP Service
- Daily backup CronJob

Database Schema:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('rsu', 'pension')),
    name VARCHAR(255),
    config_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### Phase 3: Frontend Authentication

Created:
- `src/lib/supabase.ts` - Supabase client
- `src/contexts/AuthContext.tsx` - Auth provider with email/Google/Apple sign-in
- `src/components/ProtectedRoute.tsx` - Route guard
- `src/pages/Login.tsx` - Login/signup page

Modified:
- `src/App.tsx` - AuthProvider wrapper, protected routes
- `src/components/Header.tsx` - User menu with sign out
- `src/services/configService.ts` - Authenticated API calls
- `src/uk_rsu_espp_calculator.tsx` - Updated save/load
- `src/pages/PensionCalculator.tsx` - Updated save/load

---

### Phase 4: CI/CD Updates

Updated `.github/workflows/deploy.yml`:
- Build React with Supabase env vars
- Build & push two Docker images (frontend + API)
- Deploy both with Pulumi
- Verify both deployments

---

### Phase 5: Cleanup

Deleted:
- `infrastructure/lambda/save.js`
- `infrastructure/lambda/load.js`

---

## Required GitHub Secrets

```
SUPABASE_URL          - Supabase project URL
SUPABASE_ANON_KEY     - Supabase anonymous key
```

## Required Pulumi Config (encrypted)

```bash
pulumi config set --secret pgPassword "your-postgres-password"
pulumi config set --secret supabaseUrl "https://xxx.supabase.co"
pulumi config set --secret supabaseAnonKey "eyJhbG..."
pulumi config set --secret supabaseJwtSecret "your-jwt-secret"
```

---

## Supabase Setup (manual)

1. Create project at https://supabase.com
2. Enable Email auth (default)
3. Configure Google OAuth (optional)
4. Configure Apple OAuth (optional)
5. Copy URL, anon key, and JWT secret to secrets

---

## Verification

1. **Backend API**: `curl https://vestwise.co.uk/api/health`
2. **Database**: `kubectl exec -n vestwise postgres-0 -- psql -U vestwise -c '\dt'`
3. **Auth flow**: Login page at /login
4. **Save/Load**: Authenticated user can save configs
5. **CI/CD**: Push to main deploys both frontend and API
