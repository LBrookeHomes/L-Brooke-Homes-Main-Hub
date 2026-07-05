# Weebrook — Setup & Run

## Prerequisites
- Node.js 18+
- Docker + Docker Compose

## First-time setup

```bash
# 1. Install all packages
npm install

# 2. Copy env (credentials already match docker-compose defaults)
cp .env.example .env

# 3. Start Postgres + MinIO
npm run db:up
# Wait ~10 seconds for containers to be ready

# 4. Run migrations
cd backend
DATABASE_URL=postgresql://weebrook:weebrook@localhost:5432/weebrook \
  npx prisma migrate dev --schema src/prisma/schema.prisma --name init

# 5. Seed database (GC admin + demo project with bath-kitchen template)
npm run seed

# 6. Run frontend + backend concurrently
cd ..
npm run dev
```

## Access
- GC Dashboard: http://localhost:5173
  - Email: admin@weebrook.app
  - Password: changeme

- MinIO web UI: http://localhost:9001
  - Username: weebrook  Password: weebrook123

- Demo client portal: send portal link from GC → Clients page
- Contractor work order: create a work order, assign contractor, click Send

## Generate VAPID keys (for Web Push)
```bash
cd backend && npx web-push generate-vapid-keys
# Copy VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY into .env
```

## Twilio (SMS)
Fill in TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env.
Without these set, SMS is stubbed (logged to console).

## Production notes
- Remove S3_ENDPOINT from .env and set real AWS credentials
- Set NODE_ENV=production for secure cookies
- Run `prisma migrate deploy` instead of `migrate dev`
