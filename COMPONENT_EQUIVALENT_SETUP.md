# Component Equivalent Search — Nexar Setup

## Current architecture

MacSunny now uses the current **Nexar Supply GraphQL API** for external component-equivalent data.

Search flow:

```
User query
  → MacSunny local inventory
  → 90-day MongoDB equivalent cache
  → Nexar OAuth 2.0 client-credentials token
  → Nexar GraphQL supSearchMpn
  → similarParts
  → cache result
  → re-check returned alternatives against MacSunny inventory
```

The retired Octopart v4 REST/static-key integration is no longer used.

## Environment variables

After a Nexar Supply application has been created, configure these server-side variables:

```bash
NEXAR_CLIENT_ID=...
NEXAR_CLIENT_SECRET=...
```

Do not expose either value through `NEXT_PUBLIC_*` variables or client-side code.

## OAuth / API configuration

MacSunny is already wired for:

- Token URL: `https://identity.nexar.com/connect/token`
- Grant type: `client_credentials`
- Scope: `supply.domain`
- GraphQL endpoint: `https://api.nexar.com/graphql`
- Token caching: cached in the server runtime until shortly before expiration
- External equivalent query: `supSearchMpn` with `similarParts`

Nexar access tokens normally last up to 24 hours. MacSunny automatically requests and caches tokens; no manually generated production access token should be stored in Vercel.

## Relevant routes

- `/api/equivalents/search` — local inventory + cache + Nexar smart search
- `/api/equivalents` — authenticated admin cache management
- `/api/equivalents/nexar` — authenticated admin configuration status
- `/api/chat` — AI assistant integration for equivalent/alternative questions
- `/admin/equivalents` — admin test and cache-management workspace

## Cache behavior

External Nexar results are stored in MongoDB for 90 days.

Existing legacy cache records with `source: "octopart"` remain readable for backward compatibility. New external records use:

```text
source: "nexar"
```

## Admin validation after credentials are added

1. Deploy `NEXAR_CLIENT_ID` and `NEXAR_CLIENT_SECRET` to Vercel.
2. Redeploy production.
3. Open `/admin/equivalents`.
4. Confirm **Nexar Supply API Configured**.
5. Search a known MPN such as `LM339MX` or another test component.
6. Confirm the first uncached search reports an external API call.
7. Search the same MPN again and confirm the cached result is used.
8. Verify any returned alternatives already stocked by MacSunny are surfaced as local inventory.

## Security

- Client secret remains server-side only.
- Nexar configuration status is admin-only.
- External credentials are never returned to the browser.
- The retired `OCTOPART_API_KEY` variable and `/api/equivalents/octopart` route are not used.
- Do not commit credentials to Git.

## Usage limits

Nexar Supply plans are governed by matched-part allowances, not the old Octopart request-count model. MacSunny's 90-day cache reduces repeated external lookups. Check the active Nexar plan in the Nexar portal before production traffic is allowed to consume external matches.

## Troubleshooting

**Nexar Supply API Not Configured**

Confirm both server-side Vercel variables exist:

```
NEXAR_CLIENT_ID
NEXAR_CLIENT_SECRET
```

Then redeploy.

**Authorization failure**

Confirm the application has the **Supply** scope and uses `supply.domain`.

**No equivalents returned**

The source MPN may not have Nexar `similarParts` data. Local inventory and cached/manual equivalents continue to work independently.

**Old Octopart cache shown**

This is intentional backward compatibility. It will expire naturally under the cache TTL or can be deleted from the admin equivalents workspace.
