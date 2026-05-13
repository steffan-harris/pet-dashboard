# Backend Service

Node.js + Express REST API with PostgreSQL for the pet dashboard.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

1. Install dependencies:
   `npm install`
2. Copy environment variables:
   `cp .env.example .env`
3. Start PostgreSQL:
   `docker compose up -d`
4. Run migrations:
   `npm run migrate`
5. Start server:
   `npm run dev`

## Scripts

- `npm run dev` Starts the API with auto-reload.
- `npm start` Starts the API.
- `npm run migrate` Applies SQL migrations from `db/migrations`.
- `npm run lint` Placeholder lint command.
- `npm run typecheck` Placeholder typecheck command.
- `npm test` Placeholder tests command.

## API Endpoints

- `GET /health`
- `GET /api/pets`
- `GET /api/pets/:id`
- `POST /api/pets`
- `PUT /api/pets/:id`
- `DELETE /api/pets/:id`

### Create/Update Payload

```json
{
  "name": "Milo",
  "species": "cat",
  "ageYears": 3,
  "notes": "Indoor cat"
}
```
