# Sinan VMS — Backend

Visitor Management System backend for Sinan, built with NestJS and PostgreSQL. Developed by **Whitewall Digital Solutions**.

## Tech Stack

- **Framework:** NestJS (Node.js + TypeScript)
- **Database:** PostgreSQL with TypeORM
- **Auth:** JWT + Passport
- **Process Manager:** PM2
- **Web Server:** Nginx
- **CI/CD:** GitHub Actions (self-hosted runners on AWS EC2)

## Live URLs

| Environment | URL |
|---|---|
| UAT | https://api-uat.sinan.whitewall.solutions |
| Production | https://api.sinan.whitewall.solutions |

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL

### Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Database

Create the database and run migrations:

```bash
npm run migration:run
```

### Run

```bash
# development (watch mode)
npm run start:dev

# production
npm run start:prod
```

## Database Migrations

```bash
# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Deployment

Deployments are automated via GitHub Actions:

- Push to `uat` → deploys to UAT instance
- Push to `main` → deploys to Production instance

The build runs on GitHub's servers. Only the compiled `dist/` is deployed to the EC2 instances. Migrations run automatically on app start.

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | Environment (`development`, `production`) |
| `PORT` | App port (default: 4000) |
| `API_PREFIX` | API prefix (default: `api/v1`) |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) |
| `DATABASE_HOST` | PostgreSQL host |
| `DATABASE_PORT` | PostgreSQL port |
| `DATABASE_USER` | PostgreSQL user |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `DATABASE_NAME` | PostgreSQL database name |
| `DATABASE_LOGGING` | Enable query logging (`true`/`false`) |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `7d`) |
| `THROTTLE_TTL` | Rate limit window in ms |
| `THROTTLE_LIMIT` | Max requests per window |
| `MASTER_KEY` | Master key for bypassing auth |
| `SUPERADMIN_EMAIL` | Superadmin seed email |
| `SUPERADMIN_PASSWORD` | Superadmin seed password |
| `SUPERADMIN_FULL_NAME` | Superadmin seed full name |
