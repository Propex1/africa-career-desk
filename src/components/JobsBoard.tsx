"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addedWithin, visibleOnBoard } from "@/lib/job-freshness";
import type { Opportunity } from "@/types";
import BeehiivNewsletterSection from "./BeehiivNewsletterSection";
import CompactJobCard from "./CompactJobCard";
import { trackFilterUsed, trackSearchUsed } from "@/lib/analytics";
import {
  filterJobsForBoard,
  getJobBoardRecoverySuggestions,
  getJobFilterCounts,
  type JobBoardFilterKey,
  type JobBoardFilters as Filters,
  type JobFilterCounts,
} from "@/lib/job-filters";
import {
  consumeJobBoardScrollPosition,
  EMPTY_JOB_BOARD_FILTERS,
  parseJobBoardState,
  serializeJobBoardState,
} from "@/lib/job-board-state";

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  allLabel: string;
  selected: string[];
  counts: JobFilterCounts;
  onToggle: (value: string) => void;
  onClear: () => void;
  className?: string;
}

function FilterDropdown({
  label,
  icon,
  options,
  allLabel,
  selected,
  counts,
  onToggle,
  onClear,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    const handleEscape = (event: KeyboardEvent) => {if(event.key === "Escape"){setIsOpen(false);ref.current?.querySelector("button")?.focus()}};
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClick);
    return () => {document.removeEventListener("mousedown", handleClick);document.removeEventListener("keydown",handleEscape)};
  }, [isOpen]);

  const hasSelection = selected.length > 0;
  const displayLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? selected[0]
        : `${label} · ${selected.length}`;

  return (
    <div
      ref={ref}
      className={`relative w-full sm:min-w-0 lg:flex-1 lg:min-w-[160px] ${className ?? ""}`}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen((value) => !value)}
        className={`w-full flex items-center justify-between gap-[10px] bg-white border-[1.5px] ${
          hasSelection
            ? "border-acd-border-hover text-acd-green"
            : "border-acd-border-light text-acd-navy"
        } rounded-[12px] px-[15px] py-[13px] text-[14px] font-medium cursor-pointer font-sans hover:border-acd-border-hover transition-colors`}
      >
        <span className="flex items-center gap-[10px] min-w-0">
          {icon}
          <span className="whitespace-normal text-left leading-5 sm:truncate">
            {displayLabel}
          </span>
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
            count={counts.all}
            selected={selected.length === 0}
            onToggle={onClear}
          />
          {options.map((option) => (
            <FilterOption
              key={option}
              label={option}
              count={counts.options[option] ?? 0}
              selected={selected.includes(option)}
              onToggle={() => onToggle(option)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterOption({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const disabled = count === 0 && !selected;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`w-full flex items-center gap-[11px] text-left bg-transparent border-0 rounded-[8px] px-[11px] py-2 text-[13.5px] font-sans transition-colors ${
        disabled
          ? "cursor-not-allowed text-acd-dimmer opacity-55"
          : selected
            ? "cursor-pointer text-acd-green font-semibold hover:bg-[#F0F4F0]"
            : "cursor-pointer text-acd-green-body font-medium hover:bg-[#F0F4F0]"
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
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 rounded-full bg-acd-tag-muted-bg px-2 py-0.5 text-[11px] tabular-nums text-acd-tag-muted-text">
        {count}
      </span>
    </button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-[7px] bg-acd-chip-bg text-acd-chip-text text-[13px] font-semibold pl-[13px] pr-2 py-[6px] rounded-full">
      {label}
      <button
        type="button"
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

const FILTER_LABELS: Record<JobBoardFilterKey, string> = {
  region: "region",
  country: "country",
  roleType: "role type",
  experience: "experience",
  language: "language",
};

interface JobsBoardProps {
  explore: React.ReactNode;
  jobs: Opportunity[];
  regions: string[];
  countries: string[];
  roleTypes: string[];
  experienceBuckets: string[];
  languages: string[];
  initialToday: string;
}

export default function JobsBoard({
  explore,
  jobs,
  regions,
  countries,
  roleTypes,
  experienceBuckets,
  languages,
  initialToday,
}: JobsBoardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_JOB_BOARD_FILTERS);
  const [today, setToday] = useState(initialToday);
  const [addedDays, setAddedDays] = useState(0);
  const [limit, setLimit] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlStateReady, setUrlStateReady] = useState(false);
  const restoredScrollRef = useRef(false);

  const activeJobs = useMemo(
    () => jobs.filter((job) => visibleOnBoard(job, today)),
    [jobs, today]
  );

  useEffect(() => {
    const parsed = parseJobBoardState(new URLSearchParams(window.location.search), {
      regions,
      countries,
      roleTypes,
      experienceBuckets,
      languages,
    });
    setSearch(parsed.search);
    setFilters(parsed.filters);
    const params = new URLSearchParams(window.location.search);
    setAddedDays([7,14].includes(Number(params.get("added"))) ? Number(params.get("added")) : 0);
    setLimit(Math.min(jobs.length || 25, Math.max(25, Number(params.get("shown")) || 25)));
    setToday(new Date().toISOString().slice(0,10));
    setUrlStateReady(true);
  }, [countries, experienceBuckets, languages, regions, roleTypes]);

  useEffect(() => {
    if (!urlStateReady) return;
    const params = serializeJobBoardState({ search, filters, sort: "curated" });
    if (addedDays) params.set("added", String(addedDays));
    if (limit > 25) params.set("shown", String(limit));
    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [filters, search, addedDays, limit, urlStateReady]);

  const toggle = useCallback(
    (key: JobBoardFilterKey, value: string) => {
      setLimit(25);
      setFilters((previous) => {
        const selected = previous[key];
        return {
          ...previous,
          [key]: selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value],
        };
      });
      trackFilterUsed(key, value, "Jobs");
    },
    []
  );

  const clearFilter = useCallback((key: JobBoardFilterKey) => {
    setLimit(25);
    setFilters((previous) => ({ ...previous, [key]: [] }));
  }, []);

  const clearAll = useCallback(() => {
    setLimit(25);
    setAddedDays(0);
    setFilters(EMPTY_JOB_BOARD_FILTERS);
    setSearch("");
  }, []);

  const removeChip = useCallback((key: JobBoardFilterKey, value: string) => {
    setLimit(25);
    setFilters((previous) => ({
      ...previous,
      [key]: previous[key].filter((item) => item !== value),
    }));
  }, []);

  const dateJobs = useMemo(() => activeJobs.filter(job => addedWithin(job, addedDays, today)), [activeJobs, addedDays, today]);
  const filtered = useMemo(() => filterJobsForBoard(dateJobs, filters, search), [dateJobs, filters, search]);

  useEffect(() => {
    if (!urlStateReady || restoredScrollRef.current) return;
    const currentPathAndSearch = `${window.location.pathname}${window.location.search}`;
    const scrollY = consumeJobBoardScrollPosition(currentPathAndSearch);
    if (scrollY === null) return;

    restoredScrollRef.current = true;
    const timer = window.setTimeout(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [filtered.length, urlStateReady]);

  const resultCountRef = useRef(0);
  useEffect(() => {
    resultCountRef.current = filtered.length;
  });

  useEffect(() => {
    const searchQuery = search.trim();
    if (!searchQuery) return;
    const timer = window.setTimeout(() => {
      trackSearchUsed(searchQuery.length, "Jobs", resultCountRef.current);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filterCounts = useMemo(
    () => ({
      region: getJobFilterCounts(dateJobs, filters, search, "region", regions),
      country: getJobFilterCounts(
        dateJobs,
        filters,
        search,
        "country",
        countries
      ),
      roleType: getJobFilterCounts(
        dateJobs,
        filters,
        search,
        "roleType",
        roleTypes
      ),
      experience: getJobFilterCounts(
        dateJobs,
        filters,
        search,
        "experience",
        experienceBuckets
      ),
      language: getJobFilterCounts(
        dateJobs,
        filters,
        search,
        "language",
        languages
      ),
    }),
    [
      dateJobs,
      countries,
      experienceBuckets,
      filters,
      languages,
      regions,
      roleTypes,
      search,
    ]
  );

  const recoverySuggestions = useMemo(
    () => getJobBoardRecoverySuggestions(dateJobs, filters, search),
    [dateJobs, filters, search]
  );

  const query = search.trim().toLowerCase();
  const anyFilter =
    Object.values(filters).some((values) => values.length > 0) || query.length > 0 || addedDays > 0;
  const chips: { key: JobBoardFilterKey; value: string }[] = [];
  (Object.keys(filters) as JobBoardFilterKey[]).forEach((key) => {
    filters[key].forEach((value) => chips.push({ key, value }));
  });

  const applyRecoverySuggestion = (key: JobBoardFilterKey | "search") => {
    if (key === "search") {
      setLimit(25);
      setSearch("");
      return;
    }
    clearFilter(key);
  };

  return (
    <section className="jobs-page">
      <div className="jobs-hero">
        <p className="jobs-eyebrow">Africa Finance &amp; Investment Careers</p>
        <h1>Curated Africa finance &amp; investment opportunities</h1>
        <p className="jobs-description">Private equity, investment banking, infrastructure, development finance, corporate strategy &amp; more.</p>
      </div>

      <div className="jobs-search relative">
        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-acd-green flex">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          aria-label="Search jobs, companies or keywords"
          onChange={(event) => {setLimit(25);setSearch(event.target.value)}}
          placeholder="Search job title, company or keyword"
          className="w-full border-[1.5px] border-acd-border-light bg-white rounded-[16px] py-[21px] pl-[60px] pr-6 text-[17px] text-acd-navy font-sans outline-none shadow-[0_1px_2px_rgba(20,43,63,0.04)] focus:border-acd-border-hover transition-colors"
        />
      </div>

      <button className="jobs-filter-toggle" aria-expanded={filtersOpen} aria-controls="jobs-filters" onClick={()=>setFiltersOpen(!filtersOpen)}>Filters {chips.length + (addedDays ? 1 : 0) > 0 && <span>({chips.length + (addedDays ? 1 : 0)})</span>}</button>
      <div id="jobs-filters" className={`jobs-filters ${filtersOpen ? "is-open" : ""}`}>
        <FilterDropdown
          label="Region"
          icon={RegionIcon}
          options={regions}
          allLabel="All regions"
          selected={filters.region}
          counts={filterCounts.region}
          onToggle={(value) => toggle("region", value)}
          onClear={() => clearFilter("region")}
        />
        <FilterDropdown
          label="Country"
          icon={CountryIcon}
          options={countries}
          allLabel="All countries"
          selected={filters.country}
          counts={filterCounts.country}
          onToggle={(value) => toggle("country", value)}
          onClear={() => clearFilter("country")}
        />
        <FilterDropdown
          label="Role Type"
          icon={RoleIcon}
          options={roleTypes}
          allLabel="All role types"
          selected={filters.roleType}
          counts={filterCounts.roleType}
          onToggle={(value) => toggle("roleType", value)}
          onClear={() => clearFilter("roleType")}
        />
        <FilterDropdown
          label="Experience"
          icon={ExpIcon}
          options={experienceBuckets}
          allLabel="All experience levels"
          selected={filters.experience}
          counts={filterCounts.experience}
          onToggle={(value) => toggle("experience", value)}
          onClear={() => clearFilter("experience")}
        />
        <FilterDropdown
          label="Language"
          icon={LangIcon}
          options={languages}
          allLabel="All languages"
          selected={filters.language}
          counts={filterCounts.language}
          onToggle={(value) => toggle("language", value)}
          onClear={() => clearFilter("language")}
        />
        <select className="jobs-added" aria-label="Added date" value={addedDays} onChange={e=>{setLimit(25);setAddedDays(Number(e.target.value))}}><option value={0}>Added date · All</option><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option></select>
      </div>

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

      <div className="jobs-resultsbar">
        <div className="flex items-center gap-[14px]">
          <p className="m-0 text-[16px] font-semibold text-acd-navy flex items-center gap-[9px]">
            {anyFilter
              ? `${filtered.length} matching ${filtered.length === 1 ? "role" : "roles"}`
              : `${activeJobs.length} live roles`}
            <span className="w-[7px] h-[7px] rounded-full bg-acd-green inline-block" />
          </p>
          {anyFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="bg-transparent border-0 cursor-pointer font-sans text-[14px] text-acd-dim underline underline-offset-[3px] p-0 hover:text-acd-green transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        {addedDays > 0 && <ActiveChip label={`Last ${addedDays} days`} onRemove={()=>{setLimit(25);setAddedDays(0)}}/>}
      </div>

      <div className="jobs-list">
        {filtered.length > 0 ? (
          filtered.slice(0,limit).map((job, index) => (
            <Fragment key={job.id}>
              <CompactJobCard job={job} today={today} />
              {index === 7 && <BeehiivNewsletterSection />}
            </Fragment>
          ))
        ) : (
          <div className="rounded-[18px] border border-acd-border-card bg-white px-5 py-12 text-center text-acd-dimmer">
            <p className="m-0 font-serif text-[24px] text-acd-navy-mid">
              No roles match these filters
            </p>
            <p className="m-0 mt-2 text-[15px]">
              One search or filter may be too restrictive. Try a quick adjustment:
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {recoverySuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.key}
                  onClick={() => applyRecoverySuggestion(suggestion.key)}
                  className="rounded-[10px] border border-acd-border-green bg-white px-4 py-2.5 text-[13.5px] font-semibold text-acd-green transition-colors hover:bg-acd-green hover:text-white"
                >
                  {suggestion.key === "search"
                    ? "Clear search"
                    : `Remove ${FILTER_LABELS[suggestion.key]} filter`}
                  {` · ${suggestion.count} roles`}
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="rounded-[10px] bg-acd-green px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-acd-green-dark"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {filtered.length > 0 && <div className="jobs-pagination"><p aria-live="polite">Showing {Math.min(limit,filtered.length)} of {filtered.length} roles</p>{limit < filtered.length && <button onClick={()=>setLimit(current=>current+25)}>Show more jobs</button>}</div>}
      <div className="jobs-explore">{explore}</div>

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
        Each role links to its employer or documented recruitment source.
      </p>
    </section>
  );
}
