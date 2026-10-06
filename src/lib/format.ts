import type { EligibilityStatus, StabilityLabel } from "./types";

export function eligibilityLabel(status: EligibilityStatus): string {
  if (status === "LIKELY_COMPATIBLE") return "Likely compatible";
  if (status === "NEEDS_VERIFICATION") return "Needs verification";
  return "Requirement mismatch";
}

export function stabilityLabel(label: StabilityLabel): string {
  if (label === "HIGH") return "High stability";
  if (label === "MEDIUM") return "Medium stability";
  return "Low stability";
}

export function eligibilityTone(status: EligibilityStatus): string {
  if (status === "LIKELY_COMPATIBLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "NEEDS_VERIFICATION") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export function stabilityTone(label: StabilityLabel): string {
  if (label === "HIGH") return "border-teal-200 bg-teal-50 text-teal-900";
  if (label === "MEDIUM") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-orange-200 bg-orange-50 text-orange-900";
}
