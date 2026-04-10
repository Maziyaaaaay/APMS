# APMS Deployment Walkthrough

## Changes Made

| File | Change |
|------|--------|
| [api.js](file:///c:/Users/91702/Desktop/Activity%20point%20Management%20System/client/src/utils/api.js) | `BASE_URL` now reads from `VITE_API_URL` env var, falls back to `/api` for local dev |
| [index.js](file:///c:/Users/91702/Desktop/Activity%20point%20Management%20System/server/index.js) | CORS origins now read from `CORS_ORIGINS` env var, falls back to localhost |
| [.gitignore](file:///c:/Users/91702/Desktop/Activity%20point%20Management%20System/.gitignore) | Prevents [.env](file:///c:/Users/91702/Desktop/Activity%20point%20Management%20System/server/.env), `node_modules/`, `dist/`, and zip files from being pushed |
| [render.yaml](file:///c:/Users/91702/Desktop/Activity%20point%20Management%20System/render.yaml) | Optional Render blueprint for one-click backend deploy |

> [!IMPORTANT]
> Local development still works exactly the same — no changes needed. These changes only add production support.

---

## Step-by-Step Deployment Guide

### Step 1 — Push to GitHub

```bash
cd "c:\Users\91702\Desktop\Activity point Management System"
git init
git add .
git commit -m "Initial commit - APMS"
```

Then create a repo on [github.com/new](https://github.com/new) and follow their instructions to push.

---

### Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **New → Web Service** → Connect your GitHub repo
3. Configure:
   - **Name**: `apms-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free
4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xikqrthyuuqhptunigde.supabase.co` |
| `SUPABASE_SERVICE_KEY` | *(copy from your .env file)* |
| `JWT_SECRET` | *(copy from your .env file — use a stronger one for production!)* |
| `CORS_ORIGINS` | *(leave blank for now, add Vercel URL after Step 3)* |

5. Click **Deploy** → wait for it to go live
6. Note your backend URL (e.g., `https://apms-api.onrender.com`)

---

### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Import Project** → Select your repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
4. Add **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://apms-api.onrender.com/api` |

5. Click **Deploy** → wait for it to go live
6. Note your frontend URL (e.g., `https://apms.vercel.app`)

---

### Step 4 — Link them together

Go back to **Render Dashboard → apms-api → Environment**:

| Key | Value |
|-----|-------|
| `CORS_ORIGINS` | `https://apms.vercel.app` |

Click **Save** — Render will redeploy automatically.

---

### Step 5 — Test! 🎉

Open your Vercel URL on any device (phone, laptop, anywhere) and log in.

> [!TIP]
> **Render free tier** spins down after 15 minutes of inactivity. The first request after a cold start takes ~30 seconds. If this is for a demo/presentation, hit the backend URL a minute before to warm it up.
