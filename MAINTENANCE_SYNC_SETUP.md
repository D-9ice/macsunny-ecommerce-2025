# MacSunny ↔ Frontier maintenance synchronization

The maintenance channel is installed but intentionally fails closed until production secrets are configured.

## Required server-only environment variables

Set these on the MacSunny production deployment:

```env
CLIENT_MAINTENANCE_SYNC_SECRET=<same-long-random-secret-used-by-Frontier>
FRONTIER_MAINTENANCE_BASE_URL=https://frontier-devconsults.com
```

Set the same `CLIENT_MAINTENANCE_SYNC_SECRET` on Frontier DevConsults.

Do not prefix the secret with `NEXT_PUBLIC_` and do not place the real value in source control.

## Security properties

- HMAC-SHA256 request signing
- 5-minute timestamp window
- unique nonce per request
- replay rejection
- bounded JSON payloads
- server-to-server endpoints only
- no remote destructive administration
- Frontier remains authoritative for completed-service records
- MacSunny receives synchronized client-facing records and notices

## Quarterly service cadence

MacSunny service and maintenance is scheduled every **3 calendar months**.

The authoritative starting date must be entered from the real contract/service history. No date is invented by the application.

After Frontier records a completed service, the next due date is calculated three calendar months later and synchronized to MacSunny.
