# Local Strava MCP

Purpose: provide Strava-specific tooling for development and production checks without sending tokens to third-party MCP services.

## Included tools

- `strava_build_authorize_url`
- `strava_exchange_code`
- `strava_refresh_token`
- `strava_get_athlete`
- `strava_list_activities`
- `strava_get_activity`
- `strava_get_rate_limits`
- `strava_verify_webhook_challenge`
- `strava_validate_corre_integration`

## Environment

The server reads environment variables from process env and fallback `.env` files in repo root.

Recommended variables:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_VERIFY_TOKEN`
- `SUPABASE_URL`
- `EXPO_PUBLIC_STRAVA_CLIENT_ID`
- `STRAVA_REDIRECT_URI` (optional override)

## MCP config example

```json
{
  "mcpServers": {
    "strava_local": {
      "command": "node",
      "args": ["./tools/mcp/strava/server.mjs"]
    }
  }
}
```

## Notes

- Token values are redacted by default in `strava_exchange_code` and `strava_refresh_token`.
- Pass `reveal_tokens: true` only when strictly necessary.
