import type { RecruitmentConfig } from "./recruitment-config";
import { configTextFields } from "./recruitment-config";
export function publicationChanges(before: RecruitmentConfig, after: RecruitmentConfig) {
  const changes: { label: string; before: string; after: string }[] = [];
  for (const [key, label] of configTextFields) {
    if (before[key] !== after[key]) changes.push({ label, before: before[key], after: after[key] });
  }
  for (const mode of ["tdm", "zm_hmx", "escape"] as const) {
    for (const key of ["approved", "description", "rules", "maps"] as const) {
      const display = (value: string | boolean | string[]) => Array.isArray(value) ? value.join("\n") : typeof value === "boolean" ? value ? "Approved" : "Not approved" : value;
      const previous = display(before.modes[mode][key]), next = display(after.modes[mode][key]);
      if (previous !== next) changes.push({ label: `${mode === "zm_hmx" ? "ZM HMX" : mode.toUpperCase()} · ${key}`, before: previous, after: next });
    }
  }
  return changes;
}
