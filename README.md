<div align="center">

# DevPrint
**Your GitHub identity, decoded.**

[![Live](https://img.shields.io/badge/live-devprint.adrish.me-00e676?style=for-the-badge&color=lightgreen)](https://devprint.adrish.me/)
[![Node.js](https://img.shields.io/badge/node-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com)
[![Auth0](https://img.shields.io/badge/auth0-github_oauth-EB5424?style=for-the-badge&logo=auth0&logoColor=white)](https://auth0.com)

</div>

---

<p align="center">
  <a href="https://devprint.adrish.me">
    <img src="./assets/devprint-1.png" width="800" alt="DevPrint card"/>
  </a>
</p>
<p align="center">
  <img src="./assets/devprint-2.png" width="800"/>
</p>
<p align="center">
  <img src="./assets/devprint-3.png" width="800"/>
</p>
<p align="center">
  <img src="./assets/devprint-4.png" width="800"/>
</p>

---

DevPrint pulls your GitHub identity through OAuth, crunches your repo data server-side, and spits out a developer card. No forms, no manual input — you log in and your card is already there. You can search any other GitHub user from the same page.

No stats widgets, no client-rendered dashboard. Language breakdown, star totals, and the contribution heatmap are all computed server-side from raw GitHub REST + GraphQL responses, then cached in MongoDB so repeat views don't re-hit the API.

---

## Features

- **GitHub OAuth login** — one click via Auth0, no forms, no separate account, no password to manage. Your GitHub identity *is* your DevPrint identity.
- **Instant card generation** — the moment you log in, your card is built from your session data. Nothing to configure.
- **Search any GitHub user** — no login required to look someone else up and generate their card.
- **Public shareable links** — logged-in users get a permanent card at `/u/your-username` that anyone can open, no login needed on their end.
- **On-demand regeneration** — a "Regenerate" button re-fetches your data and busts the cache, if your stats have changed since the last fetch.
- **Server-side stats, zero third-party widgets** — language breakdown, star totals, and the contribution heatmap are all computed from raw GitHub REST + GraphQL responses, not an embedded badge service.
- **Cached, not re-fetched** — a 1hr TTL cache in MongoDB means repeat views and popular searches don't hit GitHub's API again.

---

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 20 |
| Server | Express 4 |
| Templating | EJS |
| Auth | Auth0 · GitHub OAuth (OpenID Connect) |
| Data | GitHub REST API v3 + GraphQL v4 |
| Persistence | MongoDB (cache-aside, 1hr TTL) |
| Deployment | Render + Namecheap domain |
| Uptime | UptimeRobot — pings `/healthz` every 14 min |

Auth0 handles the OAuth complexity (token exchange, session management, provider config) so the app logic stays focused on the GitHub data layer. EJS over a frontend framework — there's no client-side state to manage, server rendering is simpler and faster for this use case.

---

```
GET /          →  unauthenticated → landing
               →  authenticated  → /card

GET /card      →  pulls github username from session (req.oidc.user.nickname)
               →  cache check (MongoDB, 1hr TTL) → hit: return cached, miss: fetch
               →  Promise.all: profile + repos + GraphQL heatmap fetched in parallel
               →  language frequency computed server-side from raw repo objects
               →  renders card.ejs with data + inline search form

GET /card?username=x  →  same pipeline, different target
                      →  on failure: falls back to your own card with an inline
                         error banner — never a raw error page

GET /u/:username       →  public, no login required
                       →  shareable permalink, same data pipeline as /card

*  →  unmatched routes and unhandled errors render a styled error page
      (404 for missing routes, 500 for real failures) — no default Express
      stack-trace pages reach the client
```

Auth is handled by `express-openid-connect`. Username comes straight from the OAuth session token — no user input needed for your own card. No tokens stored; session lives in a signed cookie.

---

## Routes

| Route | Auth | |
|---|---|---|
| `GET /` | — | Landing — redirects to `/card` if logged in |
| `GET /login` | — | Kicks off GitHub OAuth via Auth0 |
| `GET /callback` | — | Auth0 redirect target |
| `GET /logout` | ✓ | Clears session |
| `GET /card` | ✓ | Your card, auto-generated from session |
| `GET /card?username=x` | ✓ | Any GitHub user's card, falls back to your own on a bad username |
| `GET /u/:username` | — | Public shareable card, no login required |
| `GET /healthz` | — | JSON status + uptime (keep-alive target) |
| `GET /stats` | — | Global usage counters (total cards generated, unique developers) |

---

## Local setup

```bash
git clone https://github.com/adrish-mage/devprint.git
cd devprint
npm install
cp .env.example .env
node index.js
```

`.env`:

```env
AUTH0_SECRET=           # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_ISSUER_BASE_URL=  # https://your-tenant.auth0.com

GITHUB_TOKEN=           # PAT with public_repo read scope — used for both REST and GraphQL calls

MONGO_URI=              # MongoDB connection string, e.g. mongodb+srv://user:pass@cluster.mongodb.net/devprint

PORT=3000
```

Auth0 needs **GitHub as a social connection** and `http://localhost:3000/callback` whitelisted.

---

## What's notable

- OAuth identity drives the card — `req.oidc.user.nickname` gives the GitHub username directly from the session, no form needed
- `Promise.all` for parallel API calls — profile, repos, and GraphQL heatmap all fetched simultaneously, not sequentially
- Cache-aside layer in MongoDB — a 1hr TTL means repeat views and popular searches never re-hit GitHub's API
- Language breakdown, stars, and heatmap all computed server-side from raw API responses — no client-side widget, no third-party dependency
- Parameterized GraphQL queries — usernames are passed as query variables, not interpolated into the query string
- Failed username searches fall back to your own card with an inline error, never a raw error dump
- A global 404 handler and error middleware mean no unmatched route or unhandled exception ever reaches the client as a default Express page

---

## Roadmap

**API & Data**
- [x] GraphQL — Heatmap (contribution graph via GitHub's GraphQL API)
- [x] REST — Stats tiles (additional stat blocks from REST endpoints)
- [x] Route — Public profile (`/u/:username` shareable permalink without login)

**Persistence**
- [x] MongoDB — Cache layer (TTL-based caching to beat the 60 req/hr unauthenticated limit)
- [ ] MongoDB — Saved profiles (persist and retrieve user cards from DB)

**Production**
- [x] Prod — Error handler (404 + global error middleware, inline fallback for failed searches)
- [ ] Prod — Rate limiting (per-IP throttling to protect the API)
- [ ] Prod — Logging (structured request/error logging for observability)

---

## Author

**Adrish Dey** — IT, Calcutta University
[github.com/adrish-mage](https://github.com/adrish-mage) · [linkedin.com/in/adrish](https://www.linkedin.com/in/adrish-dey-6b2286385/)

---

*MIT*
