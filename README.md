# demo-local-node

A local Node.js + PostgreSQL demo API for Cloud Disaster Recovery testing.

## Architecture

- **HTTP layer**: Express API routes in `src/routes`
- **Business layer**: Task CRUD logic in `src/services/taskService.js`
- **Data layer**: PostgreSQL pool/retry/schema logic in `src/db/client.js`

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- (Optional) Docker + Docker Compose

## Local setup

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` values as needed.
4. Start the app:
   ```bash
   npm start
   ```

## Docker setup

Start app + PostgreSQL together:

```bash
docker compose up --build
```

The app is exposed on `http://localhost:3000`.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `demo_app` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | _(empty)_ | PostgreSQL password |
| `DB_POOL_MIN` | `2` | Minimum DB pool connections |
| `DB_POOL_MAX` | `10` | Maximum DB pool connections |
| `SHUTDOWN_TIMEOUT` | `10000` | Graceful shutdown timeout in ms |

## API endpoints

- `GET /health`
  - `200`: `{"status":"healthy","database":"connected"}`
  - `503`: `{"status":"unhealthy","database":"disconnected"}`
- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`

### Example create task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write docs","description":"Add quickstart","status":"pending"}'
```

## Testing

- All tests: `npm test`
- Unit tests: `npm run test:unit`
- Property tests: `npm run test:property`
- Integration tests: `npm run test:integration`
