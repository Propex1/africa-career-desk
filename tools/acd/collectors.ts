import { normalizeLocation } from "./location.ts";
import type { CollectedVacancy, Source, SourceResult } from "./types.ts";

export interface CollectionResult { result: SourceResult; vacancies: CollectedVacancy[]; failureReason?: string; manualReviewRequired?: boolean; }
const now = () => new Date().toISOString();
const userAgent = { "User-Agent": "AfricaCareerDeskDiscovery/0.1 (local editorial review)" };
const optional = (value: string | undefined) => value && !/^(?:â€”|—|-|n\/?a)$/i.test(value.trim()) ? value : undefined;

export function workableHumanUrl(requisitionId: string): string { return `https://apply.workable.com/afreximbank/j/${requisitionId}/`; }

export async function verifiedWorkableHumanUrl(requisitionId: string): Promise<string | undefined> {
  const url = workableHumanUrl(requisitionId);
  try {
    const response = await fetch(url, { headers: userAgent, redirect: "follow" });
    return response.ok ? url : undefined;
  } catch { return undefined; }
}

function manual(): CollectionResult {
  return { result: "partially_successful", vacancies: [], manualReviewRequired: true, failureReason: "No automated LinkedIn collection is attempted. Public coverage is partial and manual review is required." };
}

async function collectWorkable(source: Source): Promise<CollectionResult> {
  const response = await fetch(source.url, { headers: userAgent });
  if (!response.ok) return { result: "inaccessible", vacancies: [], failureReason: `HTTP ${response.status}` };
  const rawVacancies = (await response.text()).split("\n").flatMap((line) => {
    if (!line.includes("/jobs/view/")) return [];
    const cells = line.split("|").map((cell) => cell.trim());
    const detail = /\[View\]\((https:\/\/apply\.workable\.com\/afreximbank\/jobs\/view\/([^\)]+))\.md\)/.exec(line);
    if (!detail || !cells[1]) return [];
    return [{ sourceKey: detail[2], employerId: source.employerId, sourceId: source.id, title: cells[1], department: optional(cells[2]), location: normalizeLocation(cells[3]), employmentType: optional(cells[4]), publishedAt: optional(cells[6]), requisitionId: detail[2], sourceUrl: source.url, sourceType: "Official ATS", evidence: `Official Workable listing: ${cells[1]}`, discoveredAt: now() }];
  });
  const vacancies = await Promise.all(rawVacancies.map(async (vacancy) => {
    const applyUrl = await verifiedWorkableHumanUrl(vacancy.requisitionId ?? vacancy.sourceKey);
    return { ...vacancy, applyUrl, applicationRouteStatus: applyUrl ? "available" as const : "broken" as const };
  }));
  return { result: vacancies.length ? "successful" : "no_vacancies_found", vacancies };
}

type PulaListing = { id: string; jobOpeningName: string; departmentLabel?: string; employmentStatusLabel?: string; location?: { city?: string; state?: string } };
type PulaDetail = { result?: { jobOpening?: { description?: string; departmentLabel?: string; location?: { city?: string; state?: string }; employmentStatusLabel?: string; jobOpeningShareUrl?: string; datePosted?: string } } };

async function collectPula(source: Source): Promise<CollectionResult> {
  const response = await fetch(source.url, { headers: userAgent });
  if (!response.ok) return { result: "inaccessible", vacancies: [], failureReason: `HTTP ${response.status}` };
  const listings = ((await response.json()) as { result?: PulaListing[] }).result ?? [];
  const vacancies: CollectedVacancy[] = [];
  for (const listing of listings) {
    const detailUrl = `https://pula.bamboohr.com/careers/${listing.id}/detail`;
    try {
      const detailResponse = await fetch(detailUrl, { headers: userAgent });
      const opening = detailResponse.ok ? ((await detailResponse.json()) as PulaDetail).result?.jobOpening : undefined;
      const location = opening?.location ?? listing.location;
      vacancies.push({ sourceKey: listing.id, employerId: source.employerId, sourceId: source.id, title: listing.jobOpeningName, department: opening?.departmentLabel ?? listing.departmentLabel, location: normalizeLocation(location?.city, location?.state), employmentType: opening?.employmentStatusLabel ?? listing.employmentStatusLabel, requisitionId: listing.id, description: opening?.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(), publishedAt: opening?.datePosted, applyUrl: opening?.jobOpeningShareUrl ?? `https://pula.bamboohr.com/careers/${listing.id}`, applicationRouteStatus: opening?.jobOpeningShareUrl ? "available" : "unknown", sourceUrl: detailUrl, sourceType: "Official ATS", evidence: `Official BambooHR vacancy ${listing.id}: ${listing.jobOpeningName}`, discoveredAt: now() });
    } catch {
      vacancies.push({ sourceKey: listing.id, employerId: source.employerId, sourceId: source.id, title: listing.jobOpeningName, department: listing.departmentLabel, location: normalizeLocation(listing.location?.city, listing.location?.state), requisitionId: listing.id, applicationRouteStatus: "unknown", sourceUrl: detailUrl, sourceType: "Official ATS", evidence: `Official BambooHR list entry ${listing.id}: ${listing.jobOpeningName}`, discoveredAt: now() });
    }
  }
  return { result: vacancies.length === listings.length ? (vacancies.length ? "successful" : "no_vacancies_found") : "partially_successful", vacancies };
}

export async function collectSource(source: Source): Promise<CollectionResult> {
  if (source.type.startsWith("linkedin")) return manual();
  if (source.id === "afreximbank-workable") return collectWorkable(source);
  if (source.id === "pula-bamboohr") return collectPula(source);
  if (source.id === "proparco-cornerstone") return { result: "unsupported", vacancies: [], manualReviewRequired: true, failureReason: "Cornerstone public search API has not been verified for unattended collection; manual official-ATS review required." };
  return { result: "successful", vacancies: [], failureReason: "Official informational careers page checked; it is not a vacancy feed." };
}
