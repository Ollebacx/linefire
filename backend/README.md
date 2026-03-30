# Linefire Backend

Hono + TypeScript API server.  
Uses `@libsql/client` (SQLite, zero native compilation) for persistence.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY
```

## Run (development)

```bash
npm run dev
```

Server starts on **http://localhost:4000**

## API

| Method | Path             | Description                                  |
|--------|------------------|----------------------------------------------|
| GET    | /health          | Health check                                 |
| POST   | /ai/director     | Gemini wave-director commentary              |
| GET    | /leaderboard     | Top 20 scores                                |
| POST   | /leaderboard     | Submit a score                               |
| GET    | /runs            | Last 50 runs                                 |
| POST   | /runs            | Record a completed run                       |

### POST /ai/director

```json
{
  "round": 5,
  "kills": 23,
  "combo": 8,
  "waveSummary": "Player used airstrike for the first time"
}
```

### POST /leaderboard

```json
{
  "playerName": "Ghost",
  "score": 4200,
  "round": 12,
  "kills": 140
}
```

### POST /runs

```json
{
  "playerName": "Ghost",
  "round": 12,
  "kills": 140,
  "gold": 320,
  "combo": 18
}
```
