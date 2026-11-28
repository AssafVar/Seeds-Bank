# Seeds-Bank

This app serves breeders who want to screen, document and develop new breeds.

Stack: React (Create React App, Material UI) in `client/`, .NET 10 ASP.NET Core API with EF Core in `server/`, and
Postgres.

## Run locally

Requirements: .NET 10 SDK, Node, Docker (Docker Desktop, OrbStack or Colima).

```sh
docker compose up -d
cd server && dotnet run
cd client && npm install && npm start
```

`docker compose up -d` starts Postgres, an S3-compatible store (SeaweedFS) and Mailpit. Their credentials are local-only
and live in `docker-compose.yml` and `dev/seaweedfs-s3.json`. Host ports are offset so this stack can run next to
manageit's:

| Service | Address |
|---|---|
| Postgres | `localhost:5433` |
| S3 (SeaweedFS) | `localhost:9100` |
| SMTP (Mailpit) | `localhost:1026` |
| Mailpit inbox | http://localhost:8026 |

In Development the API reads `server/appsettings.Development.json`: the compose Postgres, a dev-only `Jwt:Key`, and
`Database:MigrateOnStartup=true`, so the schema is created on the first run. `docker compose down -v` wipes the data.

Emails the app sends locally land in Mailpit at http://localhost:8026; nothing is really sent.

### Tests

```sh
cd server && dotnet test Server.slnx
```

The Postgres integration tests need a database. Without `TEST_POSTGRES` they are skipped (and fail when `CI=true`):

```sh
export TEST_POSTGRES="Host=localhost;Port=5433;Database=seeds_bank;Username=seeds_bank;Password=seeds_bank_dev"
cd server && dotnet test Server.slnx
```

Each test creates and drops its own database on that server.

## Configuration

Outside Development, set these (environment variables use `__` for `:`):

| Setting | Notes |
|---|---|
| `ConnectionStrings__Default` | Postgres connection string |
| `Database__MigrateOnStartup` | `true` to apply migrations when the API starts |
| `Jwt__Key` | Random secret of at least 32 bytes (`openssl rand -base64 48`). The API won't start without it, or with the development key from `appsettings.Development.json`. |

### Neon

Use the Neon connection string in Npgsql format, for example:

```
Host=<endpoint>.neon.tech;Database=<db>;Username=<user>;Password=<password>;SSL Mode=Require;Timeout=30
```

Use the **direct** (non-pooler) endpoint, not the `-pooler` host: EF Core takes a session advisory lock while it
migrates, which a transaction-mode pooler does not support. `Timeout=30` leaves room for a suspended compute to wake up.
The schema uses the `citext` extension; the first migration creates it.
