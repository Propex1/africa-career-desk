"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CAREER_AREAS, DEFAULT_EXPANDED_CAREER_AREA, careerFilterLabel } from "@/data/career-taxonomy";
import type { JobFilterCounts } from "@/lib/job-filters";

export default function CareerAreaFilter({ selected, counts, onToggle, onClear }: {
  selected: readonly string[];
  counts: JobFilterCounts;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([DEFAULT_EXPANDED_CAREER_AREA]);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const checkbox = (id: string, label: string, checked: boolean, partial = false) => (
    <label className={`career-option ${checked ? "is-selected" : ""}`}>
      <input type="checkbox" checked={checked} aria-checked={partial ? "mixed" : checked}
        ref={element => { if (element) element.indeterminate = partial; }}
        onChange={() => id === "all" ? onClear() : onToggle(id)} />
      <span>{label}</span><span className="career-count">{id === "all" ? counts.all : counts.options[id] ?? 0}</span>
    </label>
  );

  return <div className="career-filter" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button type="button" ref={trigger} aria-expanded={open} aria-controls={menuId}
      aria-label="Career Area" className={`career-trigger ${selected.length ? "is-selected" : ""}`}
      onClick={() => setOpen(value => !value)}>
      <span className="career-trigger-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3"/></svg>
        <span>{selected.length === 1 ? careerFilterLabel(selected[0]) : `Career Area${selected.length ? ` · ${selected.length}` : ""}`}</span></span>
      <svg className="career-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div id={menuId} className="career-menu" role="group" aria-label="Career areas and subcategories">
      {checkbox("all", "All career areas", selected.length === 0)}
      {CAREER_AREAS.map(area => {
        const checked = selected.includes(area.id) || area.subcategories.every(item => selected.includes(item.id));
        const partial = !checked && area.subcategories.some(item => selected.includes(item.id));
        const isExpanded = expanded.includes(area.id);
        return <div key={area.id} className="career-group">
          <div className="career-parent">
            {checkbox(area.id, area.label, checked, partial)}
            <button type="button" className="career-expand" aria-label={`${isExpanded ? "Collapse" : "Expand"} ${area.label}`}
              aria-expanded={isExpanded} aria-controls={`${menuId}-${area.id}`} onClick={() => setExpanded(previous =>
                previous.includes(area.id) ? previous.filter(id => id !== area.id) : [...previous, area.id])}>
              <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
            </button>
          </div>
          {isExpanded && <div className="career-children" id={`${menuId}-${area.id}`} role="group" aria-label={`${area.label} subcategories`}>
            {area.subcategories.map(item => <div key={item.id}>{checkbox(item.id, item.label, selected.includes(area.id) || selected.includes(item.id))}</div>)}
          </div>}
        </div>;
      })}
      <div className="career-unclassified">{checkbox("unclassified", "Awaiting classification", selected.includes("unclassified"))}</div>
    </div>}
  </div>;
}
