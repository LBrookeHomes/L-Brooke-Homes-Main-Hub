# Weebrook — Railway + Vercel Deployment Guide

## Architecture

```
User browser
    │
    ├── weebrook.vercel.app  (Vercel CDN — Vite SPA)
    │       VITE_API_URL=https://weebrook-api.up.railway.app
    │
    └── weebrook-api.up.railway.app  (Railway — Node.js/Express)
            DATABASE_URL auto-injected from Railway Postgres plugin
            NODE_ENV=production, PORT auto-injected
```

No GitHub Actions needed. Both platforms watch your GitHub repo and
auto-deploy on push to `main`.

---

## Cost (~$5–15/mo)

| Resource | Cost | Notes |
|---|---|---|
| Railway Hobby plan | $5/mo base + usage | ~$5–10/mo for light UAT traffic |
| Vercel frontend | Free | Hobby plan, no bandwidth limit |
| S3 uploads bucket | ~$0.50/mo | Same IAM setup as Lightsail option |
| **Total** | **~$5.50–10.50/mo** | Cheaper than Lightsail, usage-based above $5 credit |

---

## Lightsail vs Railway — comparison

| | Lightsail + S3 + CloudFront | Railway + Vercel |
|---|---|---|
| Setup time | ~2 hrs | ~20 min |
| CI/CD | GitHub Actions (SSH deploy) | Zero — built into both platforms |
| DB | Self-managed PostgreSQL on instance | Managed Railway Postgres plugin |
| Migrations | Run in deploy script over SSH | Run in Railway start command |
| Static IP | Yes (free) | No — Railway assigns stable `.railway.app` URL |
| Same-origin routing | Yes (CloudFront proxies /api/* and /*) | No — separate domains, CORS required |
| Cold starts | None (PM2 always running) | None on Hobby plan (always-on) |
| Custom domain + SSL | CloudFront CNAME + ACM cert | Both platforms handle it for free |
| OS-level access | Full (SSH in anytime) | None (platform abstraction) |
| Vendor lock-in | AWS-specific | Railway-specific |

---

## Important: cross-origin cookies

Railway and Vercel are on different domains. JWT is stored in an httpOnly
cookie. For cross-origin `credentials: 'include'` requests to work, the
cookie must have `SameSite=None; Secure`.

**Before deploying to Railway + Vercel, update your auth route to set:**

```typescript
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
```

This is not needed for the Lightsail option (same-domain via CloudFront).

---

## One-time setup

### 1. Railway — backend + database

1. Go to **railway.app** → **New Project**
2. **Deploy from GitHub repo** → authorize Railway → select `weebrook`
3. Railway detects `railway.toml` and starts building the backend
4. In the service panel: click **+ New** → **Database** → **Add PostgreSQL**
   - Railway injects `DATABASE_URL` into your service automatically
5. Set environment variables (see table below)
6. **Deploy** — first deploy runs migrations then starts the server

### 2. Vercel — frontend

1. Go to **vercel.com** → **Add New Project** → import from GitHub
2. Set **build settings**:
   - Root directory: `/` (monorepo root — not `frontend/`)
   - Build command: auto-detected from `vercel.json`
   - Output directory: auto-detected from `vercel.json`
   - Framework preset: **Other**
3. Set environment variables (see table below)
4. **Deploy**

`vercel.json` at the repo root handles the SPA rewrite (React Router deep
links work on hard refresh).

---

## Environment variables

### Railway service

| Variable | Value |
|---|---|
| `DATABASE_URL` | **Auto-injected** — do not set manually |
| `NODE_ENV` | `production` |
| `PORT` | **Auto-injected** — do not set manually |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `7d` |
| `APP_URL` | Your Vercel URL, e.g. `https://weebrook.vercel.app` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM user key (same as Lightsail option) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `S3_BUCKET` | `weebrook-uploads` |
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | (same) |
| `VAPID_SUBJECT` | `mailto:you@yourdomain.com` |

### Vercel project

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Railway URL, e.g. `https://weebrook-api.up.railway.app` |

---

## Migrations

Defined in `railway.toml` — run automatically before the server starts on
every deploy. If a migration fails, Railway aborts the deploy and leaves
the previous version running.

---

## CI/CD flow

No GitHub Actions required:

- Push to `main` → Railway rebuilds and restarts the backend
- Push to `main` → Vercel rebuilds and republishes the frontend

To scope deploys:
- Railway: Service → **Settings** → **Source** → set **Watched Paths** to
  `backend/**` and `shared/**`
- Vercel: Project → **Settings** → **Git** → **Ignored Build Step** →
  `git diff HEAD^ HEAD --quiet -- frontend/ shared/` (exits 0 = skip build)

---

## Custom domain

Both support custom domains with free TLS:
- Railway: Service → **Settings** → **Domains** → Add domain
- Vercel: Project → **Settings** → **Domains** → Add domain

If using a custom domain, update `APP_URL` in Railway and `VITE_API_URL`
in Vercel to match.

---

## Deploy checklist

- [ ] `SameSite=None; Secure` cookie fix applied to auth route (see above)
- [ ] Railway project created, GitHub repo connected
- [ ] Railway PostgreSQL plugin added; `DATABASE_URL` shows as auto-injected
- [ ] Railway environment variables set, especially `APP_URL` → Vercel URL
- [ ] First Railway deploy succeeds; `/health` returns `{"ok":true}`
- [ ] Vercel project created, build settings point to monorepo root
- [ ] `VITE_API_URL` set in Vercel → Railway service URL
- [ ] First Vercel deploy succeeds; app loads
- [ ] GC login works (cookie round-trips cross-origin correctly)
- [ ] Push to `main` → both platforms rebuild automatically
