const placeholders = new Set(["", "-", "--", "n/a", "na", "open", "not specified", "null", "undefined"]);

export function normalizeLocation(...values: Array<string | undefined | null>): string {
  const parts = values.flatMap((value) => (value ?? "").split(",")).map((value) => value.trim()).map((value) => {
    const remote = /^(?:n\/?a|open)\s*\((remote|hybrid)\)$/i.exec(value);
    return remote ? remote[1][0].toUpperCase() + remote[1].slice(1).toLowerCase() : value;
  }).filter((value) => !placeholders.has(value.toLowerCase()));
  const unique = [...new Map(parts.map((value) => [value.toLowerCase(), value])).values()];
  return unique.length ? unique.join(", ") : "Location not specified";
}
