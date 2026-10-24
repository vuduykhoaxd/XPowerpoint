export type License = "CC0" | "public-domain" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "OFL" | "MIT" | "Apache-2.0" | "commercial-ok" | "unknown";

export interface LicenseCheck {
  license: License;
  commercialUse: boolean;
  attributionRequired: boolean;
  embedAllowed: boolean;
  note: string;
}

const REGISTRY: Record<License, LicenseCheck> = {
  CC0: { license: "CC0", commercialUse: true, attributionRequired: false, embedAllowed: true, note: "Public domain dedication" },
  "public-domain": { license: "public-domain", commercialUse: true, attributionRequired: false, embedAllowed: true, note: "Public domain" },
  "CC-BY": { license: "CC-BY", commercialUse: true, attributionRequired: true, embedAllowed: true, note: "Credit author and license" },
  "CC-BY-SA": { license: "CC-BY-SA", commercialUse: true, attributionRequired: true, embedAllowed: true, note: "Derivative must share alike" },
  "CC-BY-NC": { license: "CC-BY-NC", commercialUse: false, attributionRequired: true, embedAllowed: true, note: "Non-commercial only" },
  OFL: { license: "OFL", commercialUse: true, attributionRequired: true, embedAllowed: true, note: "Keep OFL license with font" },
  MIT: { license: "MIT", commercialUse: true, attributionRequired: true, embedAllowed: true, note: "Keep copyright notice" },
  "Apache-2.0": { license: "Apache-2.0", commercialUse: true, attributionRequired: true, embedAllowed: true, note: "Keep NOTICE" },
  "commercial-ok": { license: "commercial-ok", commercialUse: true, attributionRequired: false, embedAllowed: true, note: "Verify provider terms, keep proof" },
  unknown: { license: "unknown", commercialUse: false, attributionRequired: true, embedAllowed: false, note: "Unknown: blocked for commercial decks" },
};

export function normalizeLicense(input: string | undefined, source = ""): License {
  const s = (input ?? "").toLowerCase().trim();
  if (/^cc[-_ ]?0/.test(s)) return "CC0";
  if (/public[-_ ]?domain|pdm/.test(s)) return "public-domain";
  if (/by[-_ ]?sa/.test(s)) return "CC-BY-SA";
  if (/by[-_ ]?nc/.test(s)) return "CC-BY-NC";
  if (/^cc[-_ ]?by/.test(s)) return "CC-BY";
  if (/ofl|open font/.test(s)) return "OFL";
  if (/^mit$/.test(s)) return "MIT";
  if (/apache/.test(s)) return "Apache-2.0";
  if (/commercial|proprietary|paid/.test(s)) return "commercial-ok";
  if (/wikimedia|unsplash|pexels|pixabay/.test(source)) return "CC0";
  return "unknown";
}

export function checkLicense(input: string | undefined, commercial = true, source = ""): LicenseCheck {
  const lic = normalizeLicense(input, source);
  const reg = REGISTRY[lic];
  const blocked = commercial && !reg.commercialUse;
  return { ...reg, note: blocked ? `${reg.note} — BLOCKED for commercial use` : reg.note };
}

export function attributionOf(asset: { author?: string; sourceUrl?: string; license?: string; title?: string }): string {
  const lic = normalizeLicense(asset.license);
  if (!REGISTRY[lic].attributionRequired) return "";
  return `${asset.title ?? "Asset"} — ${asset.author ?? "Unknown"} / ${lic} / ${asset.sourceUrl ?? ""}`.trim();
}

export function validateLicenses(assets: any[], commercial = true) {
  const issues: any[] = [];
  for (const a of assets) {
    const check = checkLicense(a.license, commercial, a.sourceUrl ?? "");
    if (!check.commercialUse && commercial) issues.push({ id: a.id, license: a.license, code: "E_LICENSE", message: check.note });
    else if (check.attributionRequired && !a.attribution) issues.push({ id: a.id, license: a.license, code: "E_LICENSE", message: "Attribution missing", severity: "minor" });
  }
  return { ok: issues.filter((i) => i.code === "E_LICENSE" && !i.severity).length === 0, issues };
}
