import { CAREER_AREAS, isCareerSelection, type CareerSelection } from "../../../src/data/career-taxonomy.ts";
import type { JobFunction } from "../../../src/data/job-functions.ts";
import type { ProposedClassificationResult, ScopeRecommendation } from "../../../src/contracts/acd-v2.ts";
import type { FrameworkAssessment, FrameworkInput } from "./framework-v1.ts";

export const ELIGIBILITY_V11 = "eligibility/1.1.0-candidate" as const;
export const OFFLINE_DATE = "2026-11-28";

export type FrameworkV11Assessment = Omit<FrameworkAssessment, "frameworkVersion"> & {
  frameworkVersion: typeof ELIGIBILITY_V11;
  evidence: { eligibilityDutyNumbers: number[]; classificationDutyNumbers: number[]; competingSubcategoryIds: string[] };
};

export const normalizeEvidence = (value: string) => value.toLowerCase().normalize("NFD")
  .replace(/\p{Diacritic}/gu, "").replace(/[’‘]/g, "'").replace(/[‐‑–—]/g, "-");

interface Duty {
  number: number;
  text: string;
}

function dutiesFrom(input: FrameworkInput): Duty[] {
  const unique = new Set<string>();
  return input.responsibilities.flatMap((line, index) => {
    const text = normalizeEvidence(line).replace(/\s+/g, " ").trim();
    if (!/\p{L}.*\s.*\p{L}/u.test(text) || unique.has(text)) return [];
    unique.add(text);
    return [{ number: index + 1, text }];
  });
}

const africanPlace = /\b(?:africa(?:n)?|sadc|ecowas|waemu|cemac|algeria|angola|benin|botswana|burkina|burundi|cabo verde|cape verde|cameroon|cameroun|central african republic|chad|comoros|congo|cote d[' ]ivoire|ivory coast|djibouti|egypt|egypte|equatorial guinea|eritrea|eswatini|swaziland|ethiopia|gabon|gambia|ghana|guinea|kenya|lesotho|liberia|libya|madagascar|malawi|mali|mauritania|mauritius|morocco|maroc|mozambique|namibia|niger|nigeria|rwanda|sao tome|senegal|seychelles|sierra leone|somalia|south sudan|sudan|tanzania|togo|tunisia|uganda|zambia|zimbabwe)\b/;
const africaRole = /\b(?:africa(?:n)?[- ](?:focused|markets?|countries|coverage|mandate|remit|investments?|clients?|portfolio|region)|(?:based|located|invest(?:s|ing)?|originate|operate|coverage|mandate|focus|portfolio|clients?)\b.{0,45}\b(?:in|across|for)\b)/;
const exclusiveMandate = /\b(?:exclusively|solely|only|limited to)\b.{0,60}\b(?:cambodia|india|united states|united kingdom|france|singapore|canada|germany)\b|\b(?:cambodia|india|united states|united kingdom|france|singapore|canada|germany)\b.{0,25}\b(?:only|domestic mandate|exclusive mandate)\b/;

export function africaRelevance(input: FrameworkInput): FrameworkAssessment["eligibility"]["checks"]["africaRelevance"] {
  const location = [input.country, input.locationDisplay, input.country?.trim() ? undefined : input.region].map(value => normalizeEvidence(value ?? ""));
  const role = [input.summary, input.aboutRole, ...input.responsibilities].map(normalizeEvidence);
  const affirmations = role.flatMap(line => line.split(/[;.!?]/))
    .filter(clause => !/\b(?:no|without|does not|do not|not an?)\b.{0,100}\b(?:africa|african|mandate|remit|coverage)\b/.test(clause));
  if (location.some(line => africanPlace.test(line)) ||
      affirmations.some(clause => africaRole.test(clause) && africanPlace.test(clause))) return "evidenced";
  if (role.some(clause => exclusiveMandate.test(clause))) return "explicitly-non-africa";
  return "unknown";
}

const transaction = /\b(?:screen|originate|structur\w*|evaluat\w*|execut\w*|negotiat\w*|lead|sourc\w*|identify|prepare|underwrit\w*|clos\w*)\b.{0,105}\b(?:investments?|deals?|transactions?|acquisitions?|financing|debt|loans?|credit|equity|term[- ]sheets?|prospects?|mandates?|exits?)\b/;
const modelling = /\b(?:valuations?|financial (?:and economic )?model(?:s|ling|ing)?|project finance models?|financial feasibilit\w*|investment appraisal|return analysis|sensitivity analys\w*|capital structures?|credit applications?|debt sustainability|credit (?:analysis|assessment)|pricing of assets)\b/;
const investmentProcess = /\binvestment (?:approval|committee|papers?|memorand\w*|appraisal|pipeline|evaluations?)\b|\b(?:portfolio companies|exit opportunit\w*|exit strategy|co-shareholder)\b/;
const creditOwnership = /\b(?:complex credit|credit applications?|credit (?:analysis|assessment|underwriting)|repayment capacity|underwrit\w*|covenants?|collateral monitoring|credit risk|facility pricing)\b/;
const research = /\b(?:equity[- ]research|financial research|research reports?|client[- ]facing research|research publications?|buy.{0,12}sell recommendations?|listed equities|macroeconomic forecasts?|trade ideas|economic forecasts?)\b/;
const esg = /\b(?:esg documentation|esg due diligence|esg risks?|esg incidents?|environmental commitments|environmental.{0,30}impact data|impact reporting|esms|environmental and social management system)\b/;
const risk = /\b(?:debt sustainability|sovereign ratings|country limits|sovereign credit|rating models?|risk appetite|covenant breaches|counterparty risk|credit risk|stress tests?|collateral monitoring)\b/;
const plan = /\b(?:driver[- ]based forecasts?|revenue.{0,35}margin|variance analysis|deviations? from forecasts?|profitability analys\w*|challenge.{0,50}(?:price|pricing|volume|cost|assumptions?)|recommend corrective actions?|lead annual budgets?|forecast financial results)\b/;
const strategic = /\b(?:npv|irr|capex|capital expenditure|capital investment appraisal|post[- ]investment reviews?)\b/;
const planningInfluence = /\b(?:capital allocation|budgeting|investment planning|strategic investment decisions)\b/;
const delivery = /\b(?:operating[- ]models?|operational transformation|execution standards|execution governance|program(?:me)? milestones|project[- ]management standards|governance presentations?|initiative governance|coordinate delivery|project stakeholders|schedule.{0,25}budgets?)\b/;
const commercial = /\b(?:presales|payment volumes?|go[- ]to[- ]market|vendor[- ]managed inventory|market share|branch sales|retail loan|retail product|sales targets?|cross[- ]sell\w*|account acquisition)\b/;
const routine = /\b(?:bookkeeping|data entry|accounts payable|loan[- ]file checks?|collect loan forms|routine customer credit documents|employment contracts?|recruit\w*|hr administration|routine commercial contracts)\b/;
const investmentLegal = /\b(?:lead legal execution|(?:lead|provide|coordinate|manage) legal (?:advice|support|due diligence).{0,60}\b(?:investment|transaction|fund)|(?:review|draft|negotiate).{0,70}\b(?:fund agreements?|side letters?|shareholder agreements?|purchase agreements?|financing agreements?|transaction agreements?)|(?:structure|launch).{0,30}\b(?:funds?|investment vehicles?)\b.{0,75}\b(?:legal|subscription|offering|partnership)\b)/;
const legalContext = /\b(?:legal counsel|principal counsel|legal officer|transaction lawyer|investment lawyer|legal adviser|investment legal|senior legal support)\b/;
const generalLegal = /\b(?:employment agreements?|litigation|general corporate compliance|legal administration|routine commercial contracts?)\b/;
const cashControls = /\b(?:cash[- ]flow forecasts?|cash forecasting|guarantees?|hedging|financial risks?)\b/;
const projectControls = /\b(?:project calculations?|cost controls?|variation[- ]orders?|invoicing|receivables|project stakeholders)\b/;
const tradeLanguage = /\b(?:trade[- ]finance|working[- ]capital financing|financial structuring)\b/;
const executionTrading = /\b(?:execute|executing|trade|book|hedge|manage)\b.{0,65}\b(?:client orders?|vwap|trades?|trading (?:positions?|book)|market positions?|fx positions?|fixed[- ]income positions?)\b/;
const portfolioAction = /\b(?:portfolio construction|manager selection|portfolio strategies|rebalanc\w*|asset allocation|portfolio implementation|portfolio decisions|portfolio mandates)\b/;
const structuringMarkets = /\b(?:hedging solutions?|price.{0,20}derivative\w*|derivative pricing|pricing.{0,45}profitability|develop.{0,30}fx products?|structure.{0,40}(?:derivatives?|structured products?))\b/;
const fundOperations = /\b(?:capital calls?|capital drawdowns?|fund accounting|fund nav|fund (?:audit|operations|administration)|reconcile fund|fund valuation controls)\b/;

interface Profile {
  subcategoryId: CareerSelection["subcategoryId"];
  jobFunction: JobFunction;
  /** Mandate identifies the activity. Only duty matches contribute financial evidence. */
  mandate: RegExp;
  signals: RegExp;
  anchor?: RegExp;
}

const profiles: readonly Profile[] = [
  { subcategoryId: "corporate-investor-relations", jobFunction: "Corporate Investor Relations", mandate: /corporate investor relations|earnings releases?|shareholder disclosures?|listed.company disclosures?|investor.relations function/, signals: /earnings releases?|listing and disclosure|share disclosures?|investor disclosures?|investor presentations?/ },
  { subcategoryId: "private-equity-growth", jobFunction: "Investment", mandate: /private equity|growth equity|buyouts?/, signals: /diligence|valuations?|board representation|portfolio companies|exit strategy/, anchor: /\b(?:originate|evaluate|execute|negotiate).{0,70}(?:invest|deals?|assets?)|value companies|investment memorand/ },
  { subcategoryId: "venture-capital", jobFunction: "Investment", mandate: /venture capital|startup investments?|start.up investments?|seed.stage equity|early.stage equity/, signals: /investment prospects|term.sheet|investment papers?|portfolio kpis|value.creation|startup investment transactions?/, anchor: /startup investment transactions?|(?:identify|originate|source|screen).{0,50}(?:investments?|startups?)|due diligence.{0,45}startups?/ },
  { subcategoryId: "private-credit", jobFunction: "Investment", mandate: /private.credit|mezzanine debt|direct lending fund|senior secured debt fund|investment fund.{0,45}direct lending/, signals: /private credit|direct lending|credit assessment|credit analysis|covenants?|investment approval|investment committee|investment opportunities|investment performance/, anchor: /credit assessment|underwrit|originate.{0,50}(?:credit|investments?)|structur.{0,45}(?:debt|lending|finance)|lead deal structur/ },
  { subcategoryId: "infrastructure-real-assets", jobFunction: "Investment", mandate: /unlisted social infrastructure|infrastructure.{0,45}(?:equity|investment|fund)|(?:equity|investment|fund).{0,45}infrastructure|direct.{0,35}real asset|renewable.{0,40}equity/, signals: /valuations?|equity investments?|investment valuations?|portfolio projects|portfolio performance|exit opportunit|sponsors?|disbursement|investment appraisal|deal pipelines?|infrastructure equity investments?/, anchor: /project development investments?|equity (?:and quasi-equity )?investment|(?:screen|originate|structure|evaluate|execute).{0,50}transactions?|investment (?:appraisal|pipeline)|(?:negotiat|deal document).{0,65}sponsors?/ },
  { subcategoryId: "fund-investments-secondaries", jobFunction: "Investment", mandate: /fund[- ]of[- ]funds|fund of funds|fund commitments?|lp (?:commitments?|interests?|secondaries)|secondary purchases? of fund interests/, signals: /due diligence|valuations?|fund agreements?|fund commitments?|lp interests?|fund managers?|financial projections/ },
  { subcategoryId: "investment-lending", jobFunction: "Investment", mandate: /development (?:finance|bank)|multilateral develop|concessional capital|dfi enhanced|export development finance/, signals: /underwrit|financing solutions?|concessional|transaction risks?|loan|investment (?:pipeline|proposal|equity)|guarantee/, anchor: transaction },
  { subcategoryId: "advisory-capital-mobilisation", jobFunction: "Financing & Origination", mandate: /development (?:finance|bank)|multilateral develop|(?:advisory|capital mobili[sz]ation).{0,65}\bdfi\b|(?:advisory|development).{0,40}government/, signals: /advisory services|investment.readiness|investor sounding|capital mobili[sz]|project (?:preparation|feasibility|finance models?)|bankability/, anchor: /advisory services|investment.readiness|investor sounding|capital mobili[sz]|project preparation/ },
  { subcategoryId: "ma-corporate-finance", jobFunction: "Financing & Origination", mandate: /m&a.{0,55}advisory|corporate.finance advisory|banking advisory mandates?|client acquisitions? advisory/, signals: /advisory mandates?|valuations?|financial model|structur|negotiat|closing|value clients/, anchor: /originate.{0,45}advisory|lead.{0,50}(?:valuations?|negotiat|execution)|lead pitches|negotiat.{0,45}acquisition transactions?.{0,20}clients?/ },
  { subcategoryId: "transaction-restructuring-advisory", jobFunction: "Research & Analysis", mandate: /transaction advisory|infrastructure advisory|restructuring advisory|valuation advisory|financial due diligence for clients/, signals: /feasibility studies|financial models?|client.ready|risk allocation|due diligence|restructuring plans?/, anchor: /advisory engagements|feasibility studies|financial due diligence|restructuring plans?/ },
  { subcategoryId: "capital-markets", jobFunction: "Financing & Origination", mandate: /equity capital markets|\becm\b|debt capital markets|\bdcm\b|bond issuance|equity raises?|ipo advisory/, signals: /originate|equity raises?|bond issu|structur|pricing|underwrit|investor marketing|ipo valuation|issuance documentation/ },
  { subcategoryId: "portfolio-management", jobFunction: "Portfolio & Asset Management", mandate: /public markets|asset manage|portfolio manage|rebalanc|manager selection|portfolio construction|portfolio mandates?/, signals: portfolioAction },
  { subcategoryId: "investment-research", jobFunction: "Research & Analysis", mandate: /equity[- ]research|investment research|sell.side research|\bfic research\b|(?:listed companies|sovereign).{0,55}research/, signals: research, anchor: /(?:build|model|produc|conduct|publish|prepar|writ|assess).{0,80}(?:valuations?|research|forecasts?|recommendations?|listed companies)|listed equities/ },
  { subcategoryId: "investment-advisory-wealth-management", jobFunction: "Investment Advisory", mandate: /wealth management|family office|investment advisory|investment advice/, signals: /client investment proposals?|recommend.{0,45}(?:asset allocation|portfolio)|(?:advise|advising).{0,50}(?:allocation|investment portfolio)|portfolio recommendations?/ },
  { subcategoryId: "institutional-sales-trading", jobFunction: "Trading", mandate: /institutional.{0,30}(?:trad|equities|sales)|trading desk|forex dealer|market making|trading book|fixed.income dealer/, signals: /trade execution|execution strateg|order.management|institutional client|institutional.{0,20}trades?|market making|price quotations?/, anchor: executionTrading },
  { subcategoryId: "structuring-financial-engineering", jobFunction: "Structuring & Financial Engineering", mandate: /fx products?|foreign exchange products?|derivatives?|structured products?|financial engineering/, signals: structuringMarkets, anchor: /develop.{0,40}(?:products?|hedging solutions?)|structure.{0,40}(?:derivatives?|structured products?)|price.{0,25}derivative/ },
  { subcategoryId: "corporate-banking", jobFunction: "Financing & Origination", mandate: /corporate banking|commercial bank|wholesale banking|commercial clients|corporate borrowers?/, signals: creditOwnership },
  { subcategoryId: "project-structured-finance", jobFunction: "Financing & Origination", mandate: /project financ|infrastructure (?:debt|lending|guarantee)|structured[- ](?:financ|lend)|leveraged finance/, signals: /guarantee policy|credit conditions|credit risk|bankability|project finance models?|tailored financing|structuring, pricing|project debt|structure bank loans|loan repayment|covenants?|collateral monitoring/, anchor: /originate structured|structure.{0,45}financing|infrastructure financing transactions|review deal structures|structure bank loans/ },
  { subcategoryId: "trade-syndicated-finance", jobFunction: "Financing & Origination", mandate: /trade[- ]finance|trade and working.capital|trade financ|loan syndicat|syndicated loans?|commodity financ/, signals: /structur.{0,75}(?:trade|working.capital|syndicat)|(?:arrange|negotiate|underwrite|close).{0,60}(?:trade finance|syndicated loans?)|execute.{0,60}(?:trade and working.capital|trade financ)|syndicat.{0,35}loan/ },
  { subcategoryId: "treasury-funding-alm", jobFunction: "Strategic Finance", mandate: /bank treasury|banking balance sheet|asset.liability|\balm\b|hqla portfolio|funding mix/, signals: /liquidity (?:positions?|buffers?)|funding (?:mix|strategies)|alm budgets?|asset.liability positions?|\balco\b|balance.sheet strate|hqla|banking.book interest.rate risk/ },
  { subcategoryId: "corporate-ma", jobFunction: "Investment", mandate: /corporate m&a|corporate acquisition|acquisition strategy|group.{0,30}operating markets|in.house acquisition|own.{0,30}acquisition pipeline/, signals: /acquisition targets?|m&a priorities|acquisition diligence|target valuation|synergies|integration handover/, anchor: transaction },
  { subcategoryId: "strategic-finance-investments", jobFunction: "Strategic Finance", mandate: /capex|capital expenditure|capital invest|strategic finance|capital allocation/, signals: strategic, anchor: /appraisal.{0,50}(?:npv|irr)|(?:evaluate|assess).{0,45}(?:capital expenditure|capex)|post[- ]investment reviews?/ },
  { subcategoryId: "fpa-finance-leadership", jobFunction: "FP&A & Business Partnering", mandate: /financial planning|business partner|forecast|finance (?:team|function)|performance management|margin analysis/, signals: plan },
];

const selectionByChild = new Map(CAREER_AREAS.flatMap(area => area.subcategories.map(child =>
  [child.id, { areaId: area.id, subcategoryId: child.id }] as const)));

const numbers = (duties: readonly Duty[]) => duties.map(duty => duty.number);

function candidateProfiles(duties: readonly Duty[], context: string, directLegal: boolean, primaryEsg: boolean, primaryFundOps: boolean) {
  const mandateLines = [context, ...duties.map(duty => duty.text)];
  return profiles.flatMap(profile => {
    if (!mandateLines.some(line => profile.mandate.test(line))) return [];
    const anchor = profile.anchor;
    const anchors = anchor ? duties.filter(duty => anchor.test(duty.text)) : [];
    const matches = duties.filter(duty => profile.signals.test(duty.text));
    const supportsInvestmentField = profile.jobFunction === "Investment" && selectionByChild.get(profile.subcategoryId)?.areaId === "private-markets";
    const support = supportsInvestmentField ? duties.filter(duty =>
      (directLegal && investmentLegal.test(duty.text)) || (primaryEsg && esg.test(duty.text)) || (primaryFundOps && fundOperations.test(duty.text))) : [];
    if (profile.anchor && anchors.length === 0 && support.length === 0) return [];
    if (matches.length === 0 && support.length === 0) return [];
    const evidence = duties.filter(duty => matches.includes(duty) || anchors.includes(duty) || support.includes(duty));
    // Cap repetition. A specific mandate and a matching anchor carry more weight than extra generic duty bullets.
    const score = 2 + Math.min(matches.length, 3) + Math.min(anchors.length, 2) * 2 +
      (profile.mandate.test(context) ? 2 : 0) + Math.min(support.length, 2) * 2;
    return [{ profile, evidence, score }];
  }).sort((a, b) => b.score - a.score);
}

function readiness(input: FrameworkInput, scope: ScopeRecommendation, classification: ProposedClassificationResult, directLegal: boolean, asOfDate: string): FrameworkAssessment["publicationReadiness"] {
  const blockers: string[] = [];
  if (scope === "needs-review") blockers.push("eligibility-editorial-review-required");
  if (scope === "outside-future-scope") blockers.push("outside-current-eligibility-framework");
  if (directLegal) blockers.push("investment-legal-editorial-review-required");
  if (classification.kind === "unresolved") blockers.push("classification-unresolved");
  if (!input.sourceUrl.trim()) blockers.push("missing-attributable-source");
  if (!input.applyUrl?.trim()) blockers.push("missing-application-destination");
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.deadlineDate ?? "") && input.deadlineDate! < asOfDate) blockers.push("recorded-deadline-passed");
  if (input.lifecycleStatus === "closed") blockers.push("recorded-closed");
  if (input.publicationStatus === "removed") blockers.push("historically-removed-needs-new-review");
  if ((input.historicalDecisionReasons ?? []).some(reason => /expir|unavailable|not found|closed|redirect|not active|inactive/i.test(reason))) blockers.push("historical-availability-or-expiry-exclusion-needs-recheck");
  const decision = blockers.length ? "not-ready" : "requires-verification-and-approval";
  blockers.push("current-source-and-application-verification-not-performed", "new-publication-approval-not-granted");
  return { decision, blockers, freshVerificationPerformed: false, publicationAction: "none" };
}

export function assessFrameworkV11(input: FrameworkInput, asOfDate = OFFLINE_DATE): FrameworkV11Assessment {
  const duties = dutiesFrom(input);
  const context = normalizeEvidence(`${input.summary} ${input.aboutRole}`);
  const matching = (pattern: RegExp) => duties.filter(duty => pattern.test(duty.text));
  const has = (pattern: RegExp) => matching(pattern).length > 0;
  const legalRole = legalContext.test(normalizeEvidence(input.title ?? "")) || legalContext.test(context);
  const directLegal = legalRole && has(investmentLegal);
  const genericLegal = legalRole && !directLegal && has(generalLegal);
  const primaryEsg = (matching(esg).length >= 2 || (/\besg\b/.test(context) && has(esg))) &&
    matching(transaction).filter(duty => !esg.test(duty.text)).length < 2 &&
    !matching(investmentProcess).some(duty => !esg.test(duty.text) && /investment (?:evaluations?|pipeline)|exit opportunit|exit strategy/.test(duty.text));
  const primaryFundOps = matching(fundOperations).length >= 2 ||
    (/fund (?:operations|finance|administration)/.test(context) && has(fundOperations));
  const sovereignRisk = /country (?:and sovereign )?risk|sovereign risk/.test(context) &&
    has(/debt sustainability|country limits|sovereign ratings/);
  const competingStrategy = has(delivery) && has(planningInfluence) && !has(strategic) && !has(modelling);
  const competingTrade = has(commercial) && has(tradeLanguage) && !has(creditOwnership) &&
    !has(/(?:structure|underwrite|execute|negotiate).{0,55}(?:trade (?:financ|and working)|credit facilit|loan|syndicat)/);
  const projectMix = matching(projectControls).length >= 2 && has(cashControls) &&
    !has(/own.{0,40}(?:hedging strategy|capital allocation|funding strategy)|(?:lead|negotiate).{0,40}(?:financing agreements?|project loans?)/);
  const candidates = candidateProfiles(duties, context, directLegal, primaryEsg, primaryFundOps);
  const specialistDuties = duties.filter(duty => [modelling, investmentProcess, risk, research, plan, strategic, executionTrading].some(pattern => pattern.test(duty.text)));
  const explicitDuties = duties.filter(duty => /\b(?:assess|monitor|evaluate|analy[sz]e|build|recommend|underwrite|manage|lead|conduct|prepare|structure|price)\b/.test(duty.text) &&
    /\b(?:financial risks?|financial models?|investment returns?|portfolio exposure|creditworthiness|hedging strategy|cash.flow forecasts?|financial analys\w*|fund accounting)\b/.test(duty.text));
  const qualified = candidates.length > 0 || specialistDuties.length > 0 || explicitDuties.length > 0 || directLegal;
  const general = has(commercial) || has(routine) || has(delivery) || genericLegal;
  const geography = africaRelevance(input);
  const limited = !duties.length;
  const nonJob = Boolean(input.boardSection && input.boardSection !== "Jobs");
  const competingPmo = has(delivery) && has(/feasibility studies|business cases/) && !has(modelling);
  const conflict = competingStrategy || competingTrade || projectMix || competingPmo;

  let decision: ScopeRecommendation = "needs-review";
  let reason: string;
  if (nonJob || limited) reason = "Detailed responsibilities for an individual vacancy are required.";
  else if (geography === "explicitly-non-africa") {
    decision = "outside-future-scope";
    reason = "The source establishes an exclusively non-African mandate.";
  } else if (directLegal) reason = "Direct investment legal duties are evidenced and require mandatory editorial review.";
  else if (genericLegal) {
    decision = "outside-future-scope";
    reason = "The primary legal duties concern general corporate work.";
  } else if (legalRole) reason = "Clarify whether the primary legal work supports investment transactions, funds, or financing.";
  else if (competingStrategy) reason = "Evidence of capital-allocation influence leaves financial appraisal ownership unclear alongside execution governance.";
  else if (competingTrade) reason = "Trade-finance references in commercial duties leave responsibility for financial terms and credit unclear.";
  else if (projectMix) reason = "Forecasting and risk duties overlap with project controls; confirm primary financial decision responsibility.";
  else if (competingPmo) reason = "Business cases sit alongside project management; confirm responsibility for financial appraisal.";
  else if (!qualified && general) {
    decision = "outside-future-scope";
    reason = "The documented primary work is commercial, operational or administrative without specialist finance duties.";
  } else if (!qualified) reason = "The documented duties do not yet establish specialist finance.";
  else if (geography !== "evidenced") reason = "Specialist finance is evidenced; the source must establish an African location or mandate.";
  else {
    decision = "in-scope";
    reason = "Documented duties establish substantive finance or specialist investment support and Africa relevance.";
  }

  const [best, second] = candidates;
  const close = best && second && best.score - second.score <= 1;
  const competing = close ? candidates.filter(candidate => best.score - candidate.score <= 1) : [];
  let classification: ProposedClassificationResult = { kind: "unresolved", reason: "The evidence does not establish a precise primary activity in the approved taxonomy." };
  let classificationDutyNumbers: number[] = [];
  if (sovereignRisk && decision === "in-scope") {
    classification = { kind: "unresolved", reason: "Cross-bank sovereign and country risk lacks a precise approved subcategory.", suggestedAreaId: "banking-structured-finance", suggestedJobFunction: "Risk & Underwriting" };
    classificationDutyNumbers = numbers(matching(risk));
  } else if (decision !== "outside-future-scope" && !nonJob && !limited && !conflict && (!legalRole || directLegal) &&
      input.sourceUrl.trim() && best && !close && best.score >= 5) {
    const selection = selectionByChild.get(best.profile.subcategoryId);
    if (!isCareerSelection(selection)) throw new Error("Invalid activity profile");
    let jobFunction = best.profile.jobFunction;
    if (directLegal) jobFunction = "Investment Legal";
    else if (primaryEsg) jobFunction = "Impact & ESG";
    else if (primaryFundOps) jobFunction = "Fund Finance & Operations";
    else if (jobFunction === "FP&A & Business Partnering" && has(/\b(?:lead|manage|oversee)\b.{0,35}\bfinance (?:team|function)\b/)) jobFunction = "Finance Leadership";
    else if (selection.subcategoryId === "investment-lending" && has(/(?:originate|structur|close).{0,40}financing/) && !/concessional capital/.test(context)) jobFunction = "Financing & Origination";
    else if (selection.areaId === "banking-structured-finance" && jobFunction === "Financing & Origination" && matching(risk).length >= 2 &&
      !has(/(?:originate|prepare and present).{0,65}(?:financ|credit applications?)/)) jobFunction = "Risk & Underwriting";
    else if (jobFunction === "Trading" && !has(executionTrading)) jobFunction = "Institutional Sales";
    classificationDutyNumbers = numbers(best.evidence);
    classification = { kind: "mapped", classification: {
      ...selection, jobFunction, interestTags: [], sourceUrl: input.sourceUrl,
      rationale: `Primary activity supported by responsibilities ${classificationDutyNumbers.join(", ")}.`,
      proposedBy: ELIGIBILITY_V11, proposedAt: asOfDate, method: "ai-assisted", status: "proposed",
    } };
  } else if (close && !conflict && decision !== "outside-future-scope") {
    classification = { kind: "unresolved", reason: "Competing activity profiles have similar duty support; review the primary mandate." };
  }
  const eligibilityDutyNumbers = numbers(duties.filter(duty =>
    specialistDuties.includes(duty) || explicitDuties.includes(duty) || (best?.evidence.includes(duty) ?? false) ||
    [delivery, commercial, routine, projectControls, investmentLegal, generalLegal].some(pattern => pattern.test(duty.text))));
  return {
    frameworkVersion: ELIGIBILITY_V11,
    eligibility: { decision, reasons: [reason], editorialReviewRequired: decision !== "in-scope" || classification.kind === "unresolved",
      checks: { financialSubstance: conflict ? "uncertain" : qualified && !genericLegal ? "present" : general ? "absent" : "uncertain",
        professionalRelevance: conflict ? "uncertain" : qualified && !genericLegal ? "specialist-finance" : general ? "general-role" : "uncertain",
        africaRelevance: geography, evidenceQuality: limited ? "limited" : "responsibilities-present" },
      investmentLegal: directLegal ? "direct-investment-legal" : genericLegal ? "generic-legal" : legalRole ? "uncertain" : "not-identified" },
    classification, publicationReadiness: readiness(input, decision, classification, directLegal, asOfDate),
    evidence: { eligibilityDutyNumbers, classificationDutyNumbers, competingSubcategoryIds: competing.map(item => item.profile.subcategoryId) },
  };
}
