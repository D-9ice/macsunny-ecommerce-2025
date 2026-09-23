const MOUSER_SEARCH_URL = 'https://api.mouser.com/api/v2/search/partnumberandmanufacturer';

type MouserAttribute = {
  AttributeName?: string | null;
  AttributeValue?: string | null;
};

type MouserPart = {
  Availability?: string | null;
  AvailabilityInStock?: string | null;
  Category?: string | null;
  DataSheetUrl?: string | null;
  Description?: string | null;
  ImagePath?: string | null;
  IsDiscontinued?: string | null;
  LifecycleStatus?: string | null;
  Manufacturer?: string | null;
  ManufacturerPartNumber?: string | null;
  MouserPartNumber?: string | null;
  ProductAttributes?: MouserAttribute[] | null;
  ProductDetailUrl?: string | null;
  SuggestedReplacement?: string | null;
};

type MouserResponse = {
  Errors?: Array<{ Message?: string | null }> | null;
  SearchResults?: {
    NumberOfResult?: number | null;
    Parts?: MouserPart[] | null;
  } | null;
};

export type MouserEquivalent = {
  mpn: string;
  manufacturer: string;
  description: string;
  specs: Record<string, string>;
  in_stock_external: boolean;
  distributor: 'Mouser';
};

export type MouserComponentResult = {
  found: boolean;
  resolvedQuery: string;
  source: {
    mpn: string;
    manufacturer: string;
    description: string;
    specs: Record<string, string>;
    datasheetUrl: string;
    productUrl: string;
    imageUrl: string;
    lifecycleStatus: string;
  };
  equivalents: MouserEquivalent[];
};

function normalizePart(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function lookupCandidates(partNumber: string) {
  const compact = partNumber.trim().toUpperCase().replace(/\s+/g, '');
  if (/^[ABCDJK]\d+[A-Z0-9-]*$/.test(compact)) {
    return [...new Set([compact, '2S' + compact])];
  }
  return [compact];
}

function specsFromPart(part: MouserPart) {
  const specs: Record<string, string> = {};

  for (const attribute of part.ProductAttributes || []) {
    const name = String(attribute.AttributeName || '').trim();
    const value = String(attribute.AttributeValue || '').trim();
    if (name && value && !specs[name]) specs[name] = value;
  }

  const lifecycle = String(part.LifecycleStatus || '').trim();
  if (lifecycle && !specs['Lifecycle Status']) specs['Lifecycle Status'] = lifecycle;

  const category = String(part.Category || '').trim();
  if (category && !specs['Category']) specs.Category = category;

  return specs;
}

function inExternalStock(part: MouserPart) {
  const numeric = Number.parseInt(String(part.AvailabilityInStock || '').replace(/[^0-9]/g, ''), 10);
  if (Number.isFinite(numeric)) return numeric > 0;
  return /in stock/i.test(String(part.Availability || ''));
}

async function requestParts(partNumber: string) {
  const apiKey = process.env.MOUSER_API_KEY?.trim();
  if (!apiKey) return [] as MouserPart[];

  const response = await fetch(
    MOUSER_SEARCH_URL + '?apiKey=' + encodeURIComponent(apiKey),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MacSunny-Electronics/1.0',
      },
      body: JSON.stringify({
        SearchByPartMfrNameRequest: {
          mouserPartNumber: partNumber,
          partSearchOptions: 'Exact',
        },
      }),
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as MouserResponse | null;

  if (!response.ok) {
    throw new Error('Mouser Search API request failed: HTTP ' + response.status);
  }

  const apiErrors = (payload?.Errors || [])
    .map((error) => String(error?.Message || '').trim())
    .filter(Boolean);
  if (apiErrors.length) {
    throw new Error('Mouser Search API error: ' + apiErrors.join('; '));
  }

  return payload?.SearchResults?.Parts || [];
}

async function resolveSuggestedReplacement(rawSuggestion: string) {
  const suggestion = rawSuggestion.trim();
  if (!suggestion || /^https?:\/\//i.test(suggestion)) return null;

  try {
    const parts = await requestParts(suggestion);
    const normalizedSuggestion = normalizePart(suggestion);
    const exact = parts.find((part) => {
      const manufacturerMpn = normalizePart(part.ManufacturerPartNumber);
      const mouserMpn = normalizePart(part.MouserPartNumber);
      return manufacturerMpn === normalizedSuggestion || mouserMpn === normalizedSuggestion;
    }) || parts[0];

    if (!exact) return {
      mpn: suggestion,
      manufacturer: '',
      description: '',
      specs: {},
      in_stock_external: false,
      distributor: 'Mouser' as const,
    };

    return {
      mpn: String(exact.ManufacturerPartNumber || suggestion).trim(),
      manufacturer: String(exact.Manufacturer || '').trim(),
      description: String(exact.Description || '').trim(),
      specs: specsFromPart(exact),
      in_stock_external: inExternalStock(exact),
      distributor: 'Mouser' as const,
    };
  } catch {
    return {
      mpn: suggestion,
      manufacturer: '',
      description: '',
      specs: {},
      in_stock_external: false,
      distributor: 'Mouser' as const,
    };
  }
}

export function isMouserConfigured() {
  return Boolean(process.env.MOUSER_API_KEY?.trim());
}

export async function searchMouserComponent(
  partNumber: string,
  options: { resolveReplacement?: boolean } = {},
): Promise<MouserComponentResult> {
  const query = partNumber.trim();
  const empty: MouserComponentResult = {
    found: false,
    resolvedQuery: query,
    source: {
      mpn: '',
      manufacturer: '',
      description: '',
      specs: {},
      datasheetUrl: '',
      productUrl: '',
      imageUrl: '',
      lifecycleStatus: '',
    },
    equivalents: [],
  };

  if (!query || !isMouserConfigured()) return empty;

  for (const candidate of lookupCandidates(query)) {
    const parts = await requestParts(candidate);
    const candidateKey = normalizePart(candidate);

    const exact = parts.find(
      (part) => normalizePart(part.ManufacturerPartNumber) === candidateKey,
    );

    if (!exact) continue;

    const equivalents: MouserEquivalent[] = [];
    const suggestion = String(exact.SuggestedReplacement || '').trim();

    if (suggestion) {
      if (options.resolveReplacement === false) {
        equivalents.push({
          mpn: suggestion,
          manufacturer: '',
          description: '',
          specs: {},
          in_stock_external: false,
          distributor: 'Mouser',
        });
      } else {
        const resolved = await resolveSuggestedReplacement(suggestion);
        if (resolved && normalizePart(resolved.mpn) !== candidateKey) equivalents.push(resolved);
      }
    }

    return {
      found: true,
      resolvedQuery: candidate,
      source: {
        mpn: String(exact.ManufacturerPartNumber || candidate).trim(),
        manufacturer: String(exact.Manufacturer || '').trim(),
        description: String(exact.Description || '').trim(),
        specs: specsFromPart(exact),
        datasheetUrl: String(exact.DataSheetUrl || '').trim(),
        productUrl: String(exact.ProductDetailUrl || '').trim(),
        imageUrl: String(exact.ImagePath || '').trim(),
        lifecycleStatus: String(exact.LifecycleStatus || '').trim(),
      },
      equivalents,
    };
  }

  return empty;
}
