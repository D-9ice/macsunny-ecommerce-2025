# Component Equivalent Search System

## Purpose

Provide MacSunny customers and administrators with useful component alternatives while prioritizing MacSunny inventory and minimizing external API usage.

## Production search order

1. Search MacSunny products by SKU, MPN and name.
2. Reuse a valid 90-day equivalent/technical cache entry.
3. On cache miss, query Nexar Supply GraphQL.
4. If Nexar misses the part or returns no alternatives, query Mouser Search API V2.
5. Cache verified technical data and replacement part numbers.
6. Cross-check returned MPNs against MacSunny inventory.
7. Return MacSunny stock first, then cached/external reference data.
8. Public external lookup remains disabled unless explicitly enabled.

## External providers

### Nexar

- OAuth 2.0 Client Credentials
- `NEXAR_CLIENT_ID`
- `NEXAR_CLIENT_SECRET`
- `NEXAR_PUBLIC_LOOKUP_ENABLED`
- GraphQL `supSearchMpn` + `similarParts`
- exact normalized MPN validation

### Mouser

- Search API V2
- `MOUSER_API_KEY`
- `MOUSER_PUBLIC_LOOKUP_ENABLED`
- `POST /api/v2/search/partnumberandmanufacturer`
- exact manufacturer-MPN validation
- `SuggestedReplacement` provides replacement candidates
- ProductAttributes supply technical specifications
- datasheet, image, lifecycle, manufacturer and description metadata are available to the server-side adapter

### AllDatasheet

AllDatasheet confirmed on 2026-09-23 that it no longer offers an API service. MacSunny therefore keeps only an optional manual reference link. No AllDatasheet scraping or automated API path is permitted.

## MongoDB cache

Model: `Equivalent`

Important fields include:

- `primary_sku`
- `primary_mpn`
- `primary_description`
- `primary_manufacturer`
- `primary_datasheet_url`
- `primary_reference_url`
- `primary_specs`
- `equivalents[]`
- `source`
- `cached_at`
- `expires_at`

Allowed current source values include `nexar`, `mouser`, `digikey`, `manual`, plus legacy `octopart`.

TTL: 90 days.

## Admin workspace

Route: `/admin/equivalents`

The workspace can:

- show Nexar and Mouser connection state
- test component searches
- show MacSunny inventory matches first
- identify cache/API usage
- display technical/datasheet data
- display equivalent/replacement part numbers
- delete cache records

## AI assistant integration

Equivalent/alternative requests use the same smart-search route. The assistant must distinguish MacSunny inventory from external reference data and must never describe external availability as MacSunny stock.

## Operational next step

Obtain a Mouser Search API key and add only `MOUSER_API_KEY` to Vercel Production. The adapter and routing are already implemented.
