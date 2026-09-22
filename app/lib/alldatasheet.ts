const ALLDATASHEET_DIRECT_BASE = 'https://www.alldatasheet.net/view.jsp?Searchword=';

export type AllDatasheetPart = {
  found: boolean;
  query: string;
  mpn: string;
  manufacturer: string;
  description: string;
  specs: Record<string, string>;
  datasheetUrl: string;
  referenceUrl: string;
};

function normalizePart(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function safeHttpUrl(value: unknown) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function allDatasheetReferenceUrl(partNumber: string) {
  return ALLDATASHEET_DIRECT_BASE + encodeURIComponent(partNumber.trim());
}

export function isAllDatasheetConfigured() {
  return Boolean(
    process.env.ALLDATASHEET_API_KEY?.trim() &&
    process.env.ALLDATASHEET_API_URL_TEMPLATE?.trim()
  );
}

function resolveApiUrl(partNumber: string) {
  const template = process.env.ALLDATASHEET_API_URL_TEMPLATE?.trim();
  const apiKey = process.env.ALLDATASHEET_API_KEY?.trim();
  if (!template || !apiKey) throw new Error('AllDatasheet API is not configured');

  const encodedPart = encodeURIComponent(partNumber.trim());
  const encodedKey = encodeURIComponent(apiKey);
  let resolved = template
    .replaceAll('{part}', encodedPart)
    .replaceAll('{query}', encodedPart)
    .replaceAll('{key}', encodedKey);

  if (!template.includes('{part}') && !template.includes('{query}')) {
    const url = new URL(resolved);
    url.searchParams.set(process.env.ALLDATASHEET_API_QUERY_PARAM?.trim() || 'part', partNumber.trim());
    resolved = url.toString();
  }

  if (!template.includes('{key}') && !process.env.ALLDATASHEET_API_KEY_HEADER?.trim()) {
    const url = new URL(resolved);
    url.searchParams.set(process.env.ALLDATASHEET_API_KEY_PARAM?.trim() || 'key', apiKey);
    resolved = url.toString();
  }

  return resolved;
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}

function candidateRecords(payload: unknown) {
  if (Array.isArray(payload)) return payload.map(asRecord).filter(Boolean) as Record<string, any>[];
  const root = asRecord(payload);
  if (!root) return [];

  const wrappers = [
    root.results,
    root.items,
    root.data,
    root.parts,
    root.result,
    root.records,
  ];

  for (const wrapper of wrappers) {
    if (Array.isArray(wrapper)) {
      return wrapper.map(asRecord).filter(Boolean) as Record<string, any>[];
    }
    const single = asRecord(wrapper);
    if (single) return [single];
  }

  return [root];
}

function firstString(record: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseSpecs(record: Record<string, any>) {
  const value = record.specifications || record.specs || record.parameters || record.attributes;
  if (!value) return {} as Record<string, string>;

  if (Array.isArray(value)) {
    const output: Record<string, string> = {};
    for (const item of value.slice(0, 30)) {
      const entry = asRecord(item);
      if (!entry) continue;
      const name = firstString(entry, ['name', 'label', 'attribute', 'key']);
      const specValue = firstString(entry, ['value', 'displayValue', 'text']);
      if (name && specValue) output[name] = specValue;
    }
    return output;
  }

  const objectValue = asRecord(value);
  if (!objectValue) return {};

  return Object.fromEntries(
    Object.entries(objectValue)
      .filter(([, specValue]) => ['string', 'number', 'boolean'].includes(typeof specValue))
      .slice(0, 30)
      .map(([key, specValue]) => [key, String(specValue)])
  );
}

export async function searchAllDatasheetPart(partNumber: string): Promise<AllDatasheetPart> {
  const query = partNumber.trim();
  const referenceUrl = allDatasheetReferenceUrl(query);
  const empty: AllDatasheetPart = {
    found: false,
    query,
    mpn: '',
    manufacturer: '',
    description: '',
    specs: {},
    datasheetUrl: '',
    referenceUrl,
  };

  if (!query || !isAllDatasheetConfigured()) return empty;

  const url = resolveApiUrl(query);
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain;q=0.9',
    'User-Agent': 'MacSunny-Electronics/1.0',
  };

  const headerName = process.env.ALLDATASHEET_API_KEY_HEADER?.trim();
  if (headerName) headers[headerName] = process.env.ALLDATASHEET_API_KEY!.trim();

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('AllDatasheet API request failed: HTTP ' + response.status);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json')) {
    // The official API contract will be finalized after registration.
    // Until then, never scrape or infer fields from HTML/text responses.
    return empty;
  }

  const payload = await response.json().catch(() => null);
  const queryKey = normalizePart(query);

  for (const record of candidateRecords(payload)) {
    const mpn = firstString(record, [
      'mpn',
      'part_number',
      'partNumber',
      'part',
      'part_no',
      'partNo',
      'model',
    ]);

    if (mpn && normalizePart(mpn) !== queryKey) continue;

    const datasheetUrl = safeHttpUrl(firstString(record, [
      'datasheet_url',
      'datasheetUrl',
      'pdf_url',
      'pdfUrl',
      'url',
      'link',
    ]));

    const description = firstString(record, [
      'description',
      'short_description',
      'shortDescription',
      'title',
      'name',
    ]);

    const manufacturer = firstString(record, [
      'manufacturer',
      'maker',
      'brand',
      'vendor',
    ]);

    if (!mpn && !datasheetUrl && !description) continue;

    return {
      found: true,
      query,
      mpn: mpn || query,
      manufacturer,
      description,
      specs: parseSpecs(record),
      datasheetUrl,
      referenceUrl,
    };
  }

  return empty;
}
