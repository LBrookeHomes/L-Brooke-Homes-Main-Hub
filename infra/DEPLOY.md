# Weebrook — Deployment Guide

## Architecture

```
User browser
    │
    ▼
CloudFront distribution  (SSL termination, CDN)
    │
    ├── /api/*  ─────────────────────────────────────→  Lightsail instance
    ├── /public/* ───────────────────────────────────→  (nginx → Node.js:3001)
    │                                                      │
    └── /* (default) ──────────────────────────────→  S3  └── PostgreSQL (local)
```

One CloudFront domain serves everything — no CORS config needed.

---

## Cost (~$11.50/mo total)

| Resource | Cost | Notes |
|---|---|---|
| Lightsail $10/mo instance | $10.00 | 2 GB RAM, 1 vCPU, 60 GB SSD, 3 TB transfer |
| Lightsail static IP | $0.00 | Free while attached to a running instance |
| PostgreSQL on Lightsail | $0.00 | Runs on the same instance |
| S3 frontend bucket | ~$0.50 | Pennies for a Vite build |
| CloudFront | ~$1.00 | Low traffic |
| **Total** | **~$11.50/mo** | |

> **$5/mo plan** (1 GB RAM) also works for UAT — add a 1 GB swap file to handle
> `npm ci` during deploys without OOM-killing the process.

---

## One-time AWS setup

### 1. Lightsail instance

1. Go to **Lightsail → Create instance**
2. Platform: **Linux/Unix**
3. Blueprint: **OS Only → Ubuntu 22.04 LTS**
4. Plan: **$10/mo** (2 GB) — or $5/mo with swap
5. Give it a name: `weebrook-prod`
6. Create instance

**Attach a static IP** (so CloudFront origin never needs updating):
- Instance → **Networking** tab → **Create static IP** → Attach to `weebrook-prod`
- Note this IP — it becomes your CloudFront custom origin

**Open port 80** (CloudFront sends HTTP to the origin):
- Instance → **Networking** tab → **Firewall** → **Add rule**
- Protocol: HTTP, Port: 80, Source: Any

**Get your SSH key:**
- Lightsail → **Account** → **SSH keys** → Download the default key (`.pem`)
- Or use your own key pair — paste the public key into the instance at creation

### 2. S3 — Frontend bucket

The bucket is **completely private**. No object is ever publicly accessible by its
S3 URL. All traffic goes through CloudFront, which reads from S3 via Origin Access
Control (OAC). Direct `s3.amazonaws.com` URLs will return 403.

```bash
# Replace with your chosen bucket name
aws s3 mb s3://weebrook-frontend-prod --region us-east-1

# Block all public access
aws s3api put-public-access-block \
  --bucket weebrook-frontend-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Disable ACLs entirely (bucket owner enforced — required for OAC)
aws s3api put-bucket-ownership-controls \
  --bucket weebrook-frontend-prod \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

### 3. IAM — CI/CD credentials

Lightsail doesn't support IAM instance roles, so S3 uploads (work order photos etc.)
use a dedicated IAM user. Create one with the minimum policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::weebrook-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::weebrook-frontend-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::weebrook-frontend-prod"
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/CF_DISTRIBUTION_ID"
    }
  ]
}
```

Generate an **access key** for this user — the key ID and secret go into:
- `backend/.env` on the Lightsail instance (for S3 uploads at runtime)
- GitHub Secrets (for the frontend deploy workflow)

### 4. CloudFront distribution

Go to **CloudFront → Create distribution**.

**Origins — add two:**

| ID | Domain | Protocol | Port |
|---|---|---|---|
| `S3Origin` | `weebrook-frontend-prod.s3.us-east-1.amazonaws.com` | HTTPS (OAC) | 443 |
| `LightsailOrigin` | Your Lightsail static IP | **HTTP only** | **80** |

CloudFront terminates SSL; Lightsail only needs HTTP on port 80.

For `S3Origin`, choose **Origin Access Control (OAC)** → Create new OAC.

After saving the distribution, AWS shows a banner: **"Copy policy"** → paste it into
the S3 bucket under **Permissions → Bucket policy**. It looks like this (AWS fills in
the real account ID and distribution ID for you):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::weebrook-frontend-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

The `Condition` locks reads to **your specific distribution** — no other CloudFront
distribution (or anyone else) can read the bucket.

**Cache behaviors (most specific first):**

| Path pattern | Origin | Cache policy | Origin request policy |
|---|---|---|---|
| `/api/*` | LightsailOrigin | CachingDisabled | AllViewer |
| `/public/*` | LightsailOrigin | CachingDisabled | AllViewer |
| `*` (default) | S3Origin | CachingOptimized | — |

**Custom error pages** — two reasons these are required:

1. React Router — hard-refreshing `/projects/123` hits S3 looking for that key, which
   doesn't exist.
2. Private bucket — S3 returns **403** (not 404) for missing keys when public access is
   blocked. Without the 403 rule, users would see an XML error page instead of the app.

| HTTP error | Response page | Response code |
|---|---|---|
| 403 | /index.html | 200 |
| 404 | /index.html | 200 |

**Settings:**
- Price class: North America and Europe
- For a custom domain + HTTPS: add a CNAME, request a free ACM certificate

---

## First deploy (run once on the Lightsail instance)

```bash
# 1. SSH in
ssh -i your-key.pem ubuntu@YOUR_STATIC_IP

# 2. Run the setup script
scp -i your-key.pem infra/setup-lightsail.sh ubuntu@YOUR_STATIC_IP:~
ssh -i your-key.pem ubuntu@YOUR_STATIC_IP
bash setup-lightsail.sh

# 3. Create the .env file
cp /home/ubuntu/weebrook/backend/.env.production.example \
   /home/ubuntu/weebrook/backend/.env
nano /home/ubuntu/weebrook/backend/.env
# Fill in: DATABASE_URL, JWT_SECRET, AWS keys, S3_BUCKET, APP_URL

# 4. Build and start
cd /home/ubuntu/weebrook
npm ci
npm run build --workspace=backend
npm run migrate:deploy --workspace=backend
pm2 start /home/ubuntu/weebrook/infra/pm2.ecosystem.config.cjs
pm2 save

# 5. Verify
curl http://localhost:3001/health   # → {"ok":true}
curl http://YOUR_STATIC_IP/health   # → {"ok":true} (via nginx)
```

---

## GitHub Secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | `weebrook-frontend-prod` |
| `CF_DISTRIBUTION_ID` | CloudFront distribution ID |
| `LIGHTSAIL_HOST` | Your Lightsail static IP |
| `LIGHTSAIL_SSH_KEY` | Full contents of your `.pem` key file |

---

## CI/CD flow

**Frontend** — triggers on push to `frontend/**` or `shared/**`:
1. Build with `npm run build --workspace=frontend`
2. Sync `frontend/dist/` to S3 (hashed assets → 1-year cache; `index.html` → no cache)
3. Invalidate CloudFront `/*`

**Backend** — triggers on push to `backend/**` or `shared/**`:
1. SSH into Lightsail
2. `git pull` → `npm ci` → `tsc` build → `prisma migrate deploy` → `pm2 restart`

---

## Optional: swap file for $5/mo plan

If using the 1 GB Lightsail plan, add swap to handle `npm ci` spikes:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## First deploy checklist

- [ ] Lightsail instance created (Ubuntu 22.04, $10/mo)
- [ ] Static IP attached and noted
- [ ] Port 80 opened in Lightsail firewall
- [ ] Setup script run, PostgreSQL and nginx running
- [ ] `backend/.env` created with all values filled in
- [ ] App built and PM2 started; `curl localhost:3001/health` returns `{"ok":true}`
- [ ] S3 frontend bucket created (public access blocked)
- [ ] CloudFront distribution created with both origins
- [ ] Cache behaviors set (`/api/*` and `/public/*` → Lightsail, `/*` → S3)
- [ ] Custom error pages set (403/404 → /index.html with 200)
- [ ] S3 bucket policy updated with the OAC policy from CloudFront
- [ ] GitHub secrets all set (7 secrets)
- [ ] Push to `main` — both workflows trigger and pass
- [ ] `https://YOUR_CF_DOMAIN/` loads the app
- [ ] `https://YOUR_CF_DOMAIN/api/health` returns `{"ok":true}`
