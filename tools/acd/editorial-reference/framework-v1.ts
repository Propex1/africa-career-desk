import { isCareerSelection, type CareerSelection } from "../../../src/data/career-taxonomy.ts";
import type { JobFunction } from "../../../src/data/job-functions.ts";
import type { ProposedClassificationResult, ScopeRecommendation } from "../../../src/contracts/acd-v2.ts";

export const ELIGIBILITY_FRAMEWORK_VERSION = "eligibility/1.0.0" as const;
export interface FrameworkInput {
  id: string;
  company: string;
  title?: string; // Identifies a legal-review candidate; never establishes financial substance.
  summary: string;
  aboutRole: string;
  responsibilities: readonly string[];
  requirements: readonly string[];
  sourceUrl: string;
  applyUrl?: string;
  country?: string;
  region?: string;
  locationDisplay?: string;
  boardSection?: string;
  deadlineDate?: string;
  lifecycleStatus?: string;
  publicationStatus?: string;
  historicalDecisionReasons?: readonly string[];
}
export interface FrameworkAssessment {
  frameworkVersion: typeof ELIGIBILITY_FRAMEWORK_VERSION;
  eligibility: {
    decision: ScopeRecommendation;
    reasons: string[];
    checks: { financialSubstance: "present" | "uncertain" | "absent"; professionalRelevance: "specialist-finance" | "uncertain" | "general-role"; africaRelevance: "evidenced" | "unknown" | "explicitly-non-africa"; evidenceQuality: "responsibilities-present" | "limited" };
    editorialReviewRequired: boolean;
    investmentLegal: "not-identified" | "direct-investment-legal" | "generic-legal" | "uncertain";
  };
  classification: ProposedClassificationResult;
  publicationReadiness: { decision: "not-ready" | "requires-verification-and-approval"; blockers: string[]; freshVerificationPerformed: false; publicationAction: "none" };
}
const africanLocation = /\b(?:africa|sadc|ecowas|waemu|cemac|algeria|angola|benin|botswana|burkina|burundi|cabo verde|cape verde|cameroon|cameroun|central african|chad|comoros|congo|côte d[’']?ivoire|cote d[’']?ivoire|ivory coast|djibouti|egypt|egypte|equatorial guinea|eritrea|eswatini|swaziland|ethiopia|gabon|gambia|ghana|guinea|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|maroc|mozambique|namibia|niger|nigeria|rwanda|sao tome|senegal|seychelles|sierra leone|somalia|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\b/i;
const nonAfricanLocation = /united states|united kingdom|\buk\b|london|france|paris|germany|switzerland|singapore|india|china|canada|australia|luxembourg|netherlands|belgium|hong kong/i;
const dfiEmployer = /international finance corporation|\bifc\b|\bebrd\b|european bank for reconstruction|development bank|development finance institution|\bdbsa\b|proparco|afreximbank|african export.import|\bboad\b|bio invest|industrial development corporation|\bidc\b|african development bank|\bafdb\b/i;
const bankEmployer = /\bbank\b|\bbanking\b|nedbank|\brmb\b|absa|stanbic|standard chartered|attijari|cfg bank/i;

/** Deterministic review aid, not a model, an approved label or a publication service. */
export function assessFrameworkV1(input: FrameworkInput, asOfDate = "2026-11-28"): FrameworkAssessment {
  const duties = input.responsibilities.join(" ").toLowerCase();
  const roleContext = `${input.summary} ${input.aboutRole}`.toLowerCase();
  const text = `${roleContext} ${duties}`;
  const location = `${input.country ?? ""} ${input.region ?? ""} ${input.locationDisplay ?? ""}`;
  // Employer name alone is deliberately excluded from the Africa relevance check.
  const nonAfricaOnly = /(?:exclusively|only|domestic|solely).{0,60}(?:cambodia|india|united states|united kingdom|france|singapore)|(?:cambodia|india|united states|united kingdom|france|singapore).{0,35}(?:only|domestic mandate|exclusive mandate)/.test(roleContext + " " + duties);
  const africaEvidence = `${location} ${roleContext} ${duties}`.replace(/no (?:recorded |evidenced |known |proven |documented )?african? (?:investment |client )?(?:mandate|remit|exposure|focus|relevance|link)/g, "");
  const africa = africanLocation.test(africaEvidence) ? "evidenced" : nonAfricaOnly ? "explicitly-non-africa" : "unknown";
  const evidenceQuality = duties.trim().length >= 65 ? "responsibilities-present" : "limited";
  const legalRole = /\b(?:legal|counsel|lawyer|juridique)\b/.test((input.title ?? "").toLowerCase()) || /^(?:a |an |the )?(?:investment |fund |senior |corporate )?legal (?:officer|counsel|team)/.test(roleContext);
  const directLegal = legalRole && /legal.{0,75}(investment|transaction|financ)|fund.{0,35}(agreement|structur|formation)|investment.vehicle.structur|side letter|shareholder agreement|purchase agreement|financ.{0,35}agreement/.test(duties);
  const genericLegal = legalRole && !directLegal && /employment|litigation|general corporate|corporate secretar|routine contract|legal administration|commercial contract|compliance/.test(duties);
  const specialist = /(?:value|valuing).{0,25}(?:compan|client|business|equity)|negotiate.{0,35}(?:acquisition|financ|invest|loan)|financial model|financial analys|valuation|investment appraisal|investment memorand|capital allocation|capital structure|\bnpv\b|\birr\b|funding strateg|financing strateg|credit assessment|underwrit|repayment capacity|debt sustainability|covenant|financial due diligence|investment due diligence|equity invest|investment.*transaction|transaction.*invest|fund commitment|fund.of.funds|secondar.*lp|loan syndicat|asset.liability|\balm\b|capital market|earnings release|shareholder disclosure|financial due diligence|transaction advisory/.test(duties);
  const analyticalCreditRisk = /(?:assess|analys|analyz|model|stress.test|monitor|recommend|evaluate).{0,60}(?:credit risk|loan structure|credit rating)|(?:credit risk|loan structure|credit rating).{0,45}(?:assess|analys|analyz|model|stress.test)/.test(duties);
  const planning = /revenue|margin|p&l|profitab|pricing|forecast|budget|financial/.test(duties) && /challenge|recommend|business partner|decision|lead.{0,30}finance|finance.{0,30}lead|board|executive/.test(duties);
  const esg = /esg|environmental|impact|development.result/.test(duties) && /investment|portfolio|fund|underwrit|financing/.test(text);
  const fundSupport = /fund|investment vehicle|portfolio|lp commitment/.test(roleContext) && /capital (call|drawdown)|fund.financ|valuation|treasury|audit|compliance|accounting|fund.reporting/.test(duties);
  const markets = /trad|derivative|structured.product|financial engineering|fixed.income|forex|money.market/.test(duties) && /institutional|pricing|model|market risk|position|exposure|execution|portfolio/.test(text);
  const advice = /investment research|equity research|portfolio allocation|asset allocation|manager selection|client.investment proposal|portfolio.recommendation/.test(duties);
  const fundraising = /fundrais|investor relation|institutional investor|investor.*(outreach|diligence|pitch)|shareholder/.test(duties) && /investment|fund|financ|equity|earnings|disclosure/.test(text);
  const finance = specialist || analyticalCreditRisk || planning || esg || fundSupport || markets || advice || fundraising || directLegal;
  const generic = /retail sales|branch sales|loan.file|loan forms|bookkeeping|invoice processing|accounts payable|data entry|commercial sales|logistics sales|go.to.market|presales|payment volumes|market share|customer acquisition|operational transformation|human resources|hr administration|marketing campaign|service rollout/.test(duties);
  const ordinaryRetailSales = /retail|branch|consumer/.test(text) && /sell|sales target|cross.sell|customer acquisition/.test(duties) && !/financial model|financial analys|credit assessment|underwrit|npv|\birr\b|valuation|asset allocation.{0,20}(recommend|decision)/.test(duties);
  const incidentalStrategy = /operating model|execution governance|cross.functional delivery|programme milestones|programme governance|project.management standards/.test(duties) && !/financial model|npv|\birr\b|capex|repayment|credit application|financing agreement/.test(duties);
  let decision: ScopeRecommendation = "in-scope";
  const reasons: string[] = [];
  if (input.boardSection && input.boardSection !== "Jobs") { decision = "needs-review"; reasons.push("Retained programme/open-application context; assess separately from an individual vacancy."); }
  else if (africa === "explicitly-non-africa") { decision = "outside-future-scope"; reasons.push("The responsibilities explicitly establish an exclusively non-African mandate, with no evidenced African remit."); }
  else if (evidenceQuality === "limited") { decision = "needs-review"; reasons.push("Insufficient responsibility evidence; a title, employer or old decision cannot establish eligibility."); }
  else if (ordinaryRetailSales) { decision = "outside-future-scope"; reasons.push("Retail product sales and branch targets are not substantive specialist investment advice or underwriting."); }
  else if (legalRole) {
    if (directLegal) { decision = "needs-review"; reasons.push("Direct investment transaction, fund-structuring or financing legal duties support narrow potential eligibility; mandatory initial editorial review."); }
    else if (genericLegal) { decision = "outside-future-scope"; reasons.push("General corporate legal/compliance duties are not directly investment-transaction, fund-structuring or financing work."); }
    else { decision = "needs-review"; reasons.push("Legal remit is not sufficiently evidenced as direct investment/fund/financing work."); }
  } else if (generic && !finance) { decision = "outside-future-scope"; reasons.push("Dominant evidenced duties are ordinary sales, administration or operational work without substantive specialist finance."); }
  else if (!finance) { decision = "needs-review"; reasons.push("Available duties do not yet establish substantive specialist finance; clarify rather than infer from a finance-sounding title."); }
  else if (incidentalStrategy && !specialist && !fundSupport && !esg) { decision = "needs-review"; reasons.push("Execution/coordination dominates; distinguish substantive financial decision support from incidental planning language."); }
  else reasons.push("Responsibility evidence supports specialist finance, financial decisions or directly relevant investment-support work.");
  if (africa === "unknown" && decision === "in-scope") { decision = "needs-review"; reasons.push(nonAfricanLocation.test(location) ? "Non-African location does not disprove an African mandate; clarify the investment/client remit before excluding." : "Africa location or investment/client mandate is not evidenced; employer identity is insufficient."); }
  const classification: ProposedClassificationResult = ordinaryRetailSales || !finance ? { kind: "unresolved", reason: "No specialist-finance category is proposed for the evidenced general sales, accounting or legal remit." } : classifyActivity(input, { directLegal, legalRole, esg, fundSupport, planning });
  const blockers: string[] = [];
  if (decision !== "in-scope") blockers.push(decision === "needs-review" ? "eligibility-editorial-review-required" : "outside-current-eligibility-framework");
  if (directLegal) blockers.push("investment-legal-editorial-review-required");
  if (classification.kind === "unresolved") blockers.push("classification-unresolved");
  if (!input.sourceUrl) blockers.push("missing-attributable-source");
  if (!input.applyUrl) blockers.push("missing-application-destination");
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.deadlineDate ?? "") && input.deadlineDate! < asOfDate) blockers.push("recorded-deadline-passed");
  if (input.lifecycleStatus === "closed") blockers.push("recorded-closed");
  if (input.publicationStatus === "removed") blockers.push("historically-removed-needs-new-review");
  if ((input.historicalDecisionReasons ?? []).some(reason => /expir|unavailable|not found|closed|redirect|not active|inactive/i.test(reason))) blockers.push("historical-availability-or-expiry-exclusion-needs-recheck");
  // This package does no live source checks and authorises no new publication.
  blockers.push("current-source-and-application-verification-not-performed", "new-publication-approval-not-granted");
  return {
    frameworkVersion: ELIGIBILITY_FRAMEWORK_VERSION,
    eligibility: { decision, reasons, checks: { financialSubstance: finance ? "present" : generic || genericLegal ? "absent" : "uncertain", professionalRelevance: finance ? "specialist-finance" : generic || genericLegal ? "general-role" : "uncertain", africaRelevance: africa, evidenceQuality }, editorialReviewRequired: decision !== "in-scope" || legalRole, investmentLegal: !legalRole ? "not-identified" : directLegal ? "direct-investment-legal" : genericLegal ? "generic-legal" : "uncertain" },
    classification,
    publicationReadiness: { decision: blockers.some(x => !["current-source-and-application-verification-not-performed", "new-publication-approval-not-granted"].includes(x)) ? "not-ready" : "requires-verification-and-approval", blockers, freshVerificationPerformed: false, publicationAction: "none" },
  };
}

function classifyActivity(input: FrameworkInput, flags: { directLegal: boolean; legalRole: boolean; esg: boolean; fundSupport: boolean; planning: boolean }): ProposedClassificationResult {
  const duties = input.responsibilities.join(" ").toLowerCase();
  const role = `${input.summary} ${input.aboutRole}`.toLowerCase();
  const text = `${role} ${duties}`;
  const context = `${input.company} ${text}`.toLowerCase();
  const unresolved = (reason: string): ProposedClassificationResult => ({ kind: "unresolved", reason });
  if (!input.sourceUrl) return unresolved("No attributable source URL for a proposed mapping.");
  if (duties.length < 65 || (input.boardSection && input.boardSection !== "Jobs")) return unresolved("Insufficient individual-vacancy responsibility evidence for an accurate primary category.");
  if (flags.legalRole && !flags.directLegal) return unresolved("No evidenced direct investment/fund/financing legal mandate; do not force a legal role into an investment category.");
  let pair: CareerSelection | undefined;
  let fn: JobFunction = "Investment";
  const choose = (areaId: string, subcategoryId: string, jobFunction: JobFunction) => { const value = { areaId, subcategoryId }; if (!isCareerSelection(value)) throw new Error("Invalid framework category pair"); pair = value; fn = jobFunction; };
  const dfi = dfiEmployer.test(input.company) || /^(a|an|the) development finance (institution|advisory team)|^(a|an|the) development bank/.test(role);
  const bank = bankEmployer.test(input.company) || /corporate banking team|investment bank|bank operates|bank arranges|bank develops/.test(role);
  const fof = /\bfund.of.funds\b|\blp (?:commitments|secondar)|\bfund commitments\b|\bcommitments.{0,30}\bfunds\b|\bsecondar.{0,30}\blp\b|\blp\b.{0,30}\bsecondar/.test(text);
  const privateCredit = /private credit|direct lending fund|private.markets.*credit|structured.credit positions/.test(role);
  const venture = /venture capital|startup invest|early.stage startup|seed invest/.test(role);
  const privateEquity = /private equity|growth equity/.test(role);
  const privateInfra = /infrastructure|real assets|renewable/.test(role) && /equity|unlisted|investment fund|infrastructure investments|infrastructure investment|portfolio.*assets/.test(role) && !bank && !/advisory engagements|financing.*lenders/.test(role);
  if (/earnings release|shareholder disclosure|corporate investor relations/.test(text)) choose("corporate-finance-strategy", "corporate-investor-relations", "Corporate Investor Relations");
  else if (fof) choose("private-markets", "fund-investments-secondaries", "Investment");
  else if (dfi && /advisory|investment readiness|capital mobilis|capital mobiliz|project.preparation|investor sounding/.test(role) && !/lead.*investment decision|originate.*loan|execute.*loan/.test(duties)) choose("development-finance", "advisory-capital-mobilisation", "Financing & Origination");
  else if (dfi && /invest|lending|credit|underwrit|guarantee/.test(text)) choose("development-finance", "investment-lending", /credit risk|underwrit|risk profiles/.test(role) ? "Risk & Underwriting" : "Investment");
  else if (/sovereign|country risk/.test(role) && /debt sustainability|country limits|credit risk/.test(duties)) return unresolved("Relevant cross-bank sovereign/country risk has no precise existing banking child category.");
  else if (privateCredit) choose("private-markets", "private-credit", /credit risk|risk management/.test(role) ? "Risk & Underwriting" : "Investment");
  else if (venture) choose("private-markets", "venture-capital", "Investment");
  else if (privateInfra) choose("private-markets", "infrastructure-real-assets", "Investment");
  else if (privateEquity && !/advisory firm|advisory team|investment.bank/.test(role)) choose("private-markets", "private-equity-growth", "Investment");
  else if (/asset.liability|\balm\b|bank treasury|funding mix|liquidity buffers/.test(text)) choose("banking-structured-finance", "treasury-funding-alm", "Strategic Finance");
  else if (/financial due diligence|transaction advisory|valuation advisory|restructuring advisory/.test(role)) choose("investment-banking-advisory", "transaction-restructuring-advisory", "Research & Analysis");
  else if (/capital markets.*advis|ipo|equity capital markets|bond issuance.*advis/.test(role)) choose("investment-banking-advisory", "capital-markets", "Financing & Origination");
  else if (/m&a.*advis|advis.*m&a|merger.*client|acquisition.*client/.test(text) && /advis|client/.test(role)) choose("investment-banking-advisory", "ma-corporate-finance", "Financing & Origination");
  else if (/corporate acquisition|corporate m&a|acquir.*business|acquisition.*integration/.test(text)) choose("corporate-finance-strategy", "corporate-ma", "Investment");
  else if (/project finance|structured lending|leveraged finance|infrastructure financing/.test(text) && /bank|loan|lender|debt/.test(context)) choose("banking-structured-finance", "project-structured-finance", "Financing & Origination");
  else if (/trade finance|loan syndicat|syndicated loan|commodity finance/.test(text)) choose("banking-structured-finance", "trade-syndicated-finance", "Financing & Origination");
  else if (/derivative|structured products|financial engineering/.test(text) && /price|pricing|model|structur/.test(duties)) choose("global-markets-structuring", "structuring-financial-engineering", "Structuring & Financial Engineering");
  else if (/institutional.*trad|trading desk|execute.*fx|bond.*trad|money.market.*trad/.test(text)) choose("global-markets-structuring", "institutional-sales-trading", "Trading");
  else if (/investment advisory|wealth management|family office/.test(role) && /client.investment propos|portfolio.*recommend|asset allocation.*advi/.test(duties)) choose("asset-management-research", "investment-advisory-wealth-management", "Investment Advisory");
  else if (/portfolio allocation|asset allocation|rebalance|manager selection/.test(duties)) choose("asset-management-research", "portfolio-management", "Portfolio & Asset Management");
  else if (/investment research|equity research|buy.*sell recommendation/.test(text)) choose("asset-management-research", "investment-research", "Research & Analysis");
  else if (bank && /corporate|commercial|wholesale|credit/.test(text) && /credit|loan|financ/.test(duties)) choose("banking-structured-finance", "corporate-banking", /credit assessment|underwrit|creditworthiness/.test(duties) ? "Risk & Underwriting" : "Financing & Origination");
  else if (/strategic finance|capital allocation|investment appraisal|\bnpv\b|\birr\b/.test(text)) choose("corporate-finance-strategy", "strategic-finance-investments", "Strategic Finance");
  else if (flags.planning) choose("corporate-finance-strategy", "fpa-finance-leadership", /lead (?:the |a |country |group )?finance (?:team|function)|lead.{0,20}finance colleagues|chief (?:finance|financial)|manage.{0,20}finance team|head of finance/.test(role + " " + duties) ? "Finance Leadership" : "FP&A & Business Partnering");
  if (!pair) return unresolved("Relevant activity has no confidently established primary category; retain an explicit classification review.");
  if (flags.directLegal) fn = "Investment Legal";
  else if (flags.esg && !(/screen.{0,30}transaction|structur.{0,35}invest|equity.{0,20}invest|originate.{0,30}invest|prepare.{0,30}investment memor/.test(duties) && !/esg|impact|environmental/.test((input.title ?? "").toLowerCase()))) fn = "Impact & ESG";
  else if (flags.fundSupport && /fund.finance|fund.operations|financial reporting.*fund|fund.*accounting|capital drawdown/.test(text)) fn = "Fund Finance & Operations";
  else if (/fundrais|investor relations/.test(role) && !/earnings release|shareholder disclosure|corporate investor relations/.test(text)) fn = "Fundraising & Investor Relations";
  const tags: string[] = [];
  for (const [pattern, tag] of [[/climate/, "climate"], [/impact/, "impact"], [/blended|concessional/, "blended finance"], [/infrastructure/, "infrastructure"], [/fixed.income/, "fixed income"]] as const) if (pattern.test(text)) tags.push(tag);
  return { kind: "mapped", classification: { ...pair, jobFunction: fn, interestTags: tags, rationale: "Initial framework v1 activity proposal; human review and fresh publication checks are separate.", sourceUrl: input.sourceUrl, proposedBy: "ACD eligibility framework v1 review aid", proposedAt: "2026-11-28", method: "ai-assisted", status: "proposed" } };
}
