import type { ACDSection, Classification, CollectedVacancy } from "./types.ts";

const programmeTitle = /\b(intern(ship)?|graduate( programme| program)?|fellow(ship)?|trainee(ship)?|young professional)\b/i;
const openApplicationTitle = /\b(talent community|expression of interest|spontaneous application|open application|general application)\b/i;
const directExclusion = /\b(human resources|\bhr\b|marketing|communications|software (engineer|developer)|web developer|sales|commercial (director|manager)|field coordinator|administrat(?:ion|ive)|office manager)\b/i;
const dataRole = /\b(data (analyst|scientist|engineer)|business intelligence)\b/i;
const transactionLegal = /\b(project finance|asset finance|banking (and|&) finance|investment legal|transaction)\b/i;
const legalRole = /\blegal\b/i;
const directFinance = /\b(investment (manager|officer|associate|analyst|director)|private equity|venture capital|project finance|structured finance|treasury|markets|corporate development|m&a|mergers|acquisitions|portfolio)\b/i;
const supportiveScope = /\b(investment|due diligence|valuation|financial model|financial analysis|transaction|deal execution|project finance|private equity|venture capital|infrastructure finance)\b/i;

function opportunityType(title: string): ACDSection {
  if (programmeTitle.test(title)) return "Programme";
  if (openApplicationTitle.test(title)) return "Open Application";
  return "Job";
}

function missingFields(vacancy: CollectedVacancy): string[] {
  const missing: string[] = [];
  if (vacancy.location === "Location not specified" || !vacancy.location) missing.push("location");
  if (!vacancy.description) missing.push("role description");
  if (!vacancy.employmentType) missing.push("employment type");
  return missing;
}

export function classify(vacancy: CollectedVacancy): Classification {
  const section = opportunityType(vacancy.title);
  const missing = missingFields(vacancy);
  const roleText = `${vacancy.title}\n${vacancy.department ?? ""}`;
  const description = vacancy.description ?? "";
  const base = { section, missingFields: missing };

  if (section === "Programme") return { ...base, outcome: "borderline", category: "Structured early career", confidence: 0.7, reasons: [`${vacancy.title} explicitly identifies a structured early-career opportunity.`], blocking: false };
  if (section === "Open Application") return { ...base, outcome: "borderline", category: "Evergreen opportunity", confidence: 0.65, reasons: [`${vacancy.title} is an explicit open-application route and needs editorial verification.`], blocking: false };
  if (directExclusion.test(roleText)) return { ...base, outcome: "out_of_scope", confidence: 0.82, reasons: [`${vacancy.title} is primarily a functional ${dataRole.test(roleText) ? "data" : "non-investment"} role rather than an ACD finance or investment opportunity.`], blocking: false };
  if (legalRole.test(roleText)) {
    const focused = transactionLegal.test(roleText) || transactionLegal.test(description);
    return { ...base, outcome: "borderline", category: "Transaction legal", confidence: focused ? 0.63 : 0.48, reasons: [focused ? `${vacancy.title} is legal work connected to finance or transactions; editorial review should confirm fit.` : `${vacancy.title} is legal work without clear transaction or project-finance evidence.`], blocking: false };
  }
  if (directFinance.test(roleText)) return { ...base, outcome: "strong_candidate", category: "Finance and investment", confidence: vacancy.description ? 0.88 : 0.74, reasons: [`${vacancy.title} directly names an ACD-relevant investment, finance, treasury, markets, or corporate-development function.`], blocking: false };
  if (dataRole.test(roleText)) return { ...base, outcome: "borderline", category: "Data and analytics", confidence: 0.42, reasons: [`${vacancy.title} is a data role; any finance relevance must be confirmed from role-specific responsibilities.`], blocking: false };
  if (supportiveScope.test(description) && /\b(manager|officer|associate|analyst|director|specialist)\b/i.test(vacancy.title)) return { ...base, outcome: "borderline", category: "Potentially relevant", confidence: 0.56, reasons: [`${vacancy.title} has role-description evidence of transaction or investment work, but the title is not a direct ACD function.`], blocking: false };
  if (!vacancy.description) return { ...base, outcome: "insufficient_evidence", confidence: 0.3, reasons: [`${vacancy.title} has no role description, so relevance cannot be assessed reliably.`], blocking: true };
  return { ...base, outcome: "out_of_scope", confidence: 0.62, reasons: [`${vacancy.title} has no role-specific evidence of finance, investment, infrastructure, or transaction work.`], blocking: false };
}
