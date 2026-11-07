import proposals from "../data/career-classification-proposals.json" with { type: "json" };
import { isCareerSelection } from "../data/career-taxonomy.ts";
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
        !isCareerSelection(proposal.classification)) return job;
    return { ...job, careerClassification: proposal.classification as CareerClassification };
  });
}
