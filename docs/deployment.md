# Deployment Guide — Vercel + MongoDB Atlas

The project deploys as **one Vercel project**: the React build is served as static files and the Express API runs as a single serverless function at `/api/*`. Because both live on the same domain there is **no CORS in production** and the refresh cookie is first-party.

```
Browser ──► https://<project>.vercel.app/            → client/dist (static)
        ──► https://<project>.vercel.app/api/…       → api/index.js (Express, serverless)
                                                          └── MongoDB Atlas
```

## 1. MongoDB Atlas

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a user with the *Read and write to any database* role. Use a long generated password.
3. **Network Access** → add `0.0.0.0/0`. Vercel functions do not have fixed IPs, so an allow-list is not possible; security comes from the credentials + TLS.
4. **Connect → Drivers** → copy the SRV string and add the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/analytics_dashboard?retryWrites=true&w=majority`
5. Seed the production database **once** from your machine:
   ```bash
   cd server
   MONGODB_URI="<atlas uri>" JWT_ACCESS_SECRET=x JWT_REFRESH_SECRET=x node src/seed/seed.js
   ```
   (the JWT values are only needed to satisfy config validation for the script). The seed is ~60 MB including indexes, well inside the M0 512 MB limit.

## 2. Vercel project

1. Push the repository to GitHub and **Import** it in Vercel. Framework preset: *Other* — `vercel.json` already declares the build command (`npm run build --workspace=client`) and output directory (`client/dist`).
2. **Environment variables** (Settings → Environment Variables, *Production* + *Preview*):

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Atlas SRV string from step 1 |
   | `JWT_ACCESS_SECRET` | 64+ random hex chars — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_REFRESH_SECRET` | a *different* random value |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL_DAYS` | `7` |
   | `CLIENT_URL` | `https://<project>.vercel.app` (add preview URLs comma-separated if needed) |
   | `VITE_DEMO_MODE` | `true` to show the one-click demo logins, `false` to hide them |
   | `VITE_API_URL` | leave **empty** (same-origin `/api`) |

3. Deploy. Vercel installs workspaces from the root `package.json`, builds the client, and bundles `api/index.js` (which imports `server/src/app.js`) as a Node 20 function.


## 2b. Vercel with Root Directory = `client` (frontend-only)

If the Vercel project's **Root Directory** is set to `client`, Vercel reads **`client/vercel.json`** and deploys only the React build. The root `vercel.json` and `api/index.js` are ignored in this mode, so the Express API must run somewhere else (see §5 — Render / Railway).

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env vars | `VITE_API_URL=https://<your-api-host>` (no trailing slash) · `VITE_DEMO_MODE=true` |

On the API host set `CLIENT_URL` to the **exact origin you open in the browser** — scheme + host, no trailing slash or path (e.g. `https://<project>.vercel.app`). Several origins can be comma-separated and `*` is allowed in the host for preview deployments, e.g. `https://<project>.vercel.app,https://<project>-*-<team>.vercel.app`. A rejected origin is logged by the API as `[cors] rejected origin …`, and `GET /api/health` reports `allowedOrigins` and the running `commit`. This is required for CORS, and `NODE_ENV=production` so the refresh cookie is sent cross-site (`SameSite=None; Secure`).

## 2c. Demo accounts & passwords (Render / any API host)

The login page's demo cards are served by `GET /api/auth/demo-accounts`; nothing is hard-coded in the frontend. Give each role its own password with these API environment variables — at start-up (and via `npm run demo:sync`) the API bcrypt-hashes them into the matching user records, revoking old sessions for rotated accounts:

| Variable | Purpose |
|---|---|
| `DEMO_LOGIN_ENABLED` | `true` (default) shows the cards; `false` hides them |
| `DEMO_PASSWORD_SUPER_ADMIN` | password for superadmin@demo.com |
| `DEMO_PASSWORD_ADMIN` | password for admin@demo.com |
| `DEMO_PASSWORD_ANALYST` | password for analyst@demo.com |
| `DEMO_PASSWORD_VIEWER` | password for viewer@demo.com |

In production, roles whose variable is unset are shown **without** a password (the card fills the email only). Any signed-in user can change their own password under **Profile → Change password**; a Super Admin can reset anyone's under **Settings → Team**.

## 3. Verify

```bash
curl https://<project>.vercel.app/api/health          # {"success":true,...}
curl -X POST https://<project>.vercel.app/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"viewer@demo.com","password":"Password123"}'
```
Then open the site, sign in with a demo account, switch pages, change the date range, and export a CSV.

## 4. How authentication behaves in production

- `NODE_ENV=production` makes the refresh cookie `Secure; SameSite=None; HttpOnly; Path=/api/auth`.
- Access tokens (15 min) live only in memory; a full reload calls `/api/auth/refresh` to restore the session.
- Helmet, rate limiting (`300 req/min`, `20 login attempts / 15 min`) and `trust proxy` are enabled so Vercel's forwarded IP headers are respected.
- 5xx messages are masked (`"Something went wrong"`); details are only logged server-side.

## 5. Alternative: separate API host (Render / Railway)

If you prefer an always-on API (no cold starts):
1. Deploy `server/` with start command `node src/index.js` and the same env vars, plus `PORT`.
2. Set `CLIENT_URL` to the Vercel domain (CORS) and, on Vercel, set `VITE_API_URL=https://<api-host>` and remove the `/api/(.*)` rewrite from `vercel.json`.
3. Cookies then become cross-site: `SameSite=None; Secure` is already applied in production, so no code change is needed.

## 6. Local development

```bash
npm install
cp server/.env.example server/.env      # set MONGODB_URI + secrets
cp client/.env.example client/.env
npm run seed                             # populate the database
npm run dev                              # API on :5001, client on :5180 (proxied /api)
```
