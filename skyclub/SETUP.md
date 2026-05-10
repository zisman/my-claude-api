# SkyClub Setup Guide

## Prerequisites
- Node.js 20+
- A Neon.tech PostgreSQL database

## First-time setup (run from Windows)

### 1. API setup
```cmd
cd skyclub\api
npm install
copy .env.example .env
```
Edit `.env` and add your `DATABASE_URL` from Neon.

```cmd
npx prisma db push
npx ts-node prisma/seed.ts
```

### 2. Web setup
```cmd
cd skyclub\web
npm install
copy .env.example .env.local
```

## Running locally

**Window 1 — API (port 3001):**
```cmd
cd skyclub\api
npm run start:dev
```

**Window 2 — Web (port 3000):**
```cmd
cd skyclub\web
npm run dev
```

Open http://localhost:3000

## Demo credentials
- Slug: `skyclub`
- Admin: admin@skyclub.com / Admin123!
- Instructor: yael@skyclub.com / Instr123!
- Technician: tech@skyclub.com / Tech123!
