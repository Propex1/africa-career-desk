"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Opportunity } from "@/types";
import JobCard from "./JobCard";
import { trackFilterUsed, trackSearchUsed } from "@/lib/analytics";

// ── Filter Dropdown ───────────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  allLabel: string;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}

function FilterDropdown({
  label,
  icon,
  options,
  allLabel,
  selected,
  onToggle,
  onClear,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const hasSelection = selected.length > 0;
  const displayLabel =
    selected.length === 0
      ? label
      : selected.length === 1
      ? selected[0]
      : `${label} · ${selected.length}`;

  return (
    <div ref={ref} className="relative flex-1 min-w-[160px]">
      <button
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-[10px] bg-white border-[1.5px] ${
          hasSelection
            ? "border-acd-border-hover text-acd-green"
            : "border-acd-border-light text-acd-navy"
        } rounded-[12px] px-[15px] py-[13px] text-[14px] font-medium cursor-pointer font-sans hover:border-acd-border-hover transition-colors`}
      >
        <span className="flex items-center gap-[10px] min-w-0">
          {icon}
          <span className="truncate">{displayLabel}</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9AA6AB"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-acd-border-dropdown rounded-[14px] shadow-[0_14px_34px_-16px_rgba(20,43,63,0.22)] p-[7px] z-50 max-h-[300px] overflow-auto"
          style={{ minWidth: "100%" }}
        >
          <FilterOption
            label={allLabel}
            selected={selected.length === 0}
            onToggle={onClear}
          />
          {options.map((opt) => (
            <FilterOption
              key={opt}
              label={opt}
              selected={selected.includes(opt)}
              onToggle={() => onToggle(opt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterOption({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onToggle}
      className={`w-full flex items-center gap-[11px] text-left bg-transparent border-0 rounded-[8px] px-[11px] py-2 text-[13.5px] cursor-pointer font-sans hover:bg-[#F0F4F0] transition-colors ${
        selected ? "text-acd-green font-semibold" : "text-acd-green-body font-medium"
      }`}
    >
      <span
        className={`w-[18px] h-[18px] rounded-[5px] border-[1.6px] flex items-center justify-center shrink-0 transition-colors ${
          selected
            ? "border-acd-green bg-acd-green"
            : "border-[#CBD3CE] bg-white"
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: selected ? 1 : 0 }}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      {label}
    </button>
  );
}

// ── Active chips ──────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  onRemove: () => void;
}

function ActiveChip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-[7px] bg-acd-chip-bg text-acd-chip-text text-[13px] font-semibold pl-[13px] pr-2 py-[6px] rounded-full">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="w-[18px] h-[18px] flex items-center justify-center border-0 bg-acd-chip-remove rounded-full cursor-pointer text-acd-chip-text p-0 hover:bg-acd-border-hover transition-colors"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
}: {
  value: "recent" | "deadline";
  onChange: (v: "recent" | "deadline") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const OPTS: { label: string; value: "recent" | "deadline" }[] = [
    { label: "Most recent", value: "recent" },
    { label: "Closing soon", value: "deadline" },
  ];

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      <span className="text-[14px] text-acd-dimmer">Sort by</span>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 bg-white border-[1.5px] border-acd-border-light rounded-[10px] px-[15px] py-[11px] text-[14px] text-acd-navy font-medium cursor-pointer font-sans min-w-[150px] justify-between hover:border-acd-border-hover transition-colors"
      >
        {OPTS.find((o) => o.value === value)?.label}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9AA6AB"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-white border border-acd-border-dropdown rounded-[14px] shadow-[0_14px_34px_-16px_rgba(20,43,63,0.22)] p-[7px] z-50 min-w-[160px]">
          {OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left border-0 rounded-[8px] px-[11px] py-2 text-[13.5px] cursor-pointer font-sans hover:bg-[#F0F4F0] transition-colors ${
                value === opt.value
                  ? "bg-[#EEF4EF] text-acd-green font-semibold"
                  : "bg-transparent text-acd-green-body font-medium"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Deadline parser ───────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function deadlineMs(s?: string): number {
  if (!s) return Infinity;
  const [day, mon, year] = s.split(" ");
  const m = MONTHS[mon];
  if (m === undefined) return Infinity;
  return new Date(parseInt(year), m, parseInt(day)).getTime();
}

// ── Filter icons ──────────────────────────────────────────────────────────────

const RegionIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16522A" strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
  </svg>
);

const CountryIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16522A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);

const RoleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16522A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const ExpIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16522A" strokeWidth="2" strokeLinecap="round">
    <path d="M5 20V11M12 20V4M19 20v-6" />
  </svg>
);

const LangIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16522A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h8M8 4v2c0 4-1.8 6.6-4 8M5 9c.7 2 2.4 3.4 4.5 4.2" />
    <path d="M13 20l4-9 4 9M14.6 16.4h4.8" />
  </svg>
);

// ── Main board ────────────────────────────────────────────────────────────────

interface JobsBoardProps {
  jobs: Opportunity[];
  regions: string[];
  countries: string[];
  roleTypes: string[];
  experienceBuckets: string[];
  languages: string[];
}

type Filters = {
  region: string[];
  country: string[];
  roleType: string[];
  experience: string[];
  language: string[];
};

export default function JobsBoard({
  jobs,
  regions,
  countries,
  roleTypes,
  experienceBuckets,
  languages,
}: JobsBoardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    region: [],
    country: [],
    roleType: [],
    experience: [],
    language: [],
  });
  const [sort, setSort] = useState<"recent" | "deadline">("recent");

  const toggle = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => {
        const arr = prev[key];
        return {
          ...prev,
          [key]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      });
      trackFilterUsed(key, value, "Jobs");
    },
    []
  );

  const clearFilter = useCallback((key: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ region: [], country: [], roleType: [], experience: [], language: [] });
    setSearch("");
  }, []);

  const removeChip = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => ({
        ...prev,
        [key]: prev[key].filter((v) => v !== value),
      }));
    },
    []
  );

  const handleSort = useCallback((value: "recent" | "deadline") => {
    setSort(value);
    trackFilterUsed("sort", value, "Jobs");
  }, []);

  const q = search.trim().toLowerCase();

  const filtered = jobs
    .filter((j) => {
      if (filters.region.length && !filters.region.includes(j.region ?? "")) return false;
      if (filters.country.length && !filters.country.includes(j.country ?? "")) return false;
      if (filters.roleType.length && !filters.roleType.includes(j.roleType)) return false;
      if (filters.experience.length && !filters.experience.includes(j.experienceBucket ?? "")) return false;
      if (filters.language.length && !(j.languageTags ?? []).some((t) => filters.language.includes(t))) return false;
      if (q) {
        const hay = [j.title, j.company, j.city ?? "", j.country ?? "", j.region ?? "", j.roleType]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "deadline") return deadlineMs(a.deadlineDisplay) - deadlineMs(b.deadlineDisplay);
      return 0;
    });

  // Track search usage once the user pauses typing, with the live result count.
  const resultCountRef = useRef(0);
  useEffect(() => {
    resultCountRef.current = filtered.length;
  });

  useEffect(() => {
    const query = search.trim();
    if (!query) return;
    const timer = setTimeout(() => {
      trackSearchUsed(query.length, "Jobs", resultCountRef.current);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const anyFilter =
    Object.values(filters).some((arr) => arr.length > 0) || q.length > 0;

  // Build active chips
  const chips: { key: keyof Filters; value: string }[] = [];
  (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
    filters[key].forEach((value) => chips.push({ key, value }));
  });

  return (
    <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-[54px_20px] md:py-[54px_32px]">
      {/* Hero */}
      <p className="m-0 mb-4 text-[13px] font-semibold tracking-[2.4px] text-acd-green uppercase">
        Curated Africa Careers
      </p>
      <h1 className="m-0 font-serif font-medium text-[clamp(36px,6vw,58px)] leading-[1.04] tracking-[-1px] text-acd-navy max-w-[760px]">
        Premium Africa finance &amp; investment roles
      </h1>
      <p className="mt-[22px] text-[18px] leading-relaxed text-acd-muted max-w-[620px]">
        Carefully selected opportunities in private equity, DFI, infrastructure,
        venture capital, climate finance and strategic finance across Africa.
      </p>

      {/* Search */}
      <div className="mt-10 relative">
        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-acd-green flex">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job title, company or keyword"
          className="w-full border-[1.5px] border-acd-border-light bg-white rounded-[16px] py-[21px] pl-[60px] pr-6 text-[17px] text-acd-navy font-sans outline-none shadow-[0_1px_2px_rgba(20,43,63,0.04)] focus:border-acd-border-hover transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="mt-[18px] flex flex-wrap gap-3">
        <FilterDropdown
          label="Region"
          icon={RegionIcon}
          options={regions}
          allLabel="All regions"
          selected={filters.region}
          onToggle={(v) => toggle("region", v)}
          onClear={() => clearFilter("region")}
        />
        <FilterDropdown
          label="Country"
          icon={CountryIcon}
          options={countries}
          allLabel="All countries"
          selected={filters.country}
          onToggle={(v) => toggle("country", v)}
          onClear={() => clearFilter("country")}
        />
        <FilterDropdown
          label="Role Type"
          icon={RoleIcon}
          options={roleTypes}
          allLabel="All role types"
          selected={filters.roleType}
          onToggle={(v) => toggle("roleType", v)}
          onClear={() => clearFilter("roleType")}
        />
        <FilterDropdown
          label="Experience"
          icon={ExpIcon}
          options={experienceBuckets}
          allLabel="All experience levels"
          selected={filters.experience}
          onToggle={(v) => toggle("experience", v)}
          onClear={() => clearFilter("experience")}
        />
        <FilterDropdown
          label="Language"
          icon={LangIcon}
          options={languages}
          allLabel="All languages"
          selected={filters.language}
          onToggle={(v) => toggle("language", v)}
          onClear={() => clearFilter("language")}
        />
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="mt-[14px] flex flex-wrap gap-2 items-center">
          {chips.map(({ key, value }) => (
            <ActiveChip
              key={`${key}:${value}`}
              label={value}
              onRemove={() => removeChip(key, value)}
            />
          ))}
        </div>
      )}

      {/* Count + sort */}
      <div className="mt-[34px] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-[14px]">
          <p className="m-0 text-[16px] font-semibold text-acd-navy flex items-center gap-[9px]">
            {anyFilter
              ? `${filtered.length} matching ${filtered.length === 1 ? "role" : "roles"}`
              : `${jobs.length} live roles`}
            <span className="w-[7px] h-[7px] rounded-full bg-acd-green inline-block" />
          </p>
          {anyFilter && (
            <button
              onClick={clearAll}
              className="bg-transparent border-0 cursor-pointer font-sans text-[14px] text-acd-dim underline underline-offset-[3px] p-0 hover:text-acd-green transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <SortDropdown value={sort} onChange={handleSort} />
      </div>

      {/* Job cards */}
      <div className="mt-[18px] flex flex-col gap-[14px]">
        {filtered.length > 0 ? (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <div className="text-center py-[60px] px-5 text-acd-dimmer">
            <p className="font-serif text-[22px] text-acd-navy-mid m-0 mb-[6px]">
              No roles match these filters
            </p>
            <p className="m-0 text-[15px]">
              Try widening your region or role type, or{" "}
              <button
                onClick={clearAll}
                className="bg-transparent border-0 text-acd-green font-semibold cursor-pointer underline underline-offset-[3px] font-sans text-[15px] p-0 hover:text-acd-green-dark"
              >
                clear all filters
              </button>
              .
            </p>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-[30px] text-center text-[14px] text-acd-dimmer flex items-center justify-center gap-[9px]">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16522A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        All roles link to the official employer page.
      </p>
    </section>
  );
}
