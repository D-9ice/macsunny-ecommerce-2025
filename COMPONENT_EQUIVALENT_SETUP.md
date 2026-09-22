# Component Equivalent Search — External Provider Setup

## Current architecture

MacSunny uses a layered component-reference strategy:

```
User query
  → MacSunny local inventory
  → 90-day MongoDB equivalent/technical cache
  → Nexar Supply GraphQL
  → AllDatasheet technical/datasheet fallback
  → cache validated technical data
  → re-check returned alternatives against MacSunny inventory
```

Nexar remains the structured source for `similarParts`. AllDatasheet complements it for legacy/older component identification and datasheet references. External seller/distributor advertising is not surfaced to MacSunny customers.

## Nexar environment variables

```bash
NEXAR_CLIENT_ID=...
NEXAR_CLIENT_SECRET=...
# Optional. Leave unset/false during evaluation testing:
NEXAR_PUBLIC_LOOKUP_ENABLED=false
```

## AllDatasheet environment variables

The runtime adapter is already implemented. Do not guess the private API contract before registration. After AllDatasheet issues the official API key/endpoint details, configure:

```bash
ALLDATASHEET_API_KEY=...
ALLDATASHEET_API_URL_TEMPLATE=...
# Optional. Leave unset/false until intentionally enabled:
ALLDATASHEET_PUBLIC_LOOKUP_ENABLED=false
```

`ALLDATASHEET_API_URL_TEMPLATE` supports placeholders so the official contract can be applied without another code rewrite:

- `{part}` or `{query}` — component part number
- `{key}` — API key when the provider requires it in the URL

Optional compatibility variables are also supported if the issued API contract uses named query parameters or a request header:

```bash
ALLDATASHEET_API_KEY_HEADER=...
ALLDATASHEET_API_KEY_PARAM=...
ALLDATASHEET_API_QUERY_PARAM=...
```

If no API credentials are configured, MacSunny still exposes the official AllDatasheet distributor-style direct datasheet-reference link. It does not scrape AllDatasheet HTML.

Do not expose any credential through `NEXT_PUBLIC_*` variables or client-side code.

## Provider behavior

### Nexar

MacSunny is wired for:

- OAuth 2.0 client credentials
- Token URL: `https://identity.nexar.com/connect/token`
- Scope: `supply.domain`
- GraphQL endpoint: `https://api.nexar.com/graphql`
- Exact normalized MPN validation to reject false partial matches
- `supSearchMpn` + `similarParts`
- server-side token caching

### AllDatasheet

MacSunny is wired for:

- official direct datasheet-reference links through `alldatasheet.net`
- server-side API-key adapter once the official membership/API contract is issued
- exact part-number validation when the API response exposes an MPN/part-number field
- technical description/specification/datasheet fields only
- no HTML scraping
- no external seller/distributor presentation
- fallback caching with `source: "alldatasheet"`

## Relevant routes

- `/api/equivalents/search` — local inventory + cache + Nexar + AllDatasheet fallback
- `/api/equivalents` — authenticated admin cache management
- `/api/equivalents/nexar` — authenticated Nexar status
- `/api/equivalents/alldatasheet` — authenticated AllDatasheet status
- `/api/chat` — AI assistant equivalent/alternative integration
- `/admin/equivalents` — admin lookup/cache workspace

## Cache behavior

External validated records are stored in MongoDB for 90 days.

Supported cache sources include:

```text
nexar
alldatasheet
octopart
digikey
manual
```

Legacy cache sources remain readable for backward compatibility.

Cached records may retain:

- canonical MPN
- technical description
- manufacturer
- technical specifications
- datasheet URL
- AllDatasheet reference URL
- equivalent part numbers

MacSunny inventory data remains authoritative for price, stock, product image, and sale.

## Admin validation after AllDatasheet registration

1. Add the issued AllDatasheet API key and official endpoint template to Vercel.
2. Keep customer/public lookup disabled.
3. Redeploy production.
4. Open `/admin/equivalents`.
5. Confirm the AllDatasheet fallback reports **connected**.
6. Search a legacy component that Nexar does not identify.
7. Confirm the AllDatasheet API is called only after local/cache/Nexar lookup.
8. Confirm technical/datasheet information is cached.
9. Search the same part again and verify the cache is used instead of another external call.

## Security

- All external credentials remain server-side only.
- Provider configuration status is admin-only.
- External credentials are never returned to the browser.
- Public external lookup is disabled by default for both providers.
- AllDatasheet HTML is never scraped.
- Do not commit API credentials to Git.

## Troubleshooting

**Nexar returns no part**

The lookup continues to AllDatasheet when its API is configured. The official AllDatasheet reference link remains available even before API activation.

**AllDatasheet API not connected**

This is expected until membership/API registration is completed. The adapter is already deployed and waiting for the issued API contract.

**AllDatasheet response format differs from the generic adapter**

Use the official endpoint/key details issued during registration. The URL-template/header/query configuration covers the common contract shapes; if the issued payload schema is materially different, adjust only `app/lib/alldatasheet.ts`, not the overall search architecture.
