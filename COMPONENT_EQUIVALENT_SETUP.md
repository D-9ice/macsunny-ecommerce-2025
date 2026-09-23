# Component Equivalent Search — External Provider Setup

## Current architecture

MacSunny uses a layered component-reference strategy:

```
User query
  → MacSunny local inventory
  → 90-day MongoDB equivalent/technical cache
  → Nexar Supply GraphQL
  → Mouser Search API V2 fallback
  → cache verified technical data/replacements
  → re-check returned alternatives against MacSunny inventory
```

AllDatasheet is retained only as a manual research link for legacy parts because AllDatasheet confirmed by email on 2026-09-23 that it no longer offers an API service.

## Environment variables

### Nexar

```bash
NEXAR_CLIENT_ID=...
NEXAR_CLIENT_SECRET=...
NEXAR_PUBLIC_LOOKUP_ENABLED=false
```

### Mouser

```bash
MOUSER_API_KEY=...
MOUSER_PUBLIC_LOOKUP_ENABLED=false
```

Do not expose provider credentials through `NEXT_PUBLIC_*` variables or client-side code.

## Provider behavior

### Nexar

- OAuth 2.0 client credentials
- Supply GraphQL
- exact normalized MPN validation
- `supSearchMpn` + `similarParts`
- server-side token caching

### Mouser

MacSunny is wired to the official Search API V2:

- Base host: `https://api.mouser.com`
- Endpoint: `POST /api/v2/search/partnumberandmanufacturer`
- API key: query parameter `apiKey`
- request mode: exact part-number search
- manufacturer MPN is used for cross-reference matching
- technical fields are derived from `ProductAttributes`
- datasheet URL, image URL, lifecycle status, description, manufacturer and product reference are retained
- `SuggestedReplacement` is used as the replacement/equivalent source when present
- JIS shorthand such as `D313` can also try canonical `2SD313`
- public/customer Mouser lookup remains disabled unless explicitly enabled

Official published Search API limits currently include up to 50 results per call, 30 calls per minute and 1,000 calls per day.

### AllDatasheet

- no automated API integration
- no scraping
- manual legacy-component reference link only

## Relevant routes

- `/api/equivalents/search` — local inventory + cache + Nexar + Mouser fallback
- `/api/equivalents` — authenticated admin cache management
- `/api/equivalents/nexar` — authenticated Nexar status
- `/api/equivalents/mouser` — authenticated Mouser status
- `/api/image-search` — reuses the same Mouser V2 adapter for component images
- `/api/chat` — AI assistant equivalent/alternative integration
- `/admin/equivalents` — admin lookup/cache workspace

## Cache behavior

Validated external records are cached for 90 days.

Supported cache sources:

```text
nexar
mouser
octopart
digikey
manual
```

MacSunny inventory remains authoritative for price, stock, product image and sale.

## Mouser activation checklist

1. Create/sign in to a My Mouser account.
2. Submit the official Search API request form.
3. Receive the Search API key from Mouser.
4. Add `MOUSER_API_KEY` to Vercel Production.
5. Leave `MOUSER_PUBLIC_LOOKUP_ENABLED=false`.
6. Redeploy.
7. Open `/admin/equivalents`.
8. Confirm **Mouser fallback: connected**.
9. Test a legacy part Nexar misses, such as TIP41.
10. Confirm the first search calls Mouser and the second uses the 90-day cache.

## Security

- provider credentials are server-side only
- provider status routes are admin-only
- public external lookup is disabled by default
- exact MPN validation is used to reduce false matches
- no external seller/distributor information is presented as MacSunny inventory
- never commit API credentials to Git
