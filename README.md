# DevPrint

**Your GitHub identity, decoded.**

[![Live](https://img.shields.io/badge/live-devprint.yourdomain.me-00e676?style=flat-square)]((https://devprint.adrish.me/))
[![Node.js](https://img.shields.io/badge/node-20.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Auth0](https://img.shields.io/badge/auth0-oauth2-EB5424?style=flat-square&logo=auth0&logoColor=white)](https://auth0.com)

---

![DevPrint preview](https://i.imgur.com/placeholder.png)
> Replace with a real screenshot after deployment

---

## Overview

DevPrint generates a developer profile card from any GitHub username. It authenticates users via Google OAuth, hits the GitHub REST API, and server-renders the result as a shareable card.

Built as a real deployed project — not a tutorial clone.

---

## Stack

| | |
|---|---|
| **Runtime** | Node.js 20 |
| **Server** | Express 4 |
| **Templating** | EJS |
| **Auth** | Auth0 (OpenID Connect) |
| **Data** | GitHub REST API v3 |
| **Deployment** | Render + custom domain |

---

## How it works

```
GET /search  →  user enters a github username
GET /card    →  server fetches github api (profile + repos + languages)
             →  computes top languages from raw repo data
             →  renders card.ejs with live data
```

Auth is handled by `express-openid-connect`. Protected routes check `req.oidc.isAuthenticated()`. No tokens stored — session lives in a signed cookie.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `GET /` | — | Landing page |
| `GET /login` | — | Initiates Auth0 OAuth flow |
| `GET /callback` | — | Auth0 redirect handler |
| `GET /logout` | ✓ | Clears session |
| `GET /search` | ✓ | Username input |
| `GET /card?username=x` | ✓ | Renders developer card |
| `GET /healthz` | — | Uptime ping |

---

## Local setup

```bash
git clone https://github.com/adrish-mage/devprint.git
cd devprint
npm install
cp .env.example .env
node index.js
```

`.env` shape:

```env
AUTH0_SECRET=          # openssl rand -hex 32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_ISSUER_BASE_URL= # https://your-tenant.auth0.com
PORT=3000
```

---

## What I built

- Full OAuth 2.0 / OpenID Connect flow — callback handling, token exchange, signed session cookies
- Server-side GitHub API consumption with async/await and error boundaries
- Language breakdown computed from raw repo data, not a third-party widget
- Production deployment on Render with a custom domain and always-on uptime via UptimeRobot

---

## Upcoming imeplementations

- [ ] MongoDB — card history + public shareable URLs (`/card/:username`)
- [ ] GitHub API response caching with TTL (rate limit protection)
- [ ] PNG card export

---

## Author

**Adrish** — IT student, Calcutta University  
[github.com/adrish-mage](https://github.com/adrish-mage) · [linkedin.com/in/adrish](https://linkedin.com/in/adrish)

---

*MIT*
