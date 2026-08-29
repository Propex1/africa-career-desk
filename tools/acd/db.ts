import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { employers, sources } from "./registry.ts";
import type { Classification, CollectedVacancy, DecisionAction, DuplicateMatch, SourceResult } from "./types.ts";
import { normalizeUrl } from "./normalize.ts";
import { existingMetadata } from "./existing.ts";
import { assessFreshness, contentFingerprint } from "./freshness.ts";
import { batches, employerRegistry } from "./batches.ts";
import { assessReadiness } from "./readiness.ts";

export class AcdDatabase {
  readonly db: DatabaseSync;
  readonly root: string;
  constructor(root: string) {
    this.root = root;
    const path = resolve(root, "data/acd-runtime/acd.sqlite"); mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path); this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;"); this.migrate(); this.seedRegistry();
  }
  private migrate() {
    this.db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
    for (const id of ["001_initial", "002_add_department", "003_add_freshness", "004_batches", "005_research_imports"]) {
      if (this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(id)) continue;
      let migration = readFileSync(resolve(this.root, `tools/acd/migrations/${id}.sql`), "utf8");
      if (id === "005_research_imports") {
        const columns = new Set((this.db.prepare("PRAGMA table_info(runs)").all() as Array<{ name: string }>).map((column) => column.name));
        if (columns.has("label")) migration = migration.replace("ALTER TABLE runs ADD COLUMN label TEXT;\n", "");
        if (columns.has("import_batch_run_id")) migration = migration.replace("ALTER TABLE runs ADD COLUMN import_batch_run_id TEXT;\n", "");
      }
      this.db.exec(migration);
      this.db.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(id, new Date().toISOString());
    }
  }
  private seedRegistry() {
    const employer = this.db.prepare("INSERT OR REPLACE INTO employers (id,name,aliases_json,logo_url) VALUES (?,?,?,?)");
    for (const item of employers) employer.run(item.id, item.name, JSON.stringify(item.aliases), item.logoUrl ?? null);
    const source = this.db.prepare("INSERT OR REPLACE INTO sources (id,employer_id,source_type,url,priority,required,active,access_method,last_verified,expected_coverage,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const item of sources) source.run(item.id, item.employerId, item.type, item.url, item.priority, Number(item.required), Number(item.active), item.accessMethod, item.lastVerified, item.expectedCoverage, item.notes);
    const batch = this.db.prepare("INSERT OR IGNORE INTO batches (id,sequence,status,created_at) VALUES (?,?,?,?)");
    const membership = this.db.prepare("INSERT OR IGNORE INTO batch_employers (batch_id,employer_id,ordinal) VALUES (?,?,?)");
    const research = this.db.prepare("INSERT OR IGNORE INTO employer_research (batch_id,employer_id,status) VALUES (?,?,?)");
    for (const item of batches) { batch.run(item.id, item.sequence, "Not researched", new Date().toISOString()); item.employerIds.forEach((employerId, ordinal) => { membership.run(item.id, employerId, ordinal + 1); research.run(item.id, employerId, "Not researched"); }); }
  }

  batchOverview(batchId?: string) {
    const batch = (batchId ? this.db.prepare("SELECT * FROM batches WHERE id=?").get(batchId) : undefined) as Record<string, unknown> | undefined ?? this.db.prepare("SELECT * FROM batches WHERE status != 'Completed - awaiting publication' ORDER BY sequence LIMIT 1").get() as Record<string, unknown> | undefined ?? this.db.prepare("SELECT * FROM batches ORDER BY COALESCE(research_completed_at, '0000-00-00'),sequence LIMIT 1").get() as Record<string, unknown> | undefined;
    if (!batch) return null;
    const employers = this.db.prepare("SELECT e.id,e.name,er.status,er.completed_at,er.limitation_reason,er.manual_follow_up,er.acknowledged_at FROM batch_employers be JOIN employers e ON e.id=be.employer_id JOIN employer_research er ON er.batch_id=be.batch_id AND er.employer_id=be.employer_id WHERE be.batch_id=? ORDER BY be.ordinal").all(batch.id);
    return { ...batch, totalBatches: batches.length, employers, registry: { included: employerRegistry.employers.length, sourceWorkbook: employerRegistry.sourceWorkbook, sourceSheet: employerRegistry.sourceSheet } };
  }
  researchBatchesOverview() {
    const importForBatch = this.db.prepare("SELECT ri.batch_run_id AS batchRunId,ri.run_id AS runId,ri.imported_at AS importedAt,r.label FROM research_imports ri JOIN runs r ON r.id=ri.run_id WHERE ri.batch_run_id=? OR ri.batch_run_id LIKE ? OR ri.batch_run_id LIKE ? ORDER BY ri.imported_at DESC LIMIT 1");
    const employerCheck = this.db.prepare("SELECT MAX(sc.completed_at) AS lastChecked FROM source_checks sc JOIN sources s ON s.id=sc.source_id WHERE sc.run_id=? AND s.employer_id=?");
    const checkedEmployers = this.db.prepare("SELECT COUNT(DISTINCT s.employer_id) AS count FROM source_checks sc JOIN sources s ON s.id=sc.source_id WHERE sc.run_id=?");
    const metrics = this.db.prepare("SELECT COUNT(*) AS activeOpportunities,SUM(CASE WHEN json_extract(v.classification_json,'$.outcome') != 'existing_duplicate' THEN 1 ELSE 0 END) AS reviewable,SUM(CASE WHEN d.action IS NOT NULL AND d.action != 'treat_as_new' AND json_extract(v.classification_json,'$.outcome') != 'existing_duplicate' THEN 1 ELSE 0 END) AS reviewed FROM vacancies v LEFT JOIN decisions d ON d.vacancy_id=v.id WHERE v.run_id=? AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0");
    const limitations = this.db.prepare("SELECT COUNT(*) AS count FROM source_checks WHERE run_id=? AND (failure_reason IS NOT NULL OR manual_review_required=1)");
    const expired = this.db.prepare("SELECT COUNT(*) AS count FROM research_import_expired_findings WHERE batch_run_id=?");
    const published = this.db.prepare("SELECT MAX(pm.created_at) AS lastPublishedAt FROM publication_manifests pm WHERE pm.run_id=?");
    const result = batches.map((definition) => {
      const imported = importForBatch.get(definition.id, `${definition.id}-%`, `pilot-${definition.id}-%`) as { batchRunId: string; runId: number; importedAt: string; label?: string } | undefined;
      const employers = this.db.prepare("SELECT e.id,e.name,er.status FROM batch_employers be JOIN employers e ON e.id=be.employer_id JOIN employer_research er ON er.batch_id=be.batch_id AND er.employer_id=be.employer_id WHERE be.batch_id=? ORDER BY be.ordinal").all(definition.id) as Array<{ id: string; name: string; status: string }>;
      if (!imported) return { id: definition.id, number: definition.sequence, name: `Research batch ${definition.sequence}`, employers: employers.map((employer) => ({ ...employer, lastChecked: null })), employerCount: employers.length, firmsChecked: 0, firmsExpected: employers.length, activeOpportunities: 0, reviewed: 0, reviewable: 0, expiredExcluded: 0, limitations: false, researchStatus: "Not researched", reviewStatus: "No imported review run", lastResearchedAt: null, lastPublishedAt: null, action: "Start batch", runId: null };
      const checked = Number((checkedEmployers.get(imported.runId) as { count: number }).count);
      const counts = metrics.get(imported.runId) as { activeOpportunities: number; reviewable: number | null; reviewed: number | null };
      const limitationCount = Number((limitations.get(imported.runId) as { count: number }).count);
      const completion = this.reviewCompletion(imported.runId);
      const reviewable = Number(counts.reviewable ?? 0), reviewed = Number(counts.reviewed ?? 0);
      const isPilot = imported.batchRunId.startsWith(`pilot-${definition.id}-`);
      return { id: definition.id, number: definition.sequence, name: (imported.label ?? `Batch ${definition.sequence}`).replace(/^Batch 0?(\d+) /, "Batch $1 "), employers: employers.map((employer) => ({ ...employer, lastChecked: (employerCheck.get(imported.runId, employer.id) as { lastChecked?: string | null }).lastChecked ?? null, status: (employerCheck.get(imported.runId, employer.id) as { lastChecked?: string | null }).lastChecked ? "Checked" : "Not researched" })), employerCount: employers.length, firmsChecked: checked, firmsExpected: isPilot ? checked : employers.length, activeOpportunities: Number(counts.activeOpportunities), reviewed, reviewable, expiredExcluded: Number((expired.get(imported.batchRunId) as { count: number }).count), limitations: limitationCount > 0, researchStatus: limitationCount ? "Completed with limitations" : "Ready for review", reviewStatus: completion.completionLabel, codexIssues: completion.unresolved + completion.blockedApproved.length, lastResearchedAt: imported.importedAt, lastPublishedAt: (published.get(imported.runId) as { lastPublishedAt?: string | null }).lastPublishedAt ?? null, action: reviewed === reviewable && reviewable > 0 ? "View batch" : "Continue review", runId: imported.runId };
    });
    const researched = result.filter((batch) => batch.lastResearchedAt).sort((left, right) => String(right.lastResearchedAt).localeCompare(String(left.lastResearchedAt)));
    const current = researched[0];
    const publication = this.db.prepare("SELECT MAX(created_at) AS lastPublishedAt FROM publication_manifests").get() as { lastPublishedAt?: string | null };
    return { totalEmployers: employerRegistry.employers.length, totalBatches: result.length, mostRecentlyResearched: current ? { id: current.id, name: current.name, at: current.lastResearchedAt } : null, currentReview: current ? { reviewed: current.reviewed, reviewable: current.reviewable } : null, lastPublicationAt: publication.lastPublishedAt ?? null, batches: result };
  }
  acknowledgeEmployerLimitation(batchId: string, employerId: string, note: string, manualFollowUp = false) { this.db.prepare("UPDATE employer_research SET status=?,acknowledged_at=?,acknowledgement_note=?,manual_follow_up=? WHERE batch_id=? AND employer_id=?").run(manualFollowUp ? "Manual follow-up required" : "Complete with limitations", new Date().toISOString(), note, Number(manualFollowUp), batchId, employerId); }
  completeBatch(batchId: string) {
    const outstanding = Number((this.db.prepare("SELECT COUNT(*) AS count FROM employer_research WHERE batch_id=? AND status NOT IN ('Complete','Complete with limitations')").get(batchId) as { count: number }).count);
    if (outstanding) throw new Error(`${outstanding} employer source-coverage result(s) still need completion or acknowledgement.`);
    this.db.prepare("UPDATE batches SET status='Completed - awaiting publication',review_completed_at=? WHERE id=?").run(new Date().toISOString(), batchId);
  }
  createRun(resumedFrom?: number): number { return Number(this.db.prepare("INSERT INTO runs (status,started_at,resumed_from) VALUES ('running',?,?)").run(new Date().toISOString(), resumedFrom ?? null).lastInsertRowid); }
  latestInterruptedRun(): number | undefined { const row = this.db.prepare("SELECT id FROM runs WHERE status IN ('running','interrupted') ORDER BY id DESC LIMIT 1").get() as { id?: number } | undefined; return row?.id; }
  completeRun(runId: number) { this.db.prepare("UPDATE runs SET status='completed', completed_at=? WHERE id=?").run(new Date().toISOString(), runId); }
  sourceWasChecked(runId: number, sourceId: string): boolean { return Boolean(this.db.prepare("SELECT 1 FROM source_checks WHERE run_id=? AND source_id=?").get(runId, sourceId)); }
  recordCheck(runId: number, sourceId: string, result: SourceResult, count: number, failureReason?: string, manual = false) { const at = new Date().toISOString(); this.db.prepare("INSERT OR REPLACE INTO source_checks (run_id,source_id,result,attempted_at,completed_at,vacancies_collected,failure_reason,manual_review_required) VALUES (?,?,?,?,?,?,?,?)").run(runId, sourceId, result, at, at, count, failureReason ?? null, Number(manual)); }
  addVacancy(runId: number, item: CollectedVacancy, classification: Classification): number {
    this.observeFreshness(item);
    const result = this.db.prepare("INSERT OR IGNORE INTO vacancies (run_id,source_id,source_key,employer_id,title,department,location,description,employment_type,requisition_id,published_at,deadline,apply_url,normalized_apply_url,source_url,source_type,evidence,discovered_at,classification_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(runId, item.sourceId, item.sourceKey, item.employerId, item.title, item.department ?? null, item.location ?? null, item.description ?? null, item.employmentType ?? null, item.requisitionId ?? null, item.publishedAt ?? null, item.deadline ?? null, item.applyUrl ?? null, normalizeUrl(item.applyUrl) ?? null, item.sourceUrl, item.sourceType, item.evidence, item.discoveredAt, JSON.stringify(classification));
    if (result.changes) return Number(result.lastInsertRowid);
    return Number((this.db.prepare("SELECT id FROM vacancies WHERE run_id=? AND source_id=? AND source_key=?").get(runId, item.sourceId, item.sourceKey) as { id: number }).id);
  }
  private observeFreshness(item: CollectedVacancy) {
    const previous = this.db.prepare("SELECT manual_confirmed_at FROM vacancy_freshness WHERE source_id=? AND source_key=?").get(item.sourceId, item.sourceKey) as { manual_confirmed_at?: string } | undefined;
    const assessed = assessFreshness({ ...item, sourcePresent: true, manualConfirmedAt: previous?.manual_confirmed_at, now: new Date(item.discoveredAt) });
    const at = item.discoveredAt;
    this.db.prepare("INSERT INTO vacancy_freshness (source_id,source_key,first_seen_at,last_successfully_seen_at,last_checked_at,official_posted_at,official_deadline,content_fingerprint,application_route_status,freshness_status,freshness_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id,source_key) DO UPDATE SET last_successfully_seen_at=excluded.last_successfully_seen_at,last_checked_at=excluded.last_checked_at,official_posted_at=excluded.official_posted_at,official_deadline=excluded.official_deadline,content_fingerprint=excluded.content_fingerprint,application_route_status=excluded.application_route_status,freshness_status=excluded.freshness_status,freshness_reason=excluded.freshness_reason").run(item.sourceId, item.sourceKey, at, at, at, item.publishedAt ?? null, item.deadline ?? null, contentFingerprint(item), item.applicationRouteStatus ?? "unknown", assessed.status, assessed.reason);
  }
  markSourceChecked(sourceId: string) { this.db.prepare("UPDATE vacancy_freshness SET last_checked_at=? WHERE source_id=?").run(new Date().toISOString(), sourceId); }
  comparables(runId: number) { return this.db.prepare("SELECT id,employer_id AS employerId,title,location,requisition_id AS requisitionId,apply_url AS applyUrl FROM vacancies WHERE run_id != ?").all(runId) as Array<{ id: number; employerId: string; title: string; location?: string; requisitionId?: string; applyUrl?: string }>; }
  addDuplicates(vacancyId: number, matches: DuplicateMatch[]) { const statement = this.db.prepare("INSERT OR IGNORE INTO duplicate_matches (vacancy_id,kind,basis,matched_vacancy_id,external_reference,detail) VALUES (?,?,?,?,?,?)"); for (const match of matches) statement.run(vacancyId, match.kind, match.basis, match.vacancyId ?? null, match.externalReference ?? null, match.detail); }
  updateClassification(vacancyId: number, classification: Classification) { this.db.prepare("UPDATE vacancies SET classification_json=? WHERE id=?").run(JSON.stringify(classification), vacancyId); }
  correctImportedVacancy(vacancyId: number, values: { title?: string; sourceUrl?: string; applicationUrl?: string; postedAt?: string | null; deadline?: string | null; freshnessStatus?: "verified_active" | "check_freshness" | "closed_expired"; freshnessReason?: string; applicationRouteStatus?: "available" | "broken" | "unknown" }) {
    const vacancy = this.db.prepare("SELECT source_id,source_key FROM vacancies WHERE id=?").get(vacancyId) as { source_id: string; source_key: string } | undefined;
    if (!vacancy) throw new Error("Vacancy was not found.");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (Object.keys(values).some((key) => ["title", "sourceUrl", "applicationUrl", "postedAt", "deadline"].includes(key))) this.db.prepare("UPDATE vacancies SET title=COALESCE(?,title),source_url=COALESCE(?,source_url),apply_url=COALESCE(?,apply_url),normalized_apply_url=COALESCE(?,normalized_apply_url),published_at=COALESCE(?,published_at),deadline=COALESCE(?,deadline) WHERE id=?").run(values.title ?? null, values.sourceUrl ?? null, values.applicationUrl ?? null, values.applicationUrl ? normalizeUrl(values.applicationUrl) : null, values.postedAt ?? null, values.deadline ?? null, vacancyId);
      if (Object.keys(values).some((key) => ["postedAt", "deadline", "freshnessStatus", "freshnessReason", "applicationRouteStatus"].includes(key))) this.db.prepare("UPDATE vacancy_freshness SET official_posted_at=COALESCE(?,official_posted_at),official_deadline=COALESCE(?,official_deadline),freshness_status=COALESCE(?,freshness_status),freshness_reason=COALESCE(?,freshness_reason),application_route_status=COALESCE(?,application_route_status),last_checked_at=? WHERE source_id=? AND source_key=?").run(values.postedAt ?? null, values.deadline ?? null, values.freshnessStatus ?? null, values.freshnessReason ?? null, values.applicationRouteStatus ?? null, new Date().toISOString(), vacancy.source_id, vacancy.source_key);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  archiveImportedVacancyAsExpired(vacancyId: number, closureEvidence: string, exclusionReason: string) {
    const row = this.db.prepare("SELECT v.title,v.employer_id,v.classification_json,v.source_id,v.source_key,ril.batch_run_id AS batch_run_id FROM vacancies v JOIN research_import_lineage ril ON ril.vacancy_id=v.id WHERE v.id=?").get(vacancyId) as { title: string; employer_id: string; classification_json: string; source_id: string; source_key: string; batch_run_id: string } | undefined;
    if (!row) throw new Error("Only an imported research vacancy can be archived as expired.");
    const classification = JSON.parse(row.classification_json) as Classification;
    classification.archived = true; classification.archivedAt = new Date().toISOString(); classification.archivalReason = exclusionReason;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE vacancies SET classification_json=? WHERE id=?").run(JSON.stringify(classification), vacancyId);
      this.db.prepare("UPDATE vacancy_freshness SET freshness_status='closed_expired',freshness_reason=?,last_checked_at=? WHERE source_id=? AND source_key=?").run(exclusionReason, classification.archivedAt, row.source_id, row.source_key);
      this.db.prepare("INSERT OR IGNORE INTO research_import_expired_findings (batch_run_id,employer_id,title,closure_evidence,exclusion_reason) VALUES (?,?,?,?,?)").run(row.batch_run_id, row.employer_id, row.title, closureEvidence, exclusionReason);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  workableVacancies() { return this.db.prepare("SELECT id,requisition_id AS requisitionId FROM vacancies WHERE source_id='afreximbank-workable' AND requisition_id IS NOT NULL").all() as Array<{ id: number; requisitionId: string }>; }
  updateReviewerUrl(vacancyId: number, applyUrl: string) { this.db.prepare("UPDATE vacancies SET apply_url=?, normalized_apply_url=? WHERE id=?").run(applyUrl, normalizeUrl(applyUrl), vacancyId); }
  private refreshFreshnessAssessments() {
    const rows = this.db.prepare("SELECT source_id,source_key,official_posted_at,official_deadline,application_route_status,manual_confirmed_at FROM vacancy_freshness").all() as Array<{ source_id: string; source_key: string; official_posted_at?: string; official_deadline?: string; application_route_status: "available" | "broken" | "unknown"; manual_confirmed_at?: string }>;
    const update = this.db.prepare("UPDATE vacancy_freshness SET freshness_status=?,freshness_reason=? WHERE source_id=? AND source_key=?");
    for (const row of rows) { const assessed = assessFreshness({ publishedAt: row.official_posted_at, deadline: row.official_deadline, applicationRouteStatus: row.application_route_status, sourcePresent: true, manualConfirmedAt: row.manual_confirmed_at }); update.run(assessed.status, assessed.reason, row.source_id, row.source_key); }
  }
  dashboard(batchId?: string, selectedRunId?: number) {
    this.refreshFreshnessAssessments();
    const latest = (selectedRunId ? this.db.prepare("SELECT * FROM runs WHERE id=?").get(selectedRunId) : undefined) as Record<string, unknown> | undefined ?? this.db.prepare("SELECT * FROM runs ORDER BY id DESC LIMIT 1").get() as Record<string, unknown> | undefined;
    if (!latest) return { run: null, checks: [], vacancies: [], totals: {} };
    const runId = latest.id as number;
    const runs = this.db.prepare("SELECT id,status,started_at,completed_at,label,import_batch_run_id FROM runs WHERE id=(SELECT MAX(id) FROM runs WHERE import_batch_run_id IS NULL AND status='completed') OR import_batch_run_id IS NOT NULL ORDER BY id").all();
    const checks = this.db.prepare("SELECT sc.*,s.url,s.source_type,e.name AS employer_name FROM source_checks sc JOIN sources s ON s.id=sc.source_id JOIN employers e ON e.id=s.employer_id WHERE sc.run_id=? ORDER BY s.priority,s.id").all(runId);
    const vacancies = this.db.prepare("SELECT v.*,e.name AS employer_name,e.logo_url,d.action,d.edited_json,d.reviewer_note,f.first_seen_at,f.last_successfully_seen_at,f.last_checked_at,f.official_posted_at,f.official_deadline,f.content_fingerprint,f.application_route_status,f.freshness_status,f.freshness_reason,f.manual_confirmed_at,f.manual_confirmation_note,(SELECT COUNT(*) FROM duplicate_matches dm WHERE dm.vacancy_id=v.id) AS duplicate_count FROM vacancies v JOIN employers e ON e.id=v.employer_id LEFT JOIN decisions d ON d.vacancy_id=v.id LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key WHERE v.run_id=? AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 ORDER BY v.id DESC").all(runId) as Array<Record<string, unknown>>;
    const matches = this.db.prepare("SELECT vacancy_id AS vacancyId,kind,basis,external_reference AS externalReference,detail FROM duplicate_matches WHERE vacancy_id IN (SELECT id FROM vacancies WHERE run_id=?)").all(runId) as Array<{ vacancyId: number; kind: string; basis: string; externalReference?: string; detail: string }>;
    const decoratedVacancies = vacancies.map((vacancy) => ({ ...vacancy, duplicateMatches: matches.filter((match) => match.vacancyId === vacancy.id).map((match) => ({ ...match, existing: existingMetadata(this.root, match.externalReference) })) }));
    const pilot = this.db.prepare("SELECT ri.batch_run_id AS batchRunId,COUNT(DISTINCT sc.source_id) AS employersChecked,COUNT(DISTINCT v.id) AS opportunitiesToReview,COUNT(DISTINCT ef.id) AS expiredExcluded,MAX(ri.imported_at) AS importedAt FROM research_imports ri LEFT JOIN source_checks sc ON sc.run_id=ri.run_id LEFT JOIN vacancies v ON v.run_id=ri.run_id AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 LEFT JOIN research_import_expired_findings ef ON ef.batch_run_id=ri.batch_run_id WHERE ri.run_id=? GROUP BY ri.batch_run_id").get(runId);
    return { run: latest, runs, pilot, completion: this.reviewCompletion(runId), batch: this.batchOverview(batchId), batches: batches.map((item) => ({ id: item.id, sequence: item.sequence })), totals: this.db.prepare("SELECT json_extract(classification_json,'$.outcome') AS outcome, COUNT(*) AS count FROM vacancies WHERE run_id=? AND COALESCE(json_extract(classification_json,'$.archived'),0)=0 GROUP BY outcome").all(runId), checks, vacancies: decoratedVacancies };
  }
  reviewCompletion(runId: number) {
    const rows = this.db.prepare("SELECT v.*,e.name AS employerName,e.logo_url AS logoUrl,d.action,d.edited_json,f.freshness_status,f.application_route_status,ril.batch_run_id AS batchRunId,ril.employer_id AS lineageEmployerId,ril.result_path AS resultPath,ril.source_key AS lineageSourceKey,ril.publication_missing_fields_json AS publicationMissingFields FROM vacancies v JOIN employers e ON e.id=v.employer_id LEFT JOIN decisions d ON d.vacancy_id=v.id LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key LEFT JOIN research_import_lineage ril ON ril.vacancy_id=v.id WHERE v.run_id=? AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 ORDER BY v.id").all(runId) as Array<Record<string, unknown>>;
    const expiredFindings = Number((this.db.prepare("SELECT COUNT(*) AS count FROM research_imports ri JOIN research_import_expired_findings ef ON ef.batch_run_id=ri.batch_run_id WHERE ri.run_id=?").get(runId) as { count: number }).count);
    const reviewable = rows.filter((row) => JSON.parse(String(row.classification_json)).outcome !== "existing_duplicate");
    const unresolved = reviewable.filter((row) => !row.action || row.action === "treat_as_new");
    const approved = reviewable.filter((row) => row.action === "approved");
    const blockedApproved = approved.map((row) => {
      const classification = JSON.parse(String(row.classification_json)) as Classification;
      const edited = row.edited_json ? JSON.parse(String(row.edited_json)) as { readiness?: Record<string, unknown> } : {};
      const values = edited.readiness ?? {};
      const importedMissingFields = [...new Set([...(classification.missingFields ?? []), ...((row.publicationMissingFields ? JSON.parse(String(row.publicationMissingFields)) : []) as string[])])];
      const assessment = assessReadiness({ employerName: row.employerName, title: values.title ?? row.title, location: values.location ?? row.location, description: values.description ?? row.description, applicationUrl: values.applicationUrl ?? row.apply_url, opportunityType: classification.section, freshnessStatus: row.freshness_status, applicationRouteStatus: values.applicationUrl ? "available" : row.application_route_status, classification, importedMissingFields });
      return { ...row, title: values.title ?? row.title, location: values.location ?? row.location, description: values.description ?? row.description, apply_url: values.applicationUrl ?? row.apply_url, source_url: values.evidenceUrl ?? row.source_url, evidence: values.evidenceUrl ? `${String(row.evidence ?? "")}\nReviewer evidence: ${values.evidenceUrl}` : row.evidence, ...assessment, classification, edited: values, importedMissingFields };
    });
    const readyApproved = blockedApproved.filter((row) => row.ready);
    return { runId, reviewable: reviewable.length, decisionsCompleted: reviewable.length - unresolved.length, approved: approved.length, rejected: reviewable.filter((row) => row.action === "rejected").length, keptForLater: reviewable.filter((row) => row.action === "deferred").length, unresolved: unresolved.length, readyForCodex: readyApproved.length, approvedOpportunities: blockedApproved, blockedApproved: blockedApproved.filter((row) => !row.ready), expiredFindings, canComplete: unresolved.length === 0 && blockedApproved.every((row) => row.ready), completionLabel: unresolved.length ? "Review in progress" : blockedApproved.some((row) => !row.ready) ? "Review complete - Not ready for Codex" : "Review complete - Ready for Codex" };
  }
  codexManifestPreview(runId: number) {
    const completion = this.reviewCompletion(runId);
    const sourceCoverage = this.db.prepare("SELECT sc.*,s.url,s.source_type,e.name AS employerName FROM source_checks sc JOIN sources s ON s.id=sc.source_id JOIN employers e ON e.id=s.employer_id WHERE sc.run_id=? ORDER BY s.id").all(runId);
    const importRow = this.db.prepare("SELECT batch_run_id AS batchRunId,preview_path AS previewPath FROM research_imports WHERE run_id=?").get(runId) as { batchRunId?: string; previewPath?: string } | undefined;
    const preview = importRow?.previewPath && existsSync(importRow.previewPath) ? JSON.parse(readFileSync(importRow.previewPath, "utf8")) as { preview?: { discoveredSourceProposals?: unknown[] }; discoveredSourceProposals?: unknown[] } : undefined;
    const summarize = (row: Record<string, unknown>) => { const classification = row.classification as Classification; return { batchRunId: row.batchRunId ?? null, reviewRunId: runId, vacancyId: row.id, employerId: row.employer_id, employerName: row.employerName, logoUrl: row.logoUrl ?? null, title: row.title, opportunityType: classification.section, classification, freshness: row.freshness_status ?? "check_freshness", officialSourceUrl: row.source_url, applicationUrl: row.apply_url, applicationRouteStatus: row.application_route_status, location: row.location, postingDate: row.published_at, deadline: row.deadline, description: row.description, evidence: row.evidence, missingFields: row.missingFields, blockers: row.blockers, lineage: row.batchRunId ? { batchRunId: row.batchRunId, employerId: row.lineageEmployerId, resultPath: row.resultPath, sourceKey: row.lineageSourceKey } : null }; };
    const rejected = this.db.prepare("SELECT v.id,v.employer_id,e.name AS employerName,v.title,d.action FROM vacancies v JOIN employers e ON e.id=v.employer_id JOIN decisions d ON d.vacancy_id=v.id WHERE v.run_id=? AND d.action='rejected' AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 ORDER BY v.id").all(runId);
    const keptForLater = this.db.prepare("SELECT v.id,v.employer_id,e.name AS employerName,v.title,d.action FROM vacancies v JOIN employers e ON e.id=v.employer_id JOIN decisions d ON d.vacancy_id=v.id WHERE v.run_id=? AND d.action='deferred' AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 ORDER BY v.id").all(runId);
    const expiredFindings = this.db.prepare("SELECT ef.* FROM research_imports ri JOIN research_import_expired_findings ef ON ef.batch_run_id=ri.batch_run_id WHERE ri.run_id=? ORDER BY ef.id").all(runId);
    return { version: "acd-codex-manifest-preview-v1", runId, batchRunId: importRow?.batchRunId ?? null, completion, readyOpportunities: completion.approvedOpportunities.filter((row) => row.ready).map(summarize), blockedApprovedOpportunities: completion.blockedApproved.map(summarize), rejectedOpportunities: rejected, keptForLater, expiredFindings, sourceCoverage, discoveredSourceProposals: preview?.preview?.discoveredSourceProposals ?? preview?.discoveredSourceProposals ?? [] };
  }
  createCodexManifest(runId: number) {
    const preview = this.codexManifestPreview(runId);
    if (preview.completion.unresolved) throw new Error("Review unresolved items before generating the Codex publication manifest.");
    if (preview.completion.blockedApproved.length) throw new Error("Resolve required publication information before generating the Codex publication manifest.");
    const dir = resolve(this.root, "data/acd-runtime/publication", String(runId)); const path = resolve(dir, "publication-manifest.json"); const content = JSON.stringify(preview, null, 2);
    mkdirSync(dir, { recursive: true }); if (!existsSync(path) || readFileSync(path, "utf8") !== content) writeFileSync(path, content);
    return { path, content: preview };
  }
  decide(vacancyId: number, action: DecisionAction, edited: unknown, note?: string) {
    if (action === "approved") { const row = this.db.prepare("SELECT f.freshness_status FROM vacancies v LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key WHERE v.id=?").get(vacancyId) as { freshness_status?: string } | undefined; if (row?.freshness_status !== "verified_active") throw new Error("Freshness must be confirmed before approving this vacancy."); }
    this.db.prepare("INSERT OR REPLACE INTO decisions (vacancy_id,action,edited_json,decided_at,reviewer_note) VALUES (?,?,?,?,?)").run(vacancyId, action, JSON.stringify(edited ?? {}), new Date().toISOString(), note ?? null);
  }
  saveReadiness(vacancyId: number, values: Partial<Record<"title" | "location" | "description" | "applicationUrl", string>>, evidenceUrl: string) {
    const allowed = new Set(["title", "location", "description", "applicationUrl"]);
    const entries = Object.entries(values).filter(([key, value]) => allowed.has(key) && typeof value === "string" && value.trim());
    if (!entries.length) throw new Error("Provide at least one factual readiness value.");
    const validUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };
    if (!validUrl(evidenceUrl)) throw new Error("A valid official evidence URL is required.");
    for (const [field, value] of entries) if (field === "applicationUrl" && !validUrl(value)) throw new Error("Application URL must be a valid http(s) URL.");
    const row = this.db.prepare("SELECT edited_json FROM decisions WHERE vacancy_id=?").get(vacancyId) as { edited_json?: string } | undefined;
    if (!row) throw new Error("An editorial decision is required before readiness information can be saved.");
    const prior = row.edited_json ? JSON.parse(row.edited_json) as Record<string, unknown> : {};
    const readiness = { ...((prior.readiness as Record<string, unknown> | undefined) ?? {}), ...Object.fromEntries(entries), evidenceUrl };
    this.db.exec("BEGIN IMMEDIATE");
    try { this.db.prepare("UPDATE decisions SET edited_json=?,decided_at=? WHERE vacancy_id=?").run(JSON.stringify({ ...prior, readiness }), new Date().toISOString(), vacancyId); this.db.exec("COMMIT"); }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  confirmFreshness(vacancyId: number, note?: string, override = false) {
    if (override && !note?.trim()) throw new Error("A reviewer note is required to override a closed or expired vacancy.");
    const vacancy = this.db.prepare("SELECT source_id,source_key FROM vacancies WHERE id=?").get(vacancyId) as { source_id: string; source_key: string } | undefined;
    if (!vacancy) throw new Error("Vacancy was not found.");
    const at = new Date().toISOString();
    this.db.prepare("UPDATE vacancy_freshness SET manual_confirmed_at=?,manual_confirmation_note=?,freshness_status='verified_active',freshness_reason=? WHERE source_id=? AND source_key=?").run(at, note ?? null, override ? "Reviewer override confirmed this vacancy as active for 30 days." : "Reviewer confirmed the official vacancy is active for 30 days.", vacancy.source_id, vacancy.source_key);
  }
  createManifest(): { path: string; content: unknown } {
    const latest = this.db.prepare("SELECT id FROM runs WHERE status='completed' ORDER BY id DESC LIMIT 1").get() as { id: number } | undefined;
    if (!latest) throw new Error("No completed run is available.");
    const unresolved = Number((this.db.prepare("SELECT COUNT(*) AS count FROM vacancies v LEFT JOIN decisions d ON d.vacancy_id=v.id WHERE v.run_id=? AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 AND ((json_extract(v.classification_json,'$.outcome') = 'possible_duplicate' AND (d.action IS NULL OR d.action = 'treat_as_new')) OR (json_extract(v.classification_json,'$.outcome') != 'existing_duplicate' AND d.action IS NULL AND (json_extract(v.classification_json,'$.blocking') = 1 OR json_extract(v.classification_json,'$.outcome') IN ('strong_candidate','borderline'))))").get(latest.id) as { count: number }).count);
    if (unresolved) throw new Error(`${unresolved} candidate or blocking item(s) still need an explicit decision.`);
    const ineligible = Number((this.db.prepare("SELECT COUNT(*) AS count FROM vacancies v JOIN decisions d ON d.vacancy_id=v.id LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key LEFT JOIN research_import_lineage ril ON ril.vacancy_id=v.id WHERE v.run_id=? AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 AND d.action='approved' AND (COALESCE(f.freshness_status,'check_freshness') != 'verified_active' OR (ril.publication_missing_fields_json IS NOT NULL AND json_array_length(ril.publication_missing_fields_json) > 0))").get(latest.id) as { count: number }).count);
    if (ineligible) throw new Error(`${ineligible} approved vacancy/vacancies still need freshness confirmation or required publication fields.`);
    const approved = this.db.prepare("SELECT v.*,d.edited_json FROM vacancies v JOIN decisions d ON d.vacancy_id=v.id JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key LEFT JOIN research_import_lineage ril ON ril.vacancy_id=v.id WHERE v.run_id=? AND COALESCE(json_extract(v.classification_json,'$.archived'),0)=0 AND d.action='approved' AND f.freshness_status='verified_active' AND (ril.publication_missing_fields_json IS NULL OR json_array_length(ril.publication_missing_fields_json)=0)").all(latest.id) as Record<string, unknown>[];
    const content = { generatedAt: new Date().toISOString(), runId: latest.id, approved: approved.map((row: Record<string, unknown>) => ({ ...row, classification: JSON.parse(String(row.classification_json)), edits: JSON.parse(String(row.edited_json)) })), note: "Review manifest only. It does not publish or alter src/data/opportunities.ts." };
    const dir = resolve(this.root, "data/acd-runtime/manifests"); mkdirSync(dir, { recursive: true }); const path = resolve(dir, `run-${latest.id}-publication-manifest.json`);
    writeFileSync(path, JSON.stringify(content, null, 2));
    this.db.prepare("INSERT INTO publication_manifests (run_id,created_at,path,content_json) VALUES (?,?,?,?)").run(latest.id, new Date().toISOString(), path, JSON.stringify(content));
    return { path, content };
  }
  close() { this.db.close(); }
}
