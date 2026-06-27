// Wikimedia/Commons image resolution for the seed scrape (LIBRARY_SEED.md). For each
// scientificName we resolve one representative image plus its license + author + source URL,
// accepting only PD/CC0/CC-BY/CC-BY-SA (else null — never embed an unlicensed image). Results
// (including misses) are cached so re-running the scrape is cheap and reproducible.
//
// `fetch` is injected so unit tests can stub the network and the offline loader never touches
// it. This module runs ONLY in seed:scrape, never in db:seed.

export interface ImageResult {
  imageUrl: string | null;
  imageLicense: string | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
}

export interface ImageCacheEntry extends ImageResult {
  resolvedAt: string;
  miss: boolean;
}

export type ImageCache = Record<string, ImageCacheEntry>;

type FetchFn = typeof globalThis.fetch;

const USER_AGENT = "SproutGo-Seed/1.0 (https://github.com/; library seed image resolver)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

// Accept only free licenses. Matched case-insensitively against extmetadata LicenseShortName.
const FREE_LICENSE = /^(public domain|cc0|cc[ -]by([ -]sa)?(\s|-)?\d|cc[ -]by([ -]sa)?$)/i;

export function isFreeLicense(licenseShortName: string | null | undefined): boolean {
  if (!licenseShortName) return false;
  return FREE_LICENSE.test(licenseShortName.trim());
}

function stripHtml(s: string | undefined): string | null {
  if (!s) return null;
  const text = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text || null;
}

async function getJson(url: string, fetchFn: FetchFn): Promise<any> {
  const res = await fetchFn(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Find a Commons file name for a species: Wikidata entity → P18 image, else Commons file search.
async function findCommonsFile(scientificName: string, fetchFn: FetchFn): Promise<string | null> {
  // 1) Wikidata search → entity → P18.
  try {
    const search = await getJson(
      `${WIKIDATA_API}?action=wbsearchentities&format=json&language=en&type=item&limit=1&search=${encodeURIComponent(scientificName)}`,
      fetchFn,
    );
    const qid: string | undefined = search?.search?.[0]?.id;
    if (qid) {
      const entity = await getJson(
        `${WIKIDATA_API}?action=wbgetclaims&format=json&property=P18&entity=${qid}`,
        fetchFn,
      );
      const file: string | undefined = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (file) return `File:${file}`;
    }
  } catch {
    // fall through to Commons search
  }

  // 2) Commons file-namespace search fallback.
  try {
    const res = await getJson(
      `${COMMONS_API}?action=query&format=json&list=search&srnamespace=6&srlimit=1&srsearch=${encodeURIComponent(scientificName)}`,
      fetchFn,
    );
    const title: string | undefined = res?.query?.search?.[0]?.title;
    return title ?? null;
  } catch {
    return null;
  }
}

// Pull imageinfo (sized URL + license/author/source) for a Commons file title.
async function getImageInfo(fileTitle: string, fetchFn: FetchFn): Promise<ImageResult | null> {
  const res = await getJson(
    `${COMMONS_API}?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=${encodeURIComponent(fileTitle)}`,
    fetchFn,
  );
  const pages = res?.query?.pages;
  const page = pages && Object.values(pages)[0];
  const info = (page as any)?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  const license: string | null = meta.LicenseShortName?.value ?? null;
  if (!isFreeLicense(license)) return null;

  return {
    imageUrl: info.thumburl ?? info.url ?? null,
    imageLicense: license,
    imageAttribution: stripHtml(meta.Artist?.value),
    imageSourceUrl: info.descriptionurl ?? null,
  };
}

const EMPTY: ImageResult = {
  imageUrl: null,
  imageLicense: null,
  imageAttribution: null,
  imageSourceUrl: null,
};

// Resolve one image for a species, using the cache first. Cache misses are recorded too so a
// re-run doesn't re-query known-missing species. `now` is injected (tests + reproducibility).
export async function resolveImage(
  scientificName: string,
  cache: ImageCache,
  fetchFn: FetchFn = globalThis.fetch,
  now: () => string = () => new Date().toISOString(),
): Promise<ImageResult> {
  const cached = cache[scientificName];
  if (cached) return cached.miss ? EMPTY : cached;

  let result: ImageResult = EMPTY;
  try {
    const file = await findCommonsFile(scientificName, fetchFn);
    if (file) {
      result = (await getImageInfo(file, fetchFn)) ?? EMPTY;
    }
  } catch {
    result = EMPTY;
  }

  const miss = result.imageUrl == null;
  cache[scientificName] = { ...result, miss, resolvedAt: now() };
  return result;
}
