import { isCareerSelection, type CareerSelection } from "../data/career-taxonomy.ts";

/** Proposals are retained for editorial review; only explicit approvals are discoverable. */
export type CareerClassification = CareerSelection & {
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

/** Validate imported records too: TypeScript cannot validate external data at runtime. */
export function getApprovedCareerClassification(
  classification: unknown,
): Extract<CareerClassification, { status: "approved" }> | undefined {
  if (!isCareerSelection(classification)) return undefined;
  const value = classification as CareerSelection & Record<string, unknown>;
  const requiredText = ["rationale", "sourceUrl", "proposedBy", "proposedAt", "approvedBy", "approvedAt"];
  if (value.status !== "approved" ||
      !["human", "ai-assisted"].includes(String(value.method)) ||
      requiredText.some(key => typeof value[key] !== "string" || !String(value[key]).trim()) ||
      !Array.isArray(value.interestTags) ||
      value.interestTags.some(tag => typeof tag !== "string" || !tag.trim())) return undefined;
  return classification as Extract<CareerClassification, { status: "approved" }>;
}
