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

The API listens on http://localhost:8080 and the React dev server on http://localhost:3000 forwards `/api` to it.

In Development the API reads `server/appsettings.Development.json`: the compose Postgres, SeaweedFS and Mailpit, a
dev-only `Jwt:Key`, `Database:MigrateOnStartup=true` (the schema is created on the first run) and
`Storage:CreateBucketIfMissing=true` (the `seeds-bank` bucket is created on the first run). `docker compose down -v`
wipes the data.

Gallery images are stored in the bucket, which is private: the API hands the page a signed link per image, valid for an
hour. Emails the app sends locally land in Mailpit at http://localhost:8026; nothing is really sent.

To try the production image locally against the compose services:

```sh
docker build -t seeds-bank .
docker run --rm -p 127.0.0.1:8090:8080 -e ASPNETCORE_ENVIRONMENT=Development \
  -e 'ConnectionStrings__Default=Host=host.docker.internal;Port=5433;Database=seeds_bank;Username=seeds_bank;Password=seeds_bank_dev' \
  -e Storage__ServiceUrl=http://host.docker.internal:9100 -e Email__Host=host.docker.internal seeds-bank
```

Then open http://localhost:8090. (Gallery links point at `host.docker.internal:9100` in this setup, so images only load
where that name resolves.)

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

## Deploy (free tier)

One `Dockerfile` builds the React app and the API into a single image: .NET serves the API under `/api` and the app
from the same origin. Hosting is the same as manageit's: Render (Docker), Neon (Postgres), Cloudflare R2 (storage) and
Resend (email). Build the `Dockerfile` on Render (or any container host) and set these environment variables (`__`
stands for `:`):

| Variable | Example |
|---|---|
| `ConnectionStrings__Default` | Neon Postgres connection string (see [Neon](#neon)) |
| `Database__MigrateOnStartup` | `true` to apply migrations when the API starts |
| `Jwt__Key` | `openssl rand -base64 48`, as a secret. The API won't start without it, with fewer than 32 bytes, or with the development key from `appsettings.Development.json`. |
| `ForwardedHeaders__Enabled` | `true` behind Render's proxy (needed for HTTPS redirects, HSTS and per-IP rate limits). **Required outside Development.** |
| `AllowedHosts` | the app's host name, e.g. `seeds-bank.onrender.com`. **Required outside Development** (`*` is refused unless `Hosting__AllowAnyHost=true`). |
| `Storage__ServiceUrl` | `https://<account-id>.r2.cloudflarestorage.com` (https is required outside Development) |
| `Storage__Bucket` | `seeds-bank`: create it once in R2, as a **private** bucket |
| `Storage__AccessKey` / `Storage__SecretKey` | an R2 API token with Object Read & Write on that bucket, as secrets |
| `Storage__Region` | `auto` |
| `Storage__PublicOrigin` | same as `Storage__ServiceUrl` (added to the Content-Security-Policy so gallery images load) |
| `Email__Host` / `Email__Port` | `smtp.resend.com` / `587` (Resend free plan: 100 emails a day, 3,000 a month) |
| `Email__User` | `resend` |
| `Email__Password` | a Resend API key with "Sending access", as a secret |
| `Email__From` | an address on your domain verified in Resend, e.g. `noreply@your-domain.com` |
| `PORT` | `8080` (tells Render the port the image listens on) |

The health check is `GET /api/health`. Without `Email__Host` the app runs but sends no email (nothing sends email yet).

After the first deploy, sign in from two different networks to check that the per-IP rate limits see the real client IP
(`ForwardedHeaders__Enabled`), not the proxy's.

To send real email from your machine instead of Mailpit, keep the Resend API key in .NET user secrets (stored in your
home folder, never in the repo), and run `dotnet user-secrets clear` in `server/` to go back to Mailpit:

```sh
cd server
dotnet user-secrets set "Email:Host" "smtp.resend.com"
dotnet user-secrets set "Email:Port" "587"
dotnet user-secrets set "Email:UseStartTls" "true"
dotnet user-secrets set "Email:User" "resend"
dotnet user-secrets set "Email:From" "noreply@your-domain.com"
dotnet user-secrets set "Email:Password" "<Resend API key>"
```

### Neon

Use the Neon connection string in Npgsql format, for example:

```
Host=<endpoint>.neon.tech;Database=<db>;Username=<user>;Password=<password>;SSL Mode=Require;Timeout=30
```

Use the **direct** (non-pooler) endpoint, not the `-pooler` host: EF Core takes a session advisory lock while it
migrates, which a transaction-mode pooler does not support. `Timeout=30` leaves room for a suspended compute to wake up.
The schema uses the `citext` extension; the first migration creates it.
