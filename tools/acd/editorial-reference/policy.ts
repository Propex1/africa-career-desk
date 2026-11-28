import { isCareerSelection, type CareerSelection } from "../../../src/data/career-taxonomy.ts";
import type { ClassificationProposal, ProposedClassificationResult, ScopeRecommendation } from "../../../src/contracts/acd-v2.ts";
import { ACD_V2_CONTRACT_VERSION, ACD_V2_TAXONOMY_VERSION } from "../../../src/contracts/acd-v2.ts";
import type { JobFunction } from "../../../src/data/job-functions.ts";

export interface EvidenceInput {
  id: string;
  company: string;
  sourceUrl: string;
  sourceRevision: string;
  summary: string;
  aboutRole: string;
  responsibilities: readonly string[];
  requirements: readonly string[];
}
export interface Assessment {
  scopeRecommendation: ScopeRecommendation;
  scopeReason: string;
  result: ProposedClassificationResult;
}

/** Conservative, inspectable baseline for review/evaluation. Not a trained AI or publisher. */
export function reassessEvidence(input: EvidenceInput): Assessment {
  // Title is deliberately excluded: finance-sounding titles cannot establish responsibilities.
  const duties = input.responsibilities.join(" ").toLowerCase();
  const text = `${input.summary} ${input.aboutRole} ${duties}`.toLowerCase();
  const context = `${input.company} ${text}`.toLowerCase();
  const unresolved = (reason: string, scope: ScopeRecommendation = "needs-review"): Assessment => ({ scopeRecommendation: scope, scopeReason: reason, result: { kind: "unresolved", reason } });
  if (!input.sourceUrl) return unresolved("No attributable source URL; recover source evidence before proposing a category.");
  if (text.trim().length < 65 || (!duties && input.summary.length < 100)) return unresolved("Insufficient responsibility evidence; title and historical publication/rejection are not eligibility labels.");
  const specialistFinance = /financial model|valuation|investment appraisal|capital allocation|capital structure|investment memorand|npv|\birr\b|funding strateg|underwrit|credit assessment|credit risk|debt sustainability|portfolio allocation|manager selection|investment research|covenant|loan syndicat|trade finance|treasury|asset.liability|earnings release|shareholder disclosure|financial due diligence|transaction advisory/.test(text);
  const substantivePlanning = /budget|forecast|margin|pricing|scenario/.test(duties) && /challenge|recommend|business partner|decision|lead.*finance|finance.*lead|board|executive/.test(duties);
  const generic = /bookkeeping|invoice processing|accounts payable|data entry|commercial sales|logistics sales|go.to.market|operational transformation/.test(duties);
  if (generic && !specialistFinance && !substantivePlanning) return unresolved("Available responsibilities describe routine accounting, sales or operational transformation without substantive specialist finance.", "outside-future-scope");
  if (!specialistFinance && !substantivePlanning && !/due diligence|invest.*transaction|structur.*financ|investor.*fundrais|institutional.*trad|derivative|financial engineering/.test(duties)) return unresolved("Responsibilities do not establish a sufficiently specific finance activity; retain for evidence review.");
  let pair: CareerSelection | undefined;
  let fn: JobFunction = "Investment";
  const choose = (areaId: string, subcategoryId: string, jobFunction: JobFunction) => {
    const candidate = { areaId, subcategoryId };
    if (!isCareerSelection(candidate)) throw new Error(`Invalid policy pair: ${areaId}/${subcategoryId}`);
    pair = candidate; fn = jobFunction;
  };
  const dfi = /development finance|development bank|\bifc\b|\bebrd\b|proparco|afreximbank|\bboad\b|bio invest|\bdbsa\b/.test(context);
  if (/earnings release|shareholder disclosure|corporate investor relations/.test(text)) choose("corporate-finance-strategy", "corporate-investor-relations", "Corporate Investor Relations");
  else if (/asset.liability|\balm\b|treasury|liquidity buffer|funding mix/.test(text)) choose("banking-structured-finance", "treasury-funding-alm", "Strategic Finance");
  else if (/secondar|fund.of.funds|fund commitments|lp commitments|select.*fund manager/.test(text)) choose("private-markets", "fund-investments-secondaries", /legal|fund agreement|side letter/.test(duties) ? "Investment Legal" : "Investment");
  else if (dfi && /investment readiness|capital mobilisation|capital mobilization|advisory|project preparation|investor sounding/.test(duties) && !/own.*investment decision|execute.*loan|execute.*equity/.test(duties)) choose("development-finance", "advisory-capital-mobilisation", "Financing & Origination");
  else if (dfi && /invest|lending|underwrit|guarantee|credit/.test(text)) choose("development-finance", "investment-lending", /underwrit|credit risk/.test(duties) ? "Risk & Underwriting" : "Investment");
  else if (/client.*financial due diligence|transaction advisory|valuation advisory|restructuring advisory/.test(text)) choose("investment-banking-advisory", "transaction-restructuring-advisory", "Research & Analysis");
  else if (/capital markets.*advis|ipo|equity capital markets|bond issuance.*advis/.test(text)) choose("investment-banking-advisory", "capital-markets", "Financing & Origination");
  else if (/m&a.*advis|advis.*m&a|merger.*client|acquisition.*client/.test(text)) choose("investment-banking-advisory", "ma-corporate-finance", "Financing & Origination");
  else if (/corporate m&a|acquir.*business|acquisition.*integration|corporate acquisition/.test(text)) choose("corporate-finance-strategy", "corporate-ma", "Investment");
  else if (/capital allocation|npv|investment appraisal|strategic finance/.test(text)) choose("corporate-finance-strategy", "strategic-finance-investments", "Strategic Finance");
  else if (substantivePlanning) choose("corporate-finance-strategy", "fpa-finance-leadership", /lead.*finance|finance.*lead|chief finance/.test(duties) ? "Finance Leadership" : "FP&A & Business Partnering");
  else if (/derivative|financial engineering|structured products/.test(text) && /structur|price|pricing|model/.test(duties)) choose("global-markets-structuring", "structuring-financial-engineering", "Structuring & Financial Engineering");
  else if (/institutional.*trad|trading desk|execute.*fx|bond.*trad|money.market.*trad/.test(text)) choose("global-markets-structuring", "institutional-sales-trading", "Trading");
  else if (/investment advisory|wealth management|family office/.test(context) && /portfolio.*recommend|asset allocation.*advi|client.*investment proposal/.test(duties)) choose("asset-management-research", "investment-advisory-wealth-management", "Investment Advisory");
  else if (/portfolio allocation|asset allocation|rebalance|manager selection/.test(duties)) choose("asset-management-research", "portfolio-management", "Portfolio & Asset Management");
  else if (/investment research|equity research|buy.*sell recommendation/.test(text)) choose("asset-management-research", "investment-research", "Research & Analysis");
  else if (/trade finance|syndicated|loan syndicat|commodity finance/.test(text)) choose("banking-structured-finance", "trade-syndicated-finance", "Financing & Origination");
  else if (/project finance|structured lending|leveraged finance|infrastructure financing/.test(text) && /loan|lending|debt|lender|bank/.test(context)) choose("banking-structured-finance", "project-structured-finance", "Financing & Origination");
  else if (/corporate banking|corporate lending|commercial banking/.test(context) && /credit|financ|loan/.test(duties)) choose("banking-structured-finance", "corporate-banking", /underwrit|credit assessment/.test(duties) ? "Risk & Underwriting" : "Financing & Origination");
  else if (/infrastructure|real assets|renewable/.test(context) && /equity invest|investment memorand|portfolio.*asset|investment fund/.test(text)) choose("private-markets", "infrastructure-real-assets", "Investment");
  else if (/private credit|direct lending fund/.test(context)) choose("private-markets", "private-credit", /covenant|underwrit|credit risk/.test(duties) ? "Risk & Underwriting" : "Investment");
  else if (/venture capital|startup invest|seed invest/.test(context)) choose("private-markets", "venture-capital", "Investment");
  else if (/private equity|growth equity/.test(context)) choose("private-markets", "private-equity-growth", "Investment");
  if (!pair) return unresolved("Relevant finance evidence exists, but this conservative baseline cannot establish an accurate primary activity. Human assessment is required.", "in-scope");
  const tags: string[] = [];
  for (const [pattern, tag] of [[/climate/, "climate"], [/impact/, "impact"], [/blended|concessional/, "blended finance"], [/infrastructure/, "infrastructure"], [/fixed.income/, "fixed income"]] as const) if (pattern.test(text)) tags.push(tag);
  return { scopeRecommendation: "in-scope", scopeReason: "Substantive finance responsibilities support a proposed fit; no publication or approval action.", result: { kind: "mapped", classification: { ...pair, jobFunction: fn, interestTags: tags, rationale: "Conservative activity-based baseline proposal. Verify the selected activity against original source responsibilities before approval.", sourceUrl: input.sourceUrl, proposedBy: "ACD editorial reference baseline", proposedAt: "2026-11-28", method: "ai-assisted", status: "proposed" } } };
}

export function asSharedProposal(input: EvidenceInput): ClassificationProposal {
  const assessment = reassessEvidence(input);
  return { contractVersion: ACD_V2_CONTRACT_VERSION, taxonomyVersion: ACD_V2_TAXONOMY_VERSION, opportunityId: input.id, sourceRevision: input.sourceRevision, evidence: { summary: input.summary, aboutRole: input.aboutRole, responsibilities: input.responsibilities, requirements: input.requirements }, ...assessment, createdAt: "2026-11-28T00:00:00Z", producer: { actorId: "editorial-reference-baseline", promptVersion: "activity-baseline/1" } };
}
