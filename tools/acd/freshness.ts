import { createHash } from "node:crypto";
import type { CollectedVacancy, FreshnessStatus } from "./types.ts";

export const FRESHNESS_CONFIRMATION_DAYS = 30;

export type FreshnessInput = Pick<CollectedVacancy, "publishedAt" | "deadline" | "applicationRouteStatus"> & {
  sourcePresent?: boolean;
  explicitlyClosed?: boolean;
  manualConfirmedAt?: string | null;
  now?: Date;
};

export type FreshnessAssessment = { status: FreshnessStatus; reason: string; ageDays?: number; confirmationValid: boolean };

const date = (value?: string | null) => value ? new Date(value) : undefined;
const startOfDay = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

export function confirmationIsValid(value: string | null | undefined, now = new Date()): boolean {
  const confirmed = date(value);
  return Boolean(confirmed && now.getTime() - confirmed.getTime() <= FRESHNESS_CONFIRMATION_DAYS * 86400000);
}

export function assessFreshness(input: FreshnessInput): FreshnessAssessment {
  const now = input.now ?? new Date();
  const confirmationValid = confirmationIsValid(input.manualConfirmedAt, now);
  const deadline = date(input.deadline);
  const posted = date(input.publishedAt);
  const route = input.applicationRouteStatus ?? "unknown";
  if (input.explicitlyClosed || (deadline && startOfDay(deadline) < startOfDay(now))) return { status: "closed_expired", reason: deadline ? "Official deadline has passed." : "Official source reports this vacancy as closed.", confirmationValid };
  if (confirmationValid) return { status: "verified_active", reason: "Reviewer confirmed the official vacancy is active within the last 30 days.", confirmationValid };
  if (route !== "available") return { status: "check_freshness", reason: route === "broken" ? "Official application route could not be verified." : "Official application route has not been verified.", confirmationValid };
  if (deadline && startOfDay(deadline) >= startOfDay(now)) return { status: "verified_active", reason: "Future official deadline and working application route.", confirmationValid };
  if (!posted) return { status: "check_freshness", reason: input.sourcePresent ? "Official listing remains available, but no posting date was provided." : "Posting date is unavailable.", confirmationValid };
  const ageDays = Math.floor((startOfDay(now) - startOfDay(posted)) / 86400000);
  if (ageDays <= 60) return { status: "verified_active", reason: `Official listing is ${ageDays} days old and the application route works.`, ageDays, confirmationValid };
  return { status: "check_freshness", reason: `Official listing is ${ageDays} days old and needs editorial freshness confirmation.`, ageDays, confirmationValid };
}

export function contentFingerprint(vacancy: CollectedVacancy): string {
  return createHash("sha256").update([vacancy.title, vacancy.location, vacancy.department, vacancy.description, vacancy.employmentType, vacancy.requisitionId, vacancy.applyUrl].map((value) => value ?? "").join("\n")).digest("hex");
}

export function isGenuineRepost(previous: Pick<CollectedVacancy, "publishedAt" | "requisitionId" | "title" | "description">, current: Pick<CollectedVacancy, "publishedAt" | "requisitionId" | "title" | "description">): boolean {
  return Boolean((previous.requisitionId && current.requisitionId && previous.requisitionId !== current.requisitionId) || (previous.publishedAt && current.publishedAt && previous.publishedAt !== current.publishedAt));
}
