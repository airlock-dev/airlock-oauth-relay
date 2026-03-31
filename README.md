# airlock-oauth-relay

Stateless HTTPS relay for [Airlock](https://github.com/airlock-dev/airlock) OAuth callbacks.

Some OAuth providers (e.g. Slack) require HTTPS redirect URIs, but CLI tools like Airlock listen on `http://127.0.0.1`. This Cloudflare Worker bridges the gap by receiving the HTTPS callback and 302-redirecting it to the local callback server.

## How it works

```
                     ┌──────────────┐
                     │ OAuth Server │
                     │  (e.g. Slack)│
                     └──────┬───────┘
                            │ 302 → https://relay/callback?code=...&state={port}.{orig}
                            ▼
                     ┌──────────────┐
                     │  This Relay  │
                     │  (CF Worker) │
                     └──────┬───────┘
                            │ 302 → http://127.0.0.1:{port}/oauth/callback?code=...&state={orig}
                            ▼
                     ┌──────────────┐
                     │   Airlock    │
                     │ (localhost)  │
                     └──────────────┘
```

1. Airlock wraps the local callback port into the OAuth `state` parameter: `state={port}.{original_state}`
2. The OAuth provider redirects to `https://<relay>/callback?code=xxx&state={port}.{original_state}`
3. The relay extracts the port, restores the original state, and 302-redirects to `http://127.0.0.1:{port}/oauth/callback` with all query params passed through

The relay is fully stateless — no database, no KV, no secrets. It never sees tokens (only the authorization code, which is useless without the PKCE verifier held by Airlock).

## Airlock configuration

```yaml
providers:
  slack:
    type: http
    url: https://slack-mcp.example.com
    oauth: true
    oauth_callback_url: https://airlock-oauth-relay.<your-account>.workers.dev/callback
    client_id: $SLACK_CLIENT_ID
    client_secret: $SLACK_CLIENT_SECRET
```

## Deploy

```sh
npm install
npm run deploy
```

Requires `CLOUDFLARE_API_TOKEN` set in your environment or in CI secrets.

## Development

```sh
npm run dev    # starts local wrangler dev server
```

## License

MIT
