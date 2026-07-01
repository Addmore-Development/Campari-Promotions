# Honey Group Promotions Platform

A full-stack promoter management platform built for the South African market. Connects businesses with verified brand promoters for activations, sampling campaigns, events, and field marketing.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Local Development Setup](#local-development-setup)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Deploying to Render (Backend)](#deploying-to-render-backend)
8. [Deploying to Vercel (Frontend)](#deploying-to-vercel-frontend)
9. [Post-Deployment: CORS & Linking](#post-deployment-cors--linking)
10. [Custom Domain (Optional)](#custom-domain-optional)
11. [Automatic Deploys](#automatic-deploys)
12. [Troubleshooting](#troubleshooting)
13. [Quick Reference](#quick-reference)

---

## Project Overview

### What it does

- **Promoters** register, upload documents, and apply for brand activation jobs
- **Businesses** register, post jobs, and manage promoter allocations
- **Admins** review applications, approve accounts, manage jobs, track payroll, and export reports

### Key Features

| Feature | Description |
|---|---|
| Multi-role auth | Promoter, Business, Admin roles with JWT |
| Document uploads | ID, bank proof, CIPC, headshots |
| Job management | Create, assign, track jobs with slot management |
| Payroll | Approve and export EFT batch CSVs |
| Live map | GPS check-in/check-out for promoters |
| Reports | PDF campaign reports, CSV payroll exports |
| POPIA compliant | SA data protection built in |

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| React Router v6 | Client-side routing |
| Plain inline styles | No CSS framework — full design control |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express | API server |
| TypeScript | Type safety |
| Prisma ORM | Database access |
| PostgreSQL | Database |
| JWT + bcryptjs | Auth |
| Multer | File uploads |

---

## Project Structure

```
honey-group/
├── frontend/                  ← React + Vite app
│   ├── src/
│   │   ├── admin/             ← Admin dashboard pages
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── CRUDJobsLogic.tsx
│   │   │   ├── FullCRUDUsers.tsx
│   │   │   └── ChatSystem.tsx
│   │   ├── pages/             ← Public pages
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── ...
│   │   ├── shared/
│   │   │   ├── hgStore.ts     ← localStorage data bus
│   │   │   └── jobs/
│   │   └── main.tsx
│   ├── .env.local             ← Local env vars (never commit)
│   ├── .env.production        ← Production env vars
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                   ← Express + Prisma API
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── jobs.controller.ts
│   │   │   ├── users.controller.ts
│   │   │   └── ...
│   │   ├── routes/
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── config.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env                   ← Local env vars (never commit)
│   └── package.json
│
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js v18 or higher — https://nodejs.org
- PostgreSQL running locally — https://www.postgresql.org/download
- Git — https://git-scm.com

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/honey-group.git
cd honey-group
```

### Step 2 — Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/honeygroup"
JWT_SECRET="your-local-dev-secret-at-least-32-chars"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

Run the Prisma migration and generate the client:

```bash
npx prisma generate
npx prisma db push
```

Start the backend dev server:

```bash
npm run dev
```

Backend runs at: `http://localhost:5000`

### Step 3 — Set up the frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend dev server:

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Step 4 — Create an admin account

In your database, manually set a user's role to `ADMIN` and status to `approved`:

```sql
UPDATE users SET role = 'ADMIN', status = 'approved' WHERE email = 'your@email.com';
```

Or use Prisma Studio to edit it visually:

```bash
cd backend
npx prisma studio
```

---

## Environment Variables

### Backend — full list

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for signing tokens — min 32 chars |
| `JWT_EXPIRES_IN` | ✅ | Token expiry e.g. `7d` or `24h` |
| `PORT` | ✅ | Port the server listens on (use `10000` on Render) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `UPLOAD_DIR` | ❌ | Path for file uploads (optional, defaults to `uploads/`) |

### Frontend — full list

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Full URL of your backend API including `/api` |

> **Important:** All Vite environment variables **must** start with `VITE_` to be accessible in the browser.

---

## Database Setup

### Schema overview

The Prisma schema (`backend/prisma/schema.prisma`) defines these models:

| Model | Description |
|---|---|
| `User` | Promoters, businesses, and admins |
| `Job` | Job listings with slots and filters |
| `Application` | Promoter applications to jobs |
| `Shift` | Check-in/check-out records |
| `Payment` | Payout records per shift |
| `AuditLog` | All significant actions |

### Running migrations

**First time setup:**
```bash
npx prisma db push
```

**After changing the schema:**
```bash
npx prisma generate
npx prisma db push
```

**For production (creates a migration file):**
```bash
npx prisma migrate deploy
```

---

## Deploying to Render (Backend)

> You already have a Render account. Follow these steps exactly.

### Step 1 — Create a PostgreSQL database on Render

1. Go to https://dashboard.render.com
2. Click **New +** in the top right
3. Select **PostgreSQL**
4. Fill in:
   - **Name:** `honey-group-db`
   - **Region:** Frankfurt (EU) — closest to South Africa
   - **Plan:** Free
5. Click **Create Database**
6. Wait about 1 minute for it to provision
7. Once ready, click on the database and find **Connection** section
8. Copy the **Internal Database URL** — it looks like:
   ```
   postgresql://honey_group_db_user:XXXX@dpg-XXXX-a/honey_group_db
   ```
   Save this — you need it in the next step.

---

### Step 2 — Create a Web Service for the backend

1. Click **New +** → **Web Service**
2. Click **Connect a repository**
3. Find and select your `honey-group` GitHub repository
4. Click **Connect**

---

### Step 3 — Configure the Web Service

Fill in these exact settings:

| Field | Value |
|---|---|
| **Name** | `honey-group-api` |
| **Region** | Frankfurt (EU) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `npm start` |
| **Plan** | Free |

> **Root Directory** is critical — set it to `backend` (or whatever your backend folder is named). Without this Render looks in the wrong place.

---

### Step 4 — Add environment variables on Render

Still on the Web Service creation screen, scroll down to **Environment Variables**.

Click **Add Environment Variable** for each of these:

```
NODE_ENV          →  production
PORT              →  10000
JWT_SECRET        →  (generate one below)
JWT_EXPIRES_IN    →  7d
DATABASE_URL      →  (paste the Internal Database URL from Step 1)
```

**To generate a JWT_SECRET**, open any terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste it as the value.

---

### Step 5 — Deploy

Click **Create Web Service**.

Render will:
1. Pull your code from GitHub
2. Run `npm install && npx prisma generate`
3. Start the server with `npm start`

This takes 2–4 minutes. Watch the logs in real time.

When you see `Server running on port 10000` in the logs — it's live.

Your backend API URL will be:
```
https://honey-group-api.onrender.com
```

**Copy this URL — you need it for the frontend.**

---

### Step 6 — Run the database migration

After the service is live, open the **Shell** tab in your Render service and run:

```bash
npx prisma migrate deploy
```

Or if you used `db push` locally:

```bash
npx prisma db push
```

This creates all the tables in your production database.

---

###  Free Tier Warning

Free Render services **spin down after 15 minutes of inactivity**. The first request after sleeping takes 30–60 seconds. To avoid this:
- Upgrade to the **Starter plan ($7/month)**
- Or use a free uptime monitoring service like UptimeRobot to ping your API every 10 minutes

---

## Deploying to Vercel (Frontend)

> You already have a Vercel account. Follow these steps exactly.

### Step 1 — Import your project

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Find your `honey-group` repository in the list
4. Click **Import**

---

### Step 2 — Configure the project

Vercel auto-detects Vite. Confirm or set these settings:

| Field | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> **Root Directory** must be set to `frontend` (or your actual frontend folder name). Click **Edit** next to Root Directory if it's not already set.

---

### Step 3 — Add environment variables

Before clicking Deploy, scroll down to **Environment Variables**.

Add this variable:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://honey-group-api.onrender.com/api` |

Replace `honey-group-api` with your actual Render service name from the previous section.

> Make sure the value ends with `/api` — this is the base path for all your API routes.

---

### Step 4 — Deploy

Click **Deploy**.

Vercel will:
1. Pull your code
2. Run `npm install`
3. Run `npm run build` (Vite compiles everything to `dist/`)
4. Serve the `dist/` folder globally via CDN

This takes about 60 seconds.

When it's done, your app is live at:
```
https://honey-group.vercel.app
```

Vercel will also show you the exact URL — it might be slightly different if the name was taken.

---

### Step 5 — Handle React Router (client-side routing)

Because this is a single-page app, Vercel needs to redirect all routes to `index.html`. Create a file called `vercel.json` in your **frontend** folder:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Commit and push this file:

```bash
git add frontend/vercel.json
git commit -m "Add Vercel SPA routing config"
git push
```

Vercel will automatically redeploy. Without this file, refreshing any page other than `/` will show a 404.

---

## Post-Deployment: CORS & Linking

### Fix CORS on the backend

Your backend needs to explicitly allow requests from your Vercel domain.

Open `backend/src/server.ts` (or wherever you configure Express) and update the CORS settings:

```typescript
import cors from 'cors'

app.use(cors({
  origin: [
    'https://honey-group.vercel.app',  // ← your exact Vercel URL
    'https://honey-group.vercel.app',  // add preview URLs if needed
    'http://localhost:5173',           // local dev
    'http://localhost:3000',           // alternate local dev
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

Then push the change:

```bash
git add .
git commit -m "Fix CORS for production Vercel domain"
git push
```

Render will automatically redeploy within 2–3 minutes.

### Test the connection

1. Open your Vercel app in the browser
2. Open DevTools → Network tab (F12)
3. Try to log in
4. You should see a request to `https://honey-group-api.onrender.com/api/auth/login`
5. If it returns a response — you're connected ✅
6. If it shows a CORS error — double-check your Vercel URL in the CORS config above

---

## Custom Domain (Optional)

### Add your domain to Vercel

1. Go to Vercel dashboard → your project → **Settings** → **Domains**
2. Click **Add Domain**
3. Type your domain: `app.honeygroup.co.za`
4. Vercel shows you two DNS records to add:

```
Type: A      Name: @    Value: 76.76.21.21
Type: CNAME  Name: www  Value: cname.vercel-dns.com
```

5. Log in to your domain registrar (Afrihost, GoDaddy, etc.)
6. Add these DNS records in your domain's DNS settings
7. Wait 5–30 minutes for DNS to propagate
8. Vercel automatically provisions an SSL certificate

### Add your domain to Render

1. Go to Render dashboard → your backend service → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Type: `api.honeygroup.co.za`
4. Render shows you a CNAME record to add
5. Add it in your domain registrar
6. Update your `VITE_API_URL` in Vercel to use the new domain:
   ```
   VITE_API_URL = https://api.honeygroup.co.za/api
   ```
7. Also update your CORS config to include `https://app.honeygroup.co.za`

---

## Automatic Deploys

Both Vercel and Render are connected to your GitHub repository. Every time you push to the `main` branch, both services redeploy automatically.

### Normal development workflow

```bash
# Make your changes locally, test them, then:

git add .
git commit -m "describe what you changed"
git push
```

That's it. Both frontend and backend redeploy within 1–2 minutes.

### Deploying only the frontend or backend

If you only changed frontend files, only Vercel redeploys.
If you only changed backend files, only Render redeploys.
Both services are smart enough to detect which folder changed.

### Rolling back a deploy

**On Vercel:** Dashboard → your project → Deployments → click any previous deployment → **Promote to Production**

**On Render:** Dashboard → your service → Events → click **Rollback** next to any previous deploy

---

## Troubleshooting

### Backend issues

**Build fails on Render**
- Check the build logs in the Render dashboard
- Most common cause: wrong **Root Directory** — make sure it's set to `backend`
- Second most common: missing a package in `package.json` — run `npm install <package>` locally then push

**`prisma generate` fails on Render**
- Make sure your Build Command is: `npm install && npx prisma generate`
- The `prisma` package must be in your `dependencies` (not just `devDependencies`) in `package.json`

**Database connection refused**
- Make sure you used the **Internal** Database URL (not the external one) for services on the same Render region
- Check that `DATABASE_URL` is set correctly in Render environment variables

**Server starts but API returns 500 errors**
- Check the Render service logs
- Most likely the database tables don't exist — run `npx prisma db push` in the Render Shell

**JWT errors (invalid token)**
- Make sure `JWT_SECRET` is set in Render and matches what was used to sign existing tokens
- If you changed the secret, all existing tokens are invalidated — users need to log in again

---

### Frontend issues

**Vercel build fails**
- Check the build logs in Vercel dashboard
- Make sure `VITE_API_URL` is set in environment variables
- Check that the **Root Directory** is set to `frontend`
- Check for TypeScript errors locally with `npm run build` before pushing

**App shows blank page after deploy**
- You're missing the `vercel.json` rewrite rule — see the React Router section above
- Check browser console for errors (F12)

**API requests fail with CORS error**
- Your Vercel domain isn't in the backend's CORS allow list
- Update `server.ts` with the exact URL Vercel gave you and redeploy

**API requests fail with "Network Error" or timeout**
- Your Render service may be sleeping (free tier)
- Wait 30–60 seconds and try again
- Check `VITE_API_URL` is correct and ends with `/api`

**Login works but admin dashboard shows no data**
- The API is offline or returning errors — check the Network tab in DevTools
- The admin token might be expired — log out and back in
- If the API is online but data is missing, run `npx prisma db push` in the Render shell to ensure all tables exist

---

### Database issues

**`P3006` error during migration**
```bash
# The database already has tables created outside of Prisma
# Baseline the existing migration first:
npx prisma migrate resolve --applied 20260316092206_init

# Then push any new changes:
npx prisma db push
```

**`column does not exist` TypeScript errors**
```bash
# Your Prisma client is out of sync with the schema
# Always run this after editing schema.prisma:
npx prisma generate
```

**Want to reset the database (destructive)**
```bash
npx prisma migrate reset
# WARNING: This deletes all data
```

---

## Quick Reference

### Your live URLs (fill these in after deploying)

| Service | URL |
|---|---|
|  Frontend | `https://_____________.vercel.app` |
|  Backend API | `https://_____________.onrender.com` |
|  API Health Check | `https://_____________.onrender.com/api/health` |
|  Render Dashboard | https://dashboard.render.com |
|  Vercel Dashboard | https://vercel.com/dashboard |

---

### Environment variables cheat sheet

**Render (backend) — set in dashboard:**
```
NODE_ENV       = production
PORT           = 10000
JWT_SECRET     = <64-char random hex string>
JWT_EXPIRES_IN = 7d
DATABASE_URL   = <Internal Database URL from Render PostgreSQL>
```

**Vercel (frontend) — set in dashboard:**
```
VITE_API_URL = https://your-api-name.onrender.com/api
```

**Local backend — `backend/.env`:**
```
NODE_ENV       = development
PORT           = 5000
JWT_SECRET     = any-local-secret
JWT_EXPIRES_IN = 7d
DATABASE_URL   = postgresql://postgres:password@localhost:5432/honeygroup
```

**Local frontend — `frontend/.env.local`:**
```
VITE_API_URL = http://localhost:5000/api
```

---

### Push to GitHub (daily workflow)

```bash
git add .
git commit -m "your message here"
git push
```

Both Vercel and Render auto-deploy on every push to `main`. ✅

---

### Generate a secure JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Useful Prisma commands

```bash
npx prisma generate          # regenerate client after schema changes
npx prisma db push           # sync schema to database (no migration file)
npx prisma migrate dev       # create + apply a migration (local dev)
npx prisma migrate deploy    # apply pending migrations (production)
npx prisma studio            # open visual database editor in browser
npx prisma migrate reset     # ⚠️ wipe and rebuild database
```

---

### Check if backend is running

```bash
curl https://your-api.onrender.com/api/health
# Should return: { "status": "ok" }
```

Or just open the URL in your browser.

---

*Honey Group Promotions Platform — Built for South Africa 🇿🇦*
