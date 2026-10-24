export interface SourceMetadata {
  url: string;
  title?: string;
  author?: string;
  publisher?: string;
  publishedAt?: string;
  retrievedAt: string;
  quote?: string;
}

export function sourceOf(url: string, meta: Partial<SourceMetadata> = {}): SourceMetadata {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { host = "unknown"; }
  return {
    url,
    title: meta.title ?? host,
    author: meta.author,
    publisher: meta.publisher ?? host,
    publishedAt: meta.publishedAt,
    retrievedAt: new Date().toISOString(),
    quote: meta.quote,
  };
}

export function citationStyle(s: SourceMetadata, style: "apa" | "chicago" | "simple" = "simple"): string {
  const date = s.publishedAt ? new Date(s.publishedAt).getFullYear() : "n.d.";
  if (style === "apa") return `${s.author ?? s.publisher ?? "Unknown"} (${date}). ${s.title ?? ""}. ${s.publisher ?? ""}. ${s.url}`.replace(/\s+/g, " ").trim();
  if (style === "chicago") return `${s.author ?? s.publisher ?? "Unknown"}. "${s.title ?? ""}." ${s.publisher ?? ""}, ${date}. ${s.url}.`;
  return `${s.title ?? s.publisher ?? s.url} — ${s.publisher ?? ""}${s.publishedAt ? " (" + date + ")" : ""}. ${s.url}`.replace(/\s+/g, " ").trim();
}

export function ensureClaimsSourced(claims: { text: string; source?: string }[]) {
  const missing = claims.filter((c) => !c.source || !/^https?:\/\//.test(c.source));
  return { ok: missing.length === 0, missing };
}
