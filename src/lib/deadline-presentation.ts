/** Display only: never parse a date or change lifecycle / deadline evidence. */
export function deadlinePresentation(display?: string): { label: string; value: string } | undefined {
  const value = display?.trim();
  if (!value) return undefined;

  // Keep exclusive "before" wording distinct from inclusive "by" wording.
  // "Valid through" can be source metadata, so do not rename it a closing date.
  const prefixed = /^(Apply before|Apply by|Before|Valid through|Closes|Deadline)\s+(.+)$/i.exec(value);
  if (prefixed) {
    const labels: Record<string, string> = {
      "apply before": "Apply before",
      "apply by": "Apply by",
      before: "Apply before",
      "valid through": "Valid through",
      closes: "Closes",
      deadline: "Deadline",
    };
    return { label: labels[prefixed[1].toLowerCase()], value: prefixed[2] };
  }

  return { label: "Closes", value };
}
