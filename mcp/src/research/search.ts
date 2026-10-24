import { cacheGet, cacheSet, hashOf } from "../utils/cache.js";

export interface SearchHit {
  title: string; url: string; snippet: string; source: string;
}

const UA = "XPowerpoint/0.1 (+research tool)";

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "vi,en;q=0.8" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(t); }
}

function decode(s: string): string {
  return s.replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

export async function webSearch(query: string, limit = 8): Promise<{ ok: boolean; results: SearchHit[]; warning?: string }> {
  const key = "search:" + hashOf(query + limit);
  const cached = cacheGet(key);
  if (cached) return { ok: true, results: cached };
  try {
    const html = await fetchText("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query));
    const results: SearchHit[] = [];
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < limit) {
      let url = m[1];
      const bang = url.indexOf("uddg=");
      if (bang >= 0) url = decodeURIComponent(url.slice(bang + 5).split("&")[0]);
      results.push({ title: decode(m[2]), url, snippet: decode(m[3]), source: "duckduckgo" });
    }
    if (!results.length) {
      const re2 = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((m = re2.exec(html)) && results.length < limit) {
        let url = m[1];
        const bang = url.indexOf("uddg=");
        if (bang >= 0) url = decodeURIComponent(url.slice(bang + 5).split("&")[0]);
        results.push({ title: decode(m[2]), url, snippet: "", source: "duckduckgo" });
      }
    }
    if (!results.length) return { ok: false, results: [], warning: "No results parsed (network or markup change)" };
    cacheSet(key, results, 6 * 3600 * 1000);
    return { ok: true, results };
  } catch (e: any) {
    return { ok: false, results: [], warning: `Search failed: ${e?.message ?? e}` };
  }
}

export async function researchTopic(topic: string, limit = 8): Promise<{ ok: boolean; topic: string; summary?: string; results: SearchHit[]; warning?: string }> {
  const key = "research:" + hashOf(topic + limit);
  const cached = cacheGet(key);
  if (cached) return cached;
  const [wiki, search] = await Promise.all([
    wikipediaSummary(topic).catch(() => null),
    webSearch(topic, limit),
  ]);
  const out = {
    ok: Boolean(wiki || search.ok),
    topic,
    summary: wiki?.extract,
    wikiUrl: wiki?.url,
    results: search.results,
    warning: search.warning,
  };
  if (out.ok) cacheSet(key, out, 6 * 3600 * 1000);
  return out;
}

async function wikipediaSummary(topic: string): Promise<{ extract: string; url: string } | null> {
  const lang = /[àáảãạăâđêôơư]/i.test(topic) ? "vi" : "en";
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, "_"))}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const data: any = await res.json();
  if (!data?.extract) return null;
  return {
    extract: data.extract,
    url: data.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
  };
}

export async function openverseSearch(query: string, kind: "image" | "audio" = "image", limit = 10) {
  const key = `openverse:${kind}:${hashOf(query + limit)}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const url = `https://api.openverse.org/v1/${kind === "image" ? "images" : "audio"}/?q=${encodeURIComponent(query)}&page_size=${limit}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return { ok: false, results: [], warning: `Openverse HTTP ${res.status}` };
    const data: any = await res.json();
    const results = (data.results ?? []).map((r: any) => ({
      id: r.id, title: r.title, url: r.url, thumbnail: r.thumbnail,
      license: r.license, licenseVersion: r.license_version,
      attribution: r.attribution, creator: r.creator, source: r.source,
      width: r.width, height: r.height, foreignLandingUrl: r.foreign_landing_url,
    }));
    cacheSet(key, results, 24 * 3600 * 1000);
    return { ok: true, results };
  } catch (e: any) {
    return { ok: false, results: [], warning: e?.message ?? "Openverse failed" };
  }
}
