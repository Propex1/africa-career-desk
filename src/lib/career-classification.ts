import { isCareerSelection, type CareerSelection } from "../data/career-taxonomy.ts";
import { JOB_FUNCTIONS, EMPLOYER_TYPES, type JobFunction, type EmployerType } from "../data/job-functions.ts";

/** Proposals are retained for editorial review; only explicit approvals are discoverable. */
export type CareerClassification = CareerSelection & {
  jobFunction: JobFunction;
  employerType?: EmployerType;
  interestTags: readonly string[];
  rationale: string;
  sourceUrl: string;
  proposedBy: string;
  proposedAt: string;
  method: "human" | "ai-assisted";
} & (
  | { status: "proposed" }
  | { status: "approved"; approvedBy: string; approvedAt: string }
);

export function getDiscoverableCareerClassification(
  classification: CareerClassification | undefined,
  allowProposals = false,
): CareerClassification | undefined {
  return getApprovedCareerClassification(classification) ??
    (allowProposals && classification?.status === "proposed" && isClassificationMetadata(classification)
      ? classification : undefined);
}

export function isClassificationMetadata(value: unknown): value is CareerClassification {
  if (!isCareerSelection(value)) return false;
  const candidate = value as CareerSelection & Record<string, unknown>;
  return JOB_FUNCTIONS.some(item => item === candidate.jobFunction) &&
    (candidate.employerType === undefined || EMPLOYER_TYPES.some(item => item === candidate.employerType)) &&
    ["human", "ai-assisted"].includes(String(candidate.method)) &&
    ["rationale", "sourceUrl", "proposedBy", "proposedAt"].every(key =>
      typeof candidate[key] === "string" && Boolean(String(candidate[key]).trim())) &&
    Array.isArray(candidate.interestTags) && candidate.interestTags.every(tag => typeof tag === "string" && Boolean(tag.trim())) &&
    (candidate.status === "proposed" || (candidate.status === "approved" &&
      ["approvedBy", "approvedAt"].every(key => typeof candidate[key] === "string" && Boolean(String(candidate[key]).trim()))));
}

/** Validate imported records too: TypeScript cannot validate external data at runtime. */
export function getApprovedCareerClassification(
  classification: unknown,
): Extract<CareerClassification, { status: "approved" }> | undefined {
  if (!isClassificationMetadata(classification)) return undefined;
  const value = classification as CareerSelection & Record<string, unknown>;
  const requiredText = ["rationale", "sourceUrl", "proposedBy", "proposedAt", "approvedBy", "approvedAt"];
  if (value.status !== "approved" ||
      !["human", "ai-assisted"].includes(String(value.method)) ||
      requiredText.some(key => typeof value[key] !== "string" || !String(value[key]).trim()) ||
      !Array.isArray(value.interestTags) ||
      value.interestTags.some(tag => typeof tag !== "string" || !tag.trim())) return undefined;
  return classification as Extract<CareerClassification, { status: "approved" }>;
}
