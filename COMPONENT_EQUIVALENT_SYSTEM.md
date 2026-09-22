# Component Equivalent Search System

## Purpose

Provide MacSunny customers and administrators with useful component alternatives while prioritizing MacSunny inventory and minimizing external API usage.

## Production design

### Search order

1. Search MacSunny products by SKU, MPN, and name.
2. Read a valid 90-day equivalent cache entry when available.
3. If no cache exists and Nexar is configured, request similar parts from Nexar Supply GraphQL.
4. Cache returned alternatives for 90 days.
5. Cross-check returned MPNs against MacSunny inventory.
6. Return local stock first, then cached/external reference data.

### External provider

Provider: **Nexar Supply API**, backed by Octopart supply data.

Authentication:

- OAuth 2.0
- Client Credentials grant
- Scope: `supply.domain`
- Credentials: `NEXAR_CLIENT_ID` and `NEXAR_CLIENT_SECRET`
- Access tokens are obtained server-side and cached until shortly before expiry.

GraphQL:

- Endpoint: `https://api.nexar.com/graphql`
- Primary operation: `supSearchMpn`
- Equivalent source: `similarParts`
- Returned fields currently include MPN, manufacturer, description, technical specifications, seller inventory, and median 1000-unit reference pricing where available.

### MongoDB cache

Collection/model: `Equivalent`

Important fields:

- `primary_sku`
- `primary_name`
- `equivalents[]`
- `source`
- `cached_at`
- `expires_at`

Allowed source values include:

- `nexar`
- `octopart` — legacy cached records only
- `digikey`
- `manual`

TTL: 90 days.

## AI assistant integration

The MacSunny AI assistant detects equivalent/alternative requests, extracts a part-number-like token, then uses the smart equivalent search.

Examples:

- `What's equivalent to BC547?` → extracts `BC547`
- `Find an alternative for IRFP460` → extracts `IRFP460`
- `Replacement for LM7805` → extracts `LM7805`

The assistant must distinguish:

- products actually stocked by MacSunny;
- known equivalent/reference parts from Nexar or cache;
- external distributor availability.

It must not describe an externally available component as MacSunny stock unless a local inventory match exists.

## Admin workspace

Route: `/admin/equivalents`

Functions:

- view Nexar configuration state;
- test component-equivalent searches;
- inspect cache records;
- identify whether a search used cache or external API;
- delete cached records when necessary.

## Legacy status

Removed:

- static `OCTOPART_API_KEY` integration;
- Octopart v4 REST endpoint;
- `/api/equivalents/octopart`.

Retained only for compatibility:

- old MongoDB records whose `source` is `octopart`.

## Next operational step

Create the Nexar Supply application and add its Client ID/Secret to Vercel. No further architecture change should be required for initial credential activation.
