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

5. Set the admin password secret (required):

```bash
npx wrangler secret put ADMIN_PASSWORD
```

Admin login is disabled until `ADMIN_PASSWORD` is set — there is no default password in code.

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
