export function normalizeText(value?: string): string {
  return (value ?? "").toLowerCase().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "source") url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch { return undefined; }
}

export function duplicateKey(employerId: string, title: string, location?: string): string {
  return [employerId, normalizeText(title), normalizeText(location)].join("|");
}
