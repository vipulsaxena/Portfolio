# Portfolio Chat API (Cloudflare Workers + D1)

## One-time setup

1. Create a free [Cloudflare account](https://dash.cloudflare.com/sign-up).
2. From this folder:

```bash
npm install
npx wrangler login
npx wrangler d1 create portfolio-chat
```

3. Copy the `database_id` from the output into `wrangler.toml` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

4. Run migrations:

```bash
npm run db:migrate
npm run db:migrate:local
```

5. Set the admin password secret (recommended for production):

```bash
npx wrangler secret put ADMIN_PASSWORD
# enter: vipulknows26
```

For local dev without secrets, the worker falls back to `vipulknows26` only when `ADMIN_PASSWORD` is unset — set the secret before deploying.

6. Deploy:

```bash
npm run deploy
```

7. Copy the workers.dev URL into `js/vipul-chat-config.js` and `admin/admin-config.js`.

## Local development

```bash
npm run db:migrate:local
npm run dev
```

API runs at `http://localhost:8787`. Point chat config to that URL for local testing.
