import proposals from "../data/career-classification-proposals.json" with { type: "json" };
import { isClassificationMetadata } from "./career-classification.ts";
import type { CareerClassification } from "./career-classification.ts";
import type { Opportunity } from "../types/index.ts";

/** Called only by the server page for an explicitly enabled Preview deployment. */
export function withCareerPreviewProposals(jobs: readonly Opportunity[]): Opportunity[] {
  return jobs.map(job => {
    if (job.careerClassification) return job;
    const proposal = proposals[job.id as keyof typeof proposals];
    // A new/edited main record must never silently inherit an old proposal.
    if (!proposal || proposal.title !== job.title || proposal.company !== job.company ||
        proposal.roleType !== job.roleType || proposal.classification.sourceUrl !== job.sourceUrl ||
        !isClassificationMetadata(proposal.classification)) return job;
    if (proposal.evidence && JSON.stringify(proposal.evidence) !== JSON.stringify(classificationEvidence(job))) return job;
    return { ...job, careerClassification: proposal.classification as CareerClassification };
  });
}

/** Ignore lifecycle/publication changes; invalidate when the underlying duties change. */
export function classificationEvidence(job: Opportunity) {
  return { summary: job.summary, aboutRole: job.aboutRole ?? "", responsibilities: job.responsibilities ?? [], requirements: job.requirements ?? [] };
}
