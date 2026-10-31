import type { Opportunity } from "../types/index.ts";

const countryCodes: Record<string, string> = {
  CIV: "Côte d’Ivoire", COD: "DR Congo", ZAF: "South Africa",
  AGO: "Angola", BEN: "Benin", BWA: "Botswana", CMR: "Cameroon",
  COG: "Republic of the Congo", EGY: "Egypt", ETH: "Ethiopia",
  GAB: "Gabon", GHA: "Ghana", GIN: "Guinea", GMB: "Gambia",
  KEN: "Kenya", MAR: "Morocco", MDG: "Madagascar", MUS: "Mauritius",
  NAM: "Namibia", NGA: "Nigeria", RWA: "Rwanda", SEN: "Senegal",
  TGO: "Togo", TUN: "Tunisia", TZA: "Tanzania", UGA: "Uganda",
  ZMB: "Zambia", ZWE: "Zimbabwe", MRT: "Mauritania", GNQ: "Equatorial Guinea",
  GBR: "United Kingdom", USA: "United States", FRA: "France",
  BEL: "Belgium", LUX: "Luxembourg", SGP: "Singapore", ARE: "United Arab Emirates",
};
const readable = (value: string) => value.trim()
  .replace(/\bDemocratic Republic of (?:the )?Congo\b/gi, "DR Congo")
  .replace(/\b[A-Z]{3}\b/g, code => countryCodes[code] ?? code);
const complex = /[\/;]|\b(?:remote|hybrid|regional|multiple|various|unknown|unspecified|not stated|not specified|depends|preferred|or|area|mandate|pipeline|remit|markets|then)\b|[()·—]/i;

/** Card copy only: never mutate location records or infer a city from a region. */
export function cardLocation(job: Pick<Opportunity, "city" | "country" | "locationDisplay" | "workArrangement">): string {
  const display = readable(job.locationDisplay);
  const city = readable(job.city ?? "");
  const country = readable(job.country ?? "");
  let label = display;
  if (!complex.test(display) && city && country && !complex.test(city) && !complex.test(country)) {
    // Only simplify when the display corroborates the structured city and country.
    // Keep regional and ambiguous labels intact instead of assuming the first comma is a city.
    const parts = display.split(",").map(part => part.trim());
    if (display === city || (parts.includes(city) && parts.at(-1) === country)) {
      label = `${city}, ${country}`;
    }
  }
  // These are explicitly named administrative subdivisions, not inferred locations.
  label = label.replace(/, (?:Khomas Region|Greater Accra Region|Gauteng), /g, ", ");
  if (!label) label = "Location not specified";
  if (job.workArrangement === "remote" && !/\bremote\b/i.test(label)) label = `Remote — ${label}`;
  return label;
}
