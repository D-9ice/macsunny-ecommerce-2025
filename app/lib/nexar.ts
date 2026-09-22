const NEXAR_TOKEN_URL = 'https://identity.nexar.com/connect/token';
const NEXAR_GRAPHQL_URL = 'https://api.nexar.com/graphql';
const NEXAR_SCOPE = 'supply.domain';
const TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000;

type NexarTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type NexarSpec = {
  attribute?: { name?: string | null } | null;
  displayValue?: string | null;
};

type NexarOffer = {
  inventoryLevel?: number | null;
};

type NexarSeller = {
  company?: { name?: string | null } | null;
  offers?: NexarOffer[] | null;
};

type NexarSimilarPart = {
  mpn?: string | null;
  shortDescription?: string | null;
  manufacturer?: { name?: string | null } | null;
  specs?: NexarSpec[] | null;
  sellers?: NexarSeller[] | null;
  medianPrice1000?: {
    price?: number | null;
    currency?: string | null;
  } | null;
};

type NexarPart = {
  mpn?: string | null;
  shortDescription?: string | null;
  manufacturer?: { name?: string | null } | null;
  specs?: NexarSpec[] | null;
  similarParts?: NexarSimilarPart[] | null;
};

type NexarGraphQlResponse = {
  data?: {
    supSearchMpn?: {
      results?: Array<{
        part?: NexarPart | null;
      }> | null;
    } | null;
  };
  errors?: Array<{ message?: string | null }>;
};

export type NexarEquivalent = {
  mpn: string;
  manufacturer: string;
  description: string;
  specs: Record<string, string>;
  in_stock_external: boolean;
  distributor: string;
  price_info?: string;
};

export type NexarEquivalentSearchResult = {
  sourceFound: boolean;
  resolvedQuery: string;
  source: {
    mpn: string;
    manufacturer: string;
    description: string;
    specs: Record<string, string>;
  };
  equivalents: NexarEquivalent[];
};

declare global {
  // eslint-disable-next-line no-var
  var __macsunnyNexarToken: NexarTokenCache | undefined;
}

export function isNexarConfigured() {
  return Boolean(
    process.env.NEXAR_CLIENT_ID?.trim() &&
    process.env.NEXAR_CLIENT_SECRET?.trim()
  );
}

async function getNexarAccessToken() {
  if (!isNexarConfigured()) {
    throw new Error('Nexar credentials are not configured');
  }

  const now = Date.now();
  const cached = globalThis.__macsunnyNexarToken;
  if (cached && cached.expiresAt - TOKEN_SAFETY_WINDOW_MS > now) {
    return cached.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.NEXAR_CLIENT_ID!.trim(),
    client_secret: process.env.NEXAR_CLIENT_SECRET!.trim(),
    scope: NEXAR_SCOPE,
  });

  const response = await fetch(NEXAR_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MacSunny-Electronics/1.0',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    const detail = payload?.error_description || payload?.error || `HTTP ${response.status}`;
    throw new Error(`Nexar authorization failed: ${detail}`);
  }

  const expiresInSeconds = Number(payload.expires_in) || 86400;
  globalThis.__macsunnyNexarToken = {
    accessToken: String(payload.access_token),
    expiresAt: now + expiresInSeconds * 1000,
  };

  return globalThis.__macsunnyNexarToken.accessToken;
}

function toSpecs(specs: NexarSpec[] | null | undefined) {
  const result: Record<string, string> = {};
  for (const spec of specs || []) {
    const name = spec.attribute?.name?.trim();
    const value = spec.displayValue?.trim();
    if (name && value) result[name] = value;
  }
  return result;
}

function stockSellers(sellers: NexarSeller[] | null | undefined) {
  const names = new Set<string>();

  for (const seller of sellers || []) {
    const hasStock = (seller.offers || []).some(
      (offer) => Number(offer.inventoryLevel || 0) > 0
    );
    const name = seller.company?.name?.trim();
    if (hasStock && name) names.add(name);
  }

  return [...names];
}

function nexarLookupCandidates(partNumber: string) {
  const normalized = partNumber.trim();
  const compact = normalized.replace(/\s+/g, '').toUpperCase();

  // Common Japanese JIS device markings omit the leading "2S":
  // A1015 -> 2SA1015, B772 -> 2SB772, C945 -> 2SC945,
  // D313 -> 2SD313, J/K prefixes likewise map to 2SJ/2SK.
  if (/^[ABCDJK]\d+[A-Z0-9-]*$/.test(compact)) {
    return [...new Set([`2S${compact}`, normalized])];
  }

  return [normalized];
}

const SIMILAR_PARTS_QUERY = `
  query MacSunnyEquivalentSearch($mpn: String!) {
    supSearchMpn(q: $mpn, limit: 1) {
      results {
        part {
          mpn
          shortDescription
          manufacturer {
            name
          }
          specs {
            attribute {
              name
            }
            displayValue
          }
          similarParts {
            mpn
            shortDescription
            manufacturer {
              name
            }
            specs {
              attribute {
                name
              }
              displayValue
            }
            sellers {
              company {
                name
              }
              offers {
                inventoryLevel
              }
            }
            medianPrice1000 {
              price
              currency
            }
          }
        }
      }
    }
  }
`;

export async function searchNexarEquivalents(partNumber: string): Promise<NexarEquivalentSearchResult> {
  const normalized = partNumber.trim();
  if (!normalized) {
    return {
      sourceFound: false,
      resolvedQuery: '',
      source: { mpn: '', manufacturer: '', description: '', specs: {} },
      equivalents: [],
    };
  }

  const accessToken = await getNexarAccessToken();
  let sourcePart: NexarPart | null | undefined;
  let resolvedQuery = normalized;

  for (const candidate of nexarLookupCandidates(normalized)) {
    const response = await fetch(NEXAR_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'MacSunny-Electronics/1.0',
      },
      body: JSON.stringify({
        query: SIMILAR_PARTS_QUERY,
        variables: { mpn: candidate },
      }),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as NexarGraphQlResponse | null;

    if (!response.ok) {
      throw new Error(`Nexar GraphQL request failed: HTTP ${response.status}`);
    }

    if (payload?.errors?.length) {
      const message = payload.errors.map((error) => error.message).filter(Boolean).join('; ');
      throw new Error(`Nexar GraphQL error: ${message || 'Unknown error'}`);
    }

    const candidatePart = payload?.data?.supSearchMpn?.results?.[0]?.part;
    if (candidatePart) {
      sourcePart = candidatePart;
      resolvedQuery = candidate;
      break;
    }
  }
  const sourceMpn = sourcePart?.mpn?.trim().toUpperCase();
  const dedupe = new Set<string>();
  const equivalents: NexarEquivalent[] = [];

  for (const part of sourcePart?.similarParts || []) {
    const mpn = part.mpn?.trim();
    if (!mpn) continue;

    const key = mpn.toUpperCase();
    if (key === sourceMpn || dedupe.has(key)) continue;
    dedupe.add(key);

    const distributors = stockSellers(part.sellers);
    const price = part.medianPrice1000?.price;
    const currency = part.medianPrice1000?.currency;

    equivalents.push({
      mpn,
      manufacturer: part.manufacturer?.name?.trim() || 'Unknown',
      description: part.shortDescription?.trim() || 'No description',
      specs: toSpecs(part.specs),
      in_stock_external: distributors.length > 0,
      distributor: distributors.length > 0 ? distributors.join(', ') : 'Unknown',
      price_info:
        typeof price === 'number' && currency
          ? `~${currency} ${price.toFixed(2)} (1k qty)`
          : undefined,
    });

    if (equivalents.length >= 10) break;
  }

  return {
    sourceFound: Boolean(sourcePart),
    resolvedQuery,
    source: {
      mpn: sourcePart?.mpn?.trim() || resolvedQuery,
      manufacturer: sourcePart?.manufacturer?.name?.trim() || '',
      description: sourcePart?.shortDescription?.trim() || '',
      specs: toSpecs(sourcePart?.specs),
    },
    equivalents,
  };
}
