import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { employers, sources } from "./registry.ts";
import type { Classification, CollectedVacancy, DecisionAction, DuplicateMatch, SourceResult } from "./types.ts";
import { normalizeUrl } from "./normalize.ts";
import { existingMetadata } from "./existing.ts";
import { assessFreshness, contentFingerprint } from "./freshness.ts";

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
    for (const id of ["001_initial", "002_add_department", "003_add_freshness"]) {
      if (this.db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(id)) continue;
      this.db.exec(readFileSync(resolve(this.root, `tools/acd/migrations/${id}.sql`), "utf8"));
      this.db.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(id, new Date().toISOString());
    }
  }
  private seedRegistry() {
    const employer = this.db.prepare("INSERT OR REPLACE INTO employers (id,name,aliases_json,logo_url) VALUES (?,?,?,?)");
    for (const item of employers) employer.run(item.id, item.name, JSON.stringify(item.aliases), item.logoUrl ?? null);
    const source = this.db.prepare("INSERT OR REPLACE INTO sources (id,employer_id,source_type,url,priority,required,active,access_method,last_verified,expected_coverage,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const item of sources) source.run(item.id, item.employerId, item.type, item.url, item.priority, Number(item.required), Number(item.active), item.accessMethod, item.lastVerified, item.expectedCoverage, item.notes);
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
  workableVacancies() { return this.db.prepare("SELECT id,requisition_id AS requisitionId FROM vacancies WHERE source_id='afreximbank-workable' AND requisition_id IS NOT NULL").all() as Array<{ id: number; requisitionId: string }>; }
  updateReviewerUrl(vacancyId: number, applyUrl: string) { this.db.prepare("UPDATE vacancies SET apply_url=?, normalized_apply_url=? WHERE id=?").run(applyUrl, normalizeUrl(applyUrl), vacancyId); }
  private refreshFreshnessAssessments() {
    const rows = this.db.prepare("SELECT source_id,source_key,official_posted_at,official_deadline,application_route_status,manual_confirmed_at FROM vacancy_freshness").all() as Array<{ source_id: string; source_key: string; official_posted_at?: string; official_deadline?: string; application_route_status: "available" | "broken" | "unknown"; manual_confirmed_at?: string }>;
    const update = this.db.prepare("UPDATE vacancy_freshness SET freshness_status=?,freshness_reason=? WHERE source_id=? AND source_key=?");
    for (const row of rows) { const assessed = assessFreshness({ publishedAt: row.official_posted_at, deadline: row.official_deadline, applicationRouteStatus: row.application_route_status, sourcePresent: true, manualConfirmedAt: row.manual_confirmed_at }); update.run(assessed.status, assessed.reason, row.source_id, row.source_key); }
  }
  dashboard() {
    this.refreshFreshnessAssessments();
    const latest = this.db.prepare("SELECT * FROM runs ORDER BY id DESC LIMIT 1").get() as Record<string, unknown> | undefined;
    if (!latest) return { run: null, checks: [], vacancies: [], totals: {} };
    const runId = latest.id as number;
    const checks = this.db.prepare("SELECT sc.*,s.url,s.source_type,e.name AS employer_name FROM source_checks sc JOIN sources s ON s.id=sc.source_id JOIN employers e ON e.id=s.employer_id WHERE sc.run_id=? ORDER BY s.priority,s.id").all(runId);
    const vacancies = this.db.prepare("SELECT v.*,e.name AS employer_name,e.logo_url,d.action,d.edited_json,d.reviewer_note,f.first_seen_at,f.last_successfully_seen_at,f.last_checked_at,f.official_posted_at,f.official_deadline,f.content_fingerprint,f.application_route_status,f.freshness_status,f.freshness_reason,f.manual_confirmed_at,f.manual_confirmation_note,(SELECT COUNT(*) FROM duplicate_matches dm WHERE dm.vacancy_id=v.id) AS duplicate_count FROM vacancies v JOIN employers e ON e.id=v.employer_id LEFT JOIN decisions d ON d.vacancy_id=v.id LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key WHERE v.run_id=? ORDER BY v.id DESC").all(runId) as Array<Record<string, unknown>>;
    const matches = this.db.prepare("SELECT vacancy_id AS vacancyId,kind,basis,external_reference AS externalReference,detail FROM duplicate_matches WHERE vacancy_id IN (SELECT id FROM vacancies WHERE run_id=?)").all(runId) as Array<{ vacancyId: number; kind: string; basis: string; externalReference?: string; detail: string }>;
    const decoratedVacancies = vacancies.map((vacancy) => ({ ...vacancy, duplicateMatches: matches.filter((match) => match.vacancyId === vacancy.id).map((match) => ({ ...match, existing: existingMetadata(this.root, match.externalReference) })) }));
    return { run: latest, totals: this.db.prepare("SELECT json_extract(classification_json,'$.outcome') AS outcome, COUNT(*) AS count FROM vacancies WHERE run_id=? GROUP BY outcome").all(runId), checks, vacancies: decoratedVacancies };
  }
  decide(vacancyId: number, action: DecisionAction, edited: unknown, note?: string) {
    if (action === "approved") { const row = this.db.prepare("SELECT f.freshness_status FROM vacancies v LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key WHERE v.id=?").get(vacancyId) as { freshness_status?: string } | undefined; if (row?.freshness_status !== "verified_active") throw new Error("Freshness must be confirmed before approving this vacancy."); }
    this.db.prepare("INSERT OR REPLACE INTO decisions (vacancy_id,action,edited_json,decided_at,reviewer_note) VALUES (?,?,?,?,?)").run(vacancyId, action, JSON.stringify(edited ?? {}), new Date().toISOString(), note ?? null);
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
    const unresolved = Number((this.db.prepare("SELECT COUNT(*) AS count FROM vacancies v LEFT JOIN decisions d ON d.vacancy_id=v.id WHERE v.run_id=? AND ((json_extract(v.classification_json,'$.outcome') = 'possible_duplicate' AND (d.action IS NULL OR d.action = 'treat_as_new')) OR (json_extract(v.classification_json,'$.outcome') != 'existing_duplicate' AND d.action IS NULL AND (json_extract(v.classification_json,'$.blocking') = 1 OR json_extract(v.classification_json,'$.outcome') IN ('strong_candidate','borderline'))))").get(latest.id) as { count: number }).count);
    if (unresolved) throw new Error(`${unresolved} candidate or blocking item(s) still need an explicit decision.`);
    const ineligible = Number((this.db.prepare("SELECT COUNT(*) AS count FROM vacancies v JOIN decisions d ON d.vacancy_id=v.id LEFT JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key WHERE v.run_id=? AND d.action='approved' AND COALESCE(f.freshness_status,'check_freshness') != 'verified_active'").get(latest.id) as { count: number }).count);
    if (ineligible) throw new Error(`${ineligible} approved vacancy/vacancies still need freshness confirmation.`);
    const approved = this.db.prepare("SELECT v.*,d.edited_json FROM vacancies v JOIN decisions d ON d.vacancy_id=v.id JOIN vacancy_freshness f ON f.source_id=v.source_id AND f.source_key=v.source_key WHERE v.run_id=? AND d.action='approved' AND f.freshness_status='verified_active'").all(latest.id) as Record<string, unknown>[];
    const content = { generatedAt: new Date().toISOString(), runId: latest.id, approved: approved.map((row: Record<string, unknown>) => ({ ...row, classification: JSON.parse(String(row.classification_json)), edits: JSON.parse(String(row.edited_json)) })), note: "Review manifest only. It does not publish or alter src/data/opportunities.ts." };
    const dir = resolve(this.root, "data/acd-runtime/manifests"); mkdirSync(dir, { recursive: true }); const path = resolve(dir, `run-${latest.id}-publication-manifest.json`);
    writeFileSync(path, JSON.stringify(content, null, 2));
    this.db.prepare("INSERT INTO publication_manifests (run_id,created_at,path,content_json) VALUES (?,?,?,?)").run(latest.id, new Date().toISOString(), path, JSON.stringify(content));
    return { path, content };
  }
  close() { this.db.close(); }
}
