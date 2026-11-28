"use client";

export default function JobFilterOption({ label, count, selected, onToggle, disabled = false }: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <label className={`jobs-filter-option ${disabled ? "is-disabled" : ""} ${selected ? "is-selected" : ""}`}>
      <input type="checkbox" checked={selected} disabled={disabled} onChange={onToggle} />
      <span>{label}</span>
      <span className="jobs-filter-count" aria-hidden="true">{count}</span>
    </label>
  );
}
