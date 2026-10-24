import type { Opportunity } from "@/types";

function overlapCount(first: readonly string[] = [], second: readonly string[] = []) {
  const secondSet = new Set(second);
  return first.filter((value) => secondSet.has(value)).length;
}

function relatedScore(current: Opportunity, candidate: Opportunity): number {
  let score = 0;

  if (candidate.company === current.company) score += 10;
  if (candidate.roleType === current.roleType) score += 8;
  if (
    current.experienceBucket &&
    candidate.experienceBucket === current.experienceBucket
  ) {
    score += 5;
  }
  if (current.country && candidate.country === current.country) score += 4;
  if (current.region && candidate.region === current.region) score += 2;
  if (
    current.workArrangement &&
    candidate.workArrangement === current.workArrangement
  ) {
    score += 1;
  }
  score += Math.min(
    overlapCount(current.languageTags, candidate.languageTags),
    2
  );

  return score;
}

export function getRelatedJobs(
  current: Opportunity,
  jobs: readonly Opportunity[],
  limit = 4
): Opportunity[] {
  const ranked = jobs
    .map((job, index) => ({ job, index, score: relatedScore(current, job) }))
    .filter(
      ({ job }) =>
        job.id !== current.id &&
        job.boardSection === "Jobs" &&
        job.status === "Active" &&
        (job.publicationStatus ?? "live") === "live" &&
        (job.lifecycleStatus ?? "active") !== "closed"
    )
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return first.index - second.index;
    });

  const meaningfullyRelated = ranked.filter(({ score }) => score > 0);
  const fallback = ranked.filter(({ score }) => score === 0);

  return [...meaningfullyRelated, ...fallback]
    .slice(0, Math.max(0, limit))
    .map(({ job }) => job);
}
