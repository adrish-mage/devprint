<div align="center">

# DevPrint  
**Your GitHub identity, decoded.**

[![Live](https://img.shields.io/badge/live-devprint.adrish.me-00e676?style=for-the-badge&color=lightgreen)](https://devprint.adrish.me/)
[![Node.js](https://img.shields.io/badge/node-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com)
[![Auth0](https://img.shields.io/badge/auth0-github_oauth-EB5424?style=for-the-badge&logo=auth0&logoColor=white)](https://auth0.com)

</div>

---

DevPrint pulls your GitHub identity via OAuth, crunches your repo data server-side, and renders a developer card with no forms or manual input — you log in and your card is already there.[web:1]  
You can also search and generate cards for any other GitHub user from the same page.[web:1]

Language breakdown, star totals, and the contribution heatmap are all computed server-side from raw GitHub REST and GraphQL responses, then cached in MongoDB so repeat views don’t re-hit the API.[web:1]

---
<img width="1891" height="718" alt="image" src="https://github.com/user-attachments/assets/283771a4-1169-4668-bb88-6beef4c602e3" />

<img width="1895" height="572" alt="image" src="https://github.com/user-attachments/assets/1c092640-fab2-4f4a-80a5-3b85b398154b" />

<img width="1901" height="922" alt="image" src="https://github.com/user-attachments/assets/0b34bff2-5c1b-4eb9-be05-4e35ee0cebcd" />

## Table of contents

- What DevPrint does  
- Features  
- Tech stack  
- How it works  
- Routes  
- Local setup  
- Configuration  
- Notable implementation details  
- Roadmap  
- Author & license  

---

## What DevPrint does

- Uses GitHub OAuth (via Auth0) to turn your GitHub account into a “DevPrint” card.  
- Aggregates profile, repositories, stars, languages, and contribution activity into a single server-rendered view.  
- Exposes public, shareable URLs for any generated card, including yours at `/u/your-username`.

---

## Features

- **GitHub OAuth login** — One-click login via Auth0 GitHub social connection; no separate account, forms, or passwords. Your GitHub identity *is* your DevPrint identity.  
- **Instant card generation** — The moment you log in, your card is built from your session data. No configuration or onboarding flow.  
- **Search any GitHub user** — Use the inline search to generate a card for any GitHub username; login is only required for your own card.  
- **Public shareable links** — Logged-in users get a permanent card at `/u/your-username` that anyone can open, with no login required.  
- **On-demand regeneration** — A **Regenerate** button re-fetches your data and busts the cache when your stats or activity change.  
- **Server-side stats only** — Language breakdown, star totals, and the contribution heatmap are computed from raw REST + GraphQL data, not third-party widgets.  
- **MongoDB caching** — A 1‑hour TTL cache in MongoDB ensures repeat views and popular searches avoid redundant GitHub API calls.  

---

## Tech stack

| Layer       | Tech                                                   |
|------------|---------------------------------------------------------|
| Runtime    | Node.js 20                                             |
| Server     | Express 4                                              |
| Templating | EJS                                                     |
| Auth       | Auth0 · GitHub OAuth (OpenID Connect)                  |
| Data       | GitHub REST API v3 + GraphQL v4                        |
| Persistence| MongoDB (cache-aside, 1hr TTL)                         |
| Deployment | Render + Namecheap domain                              |
| Uptime     | UptimeRobot — pings `/healthz` every 14 minutes        |

Auth0 handles token exchange, session management, and provider configuration, so the app logic focuses on GitHub data ingestion and card rendering.[web:1]  
EJS is used instead of a frontend framework because the app does not require client-side state; server rendering keeps things simple and fast for this flow.[web:1]

---

## How it works

```text
GET /                    → unauthenticated → landing
                         → authenticated  → /card

GET /card                → pulls GitHub username from session (req.oidc.user.nickname)
                         → cache check (MongoDB, 1hr TTL) → hit: return cached, miss: fetch
                         → Promise.all: profile + repos + GraphQL heatmap fetched in parallel
                         → language frequency computed server-side from raw repo objects
                         → renders card.ejs with data + inline search form

GET /card?username=x     → same pipeline, different target
                         → on failure: falls back to your own card with an inline
                           error banner — never a raw error page

GET /u/:username         → public, no login required
                         → shareable permalink, same data pipeline as /card

*                        → unmatched routes and unhandled errors render a styled error page
                           (404 for missing routes, 500 for real failures)
                           — no default Express stack-trace pages reach the client
```

Authentication is implemented with `express-openid-connect`, using the GitHub identity from the Auth0 session token.[web:1]  
No GitHub tokens are stored in the database; the session lives in a signed cookie managed by Auth0’s SDK.[web:1]

---

## Routes

| Route                  | Auth | Description                                                                                   |
|------------------------|------|-----------------------------------------------------------------------------------------------|
| `GET /`               | —    | Landing page; redirects to `/card` if logged in                                              |
| `GET /login`          | —    | Starts the GitHub OAuth flow via Auth0                                                       |
| `GET /callback`       | —    | Auth0 OAuth callback endpoint                                                                |
| `GET /logout`         | ✓    | Logs out and clears the session                                                              |
| `GET /card`           | ✓    | Your card, auto-generated from the OAuth session                                             |
| `GET /card?username=x`| ✓    | Card for any GitHub username; falls back to your own card with an inline error on failure   |
| `GET /u/:username`    | —    | Public shareable card (no login required)                                                    |
| `GET /healthz`        | —    | JSON status + uptime for health checks                                                       |
| `GET /stats`          | —    | Global usage counters (total cards generated, unique developers)                             |

---

## Local setup

```bash
git clone https://github.com/adrish-mage/devprint.git
cd devprint
npm install
cp .env.example .env
node index.js
```

---

## Configuration

Create a `.env` file from `.env.example` and fill in the values:

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

In Auth0, enable **GitHub as a social connection** and whitelist `http://localhost:3000/callback` as an allowed callback URL.[web:1]

---

## Notable implementation details

- OAuth identity drives the card: `req.oidc.user.nickname` provides the GitHub username directly from the session, eliminating any username input for your own card.[web:1]  
- `Promise.all` is used to fetch profile, repos, and the GraphQL contribution heatmap in parallel, reducing total latency compared to sequential calls.[web:1]  
- A cache-aside layer in MongoDB with a 1‑hour TTL minimizes GitHub API usage for repeat and popular views.[web:1]  
- Language breakdown, star totals, and heatmap data are computed server-side from raw REST and GraphQL responses, avoiding client widgets or external stats services.[web:1]  
- GraphQL queries are parameterized: usernames are passed as variables instead of interpolating into the query string.  
- Failed username searches fall back to the logged-in user’s own card with an inline error banner, never exposing raw errors.  
- Global 404 and error middleware ensure unmatched routes and unhandled exceptions are rendered as styled error pages instead of the default Express stack trace.

---

## Roadmap

**API & data**

- [x] GraphQL — Contribution heatmap via GitHub GraphQL API  
- [x] REST — Additional stats tiles from GitHub REST endpoints  
- [x] Route — Public profile (`/u/:username` shareable permalink without login)  

**Persistence**

- [x] MongoDB — Cache layer (TTL-based caching to stay under unauthenticated rate limits)  
- [ ] MongoDB — Saved profiles (persist and retrieve user cards from the database)  

**Production**

- [x] Error handling — 404 + global error middleware; inline fallback for failed searches  
- [ ] Rate limiting — Per-IP throttling to protect GitHub’s APIs  
- [ ] Logging — Structured request/error logging for observability and debugging  

---

## Author & license

**Adrish Dey** — IT, Calcutta University  
[github.com/adrish-mage](https://github.com/adrish-mage) · [linkedin.com/in/adrish](https://www.linkedin.com/in/adrish-dey-6b2286385/)

Licensed under the MIT License.

---
