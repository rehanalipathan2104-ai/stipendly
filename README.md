# Stipendly

A trusted internship marketplace with AI-powered scam detection, honour scoring, and domain-verified providers.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + Lucide icons
- **Backend**: Node.js + Express + JWT auth (in `server/`)
- **Database**: MySQL

## Setup

### 1. Database

Create the MySQL database and tables:

```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend server

```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials and a JWT secret
npm install
npm start
```

The API server runs on `http://localhost:4000`.

### 3. Frontend

```bash
# From the project root
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend.

## Environment variables

### Backend (`server/.env`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL connection
- `JWT_SECRET` — secret key for signing JWT tokens
- `PORT` — server port (default 4000)

### Frontend (`.env`)
- `VITE_API_URL` — API base URL (defaults to `http://localhost:4000/api`)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — only needed for the domain-verification edge function (optional)

## Features

- **Role-based accounts**: Student, Provider, Admin (first account auto-becomes admin)
- **Honour scoring**: Listings start at 100; red flags reduce the score; below 40 auto-bans
- **AI trust review**: Heuristic scam detection on every listing at posting time
- **Red-flag reports**: Students file reports; AI corroborates with signal analysis
- **Domain verification**: Providers verify their company domain
- **Resume builder**: AI-generated resume drafts with save/download
- **Admin moderation**: Manage reports, ban providers, configure the flag glossary
