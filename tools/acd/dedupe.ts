import type { CollectedVacancy, DuplicateMatch } from "./types.ts";
import { normalizeText, normalizeUrl } from "./normalize.ts";

export interface ComparableVacancy {
  id?: number;
  employerId: string;
  title: string;
  location?: string;
  requisitionId?: string;
  applyUrl?: string;
  evidence?: string;
  reference?: string;
  slug?: string;
}

function usableExactUrl(value?: string): string | undefined {
  const normalized = normalizeUrl(value);
  if (!normalized) return undefined;
  const url = new URL(normalized);
  url.pathname = url.pathname.replace(/\/apply\/?$/i, "/");
  const path = url.pathname.replace(/\/$/, "");
  return path && !/\/(?:careers?|jobs?)$/i.test(path) ? normalizeUrl(url.toString()) : undefined;
}

function requisition(requisitionId?: string, applyUrl?: string): string | undefined {
  return requisitionId || /\/j\/([^/]+)/i.exec(applyUrl ?? "")?.[1];
}

function meaningfulWords(value?: string): Set<string> {
  return new Set(normalizeText(value).split(" ").filter((word) => word.length >= 5));
}

function supportingRoleEvidence(candidate: CollectedVacancy, item: ComparableVacancy): boolean {
  const candidateWords = meaningfulWords(candidate.description);
  const itemWords = meaningfulWords(item.evidence);
  return [...candidateWords].filter((word) => itemWords.has(word)).length >= 2;
}

export function findDuplicates(candidate: CollectedVacancy, comparables: ComparableVacancy[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const candidateUrl = usableExactUrl(candidate.applyUrl);
  const candidateRequisition = requisition(candidate.requisitionId, candidate.applyUrl);
  const candidateTitle = normalizeText(candidate.title);
  for (const item of comparables) {
    if (candidate.employerId !== item.employerId) continue;
    const itemRequisition = requisition(item.requisitionId, item.applyUrl);
    const distinctRequisitions = Boolean(candidateRequisition && itemRequisition && candidateRequisition !== itemRequisition);
    const sameRequisition = Boolean(candidateRequisition && itemRequisition && candidateRequisition === itemRequisition);
    const sameApplicationUrl = Boolean(candidateUrl && candidateUrl === usableExactUrl(item.applyUrl));

    // A known distinct official requisition is never proof of an existing entry.
    if (!distinctRequisitions && (sameRequisition || sameApplicationUrl)) {
      matches.push({ kind: "exact", basis: sameRequisition ? "requisition_id" : "application_url", vacancyId: item.id, externalReference: item.reference, detail: sameRequisition ? `Matching requisition ID ${candidateRequisition}.` : "Matching canonical official application URL." });
      continue;
    }

    // Distinct requisitions can still be a reviewer warning when the role identity is otherwise the same.
    const sameLocation = Boolean(normalizeText(candidate.location) && normalizeText(candidate.location) === normalizeText(item.location));
    const credibleCautiousMatch = distinctRequisitions
      ? supportingRoleEvidence(candidate, item)
      : sameLocation || supportingRoleEvidence(candidate, item);
    if (candidateTitle === normalizeText(item.title) && credibleCautiousMatch) {
      matches.push({ kind: "cautious", basis: item.reference ? "existing_listing" : "title_location", vacancyId: item.id, externalReference: item.reference, detail: distinctRequisitions ? "Same employer and normalized role title, with distinct requisitions; review before treating as a new listing." : "Same employer plus normalized title and supporting role evidence; review before suppressing." });
    }
  }
  return matches;
}
