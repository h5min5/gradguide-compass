import type { StudentProfile } from "./types";

export const EMPTY_PROFILE: StudentProfile = {
  name: "",
  degree: "",
  fieldOfStudy: "",
  academicScore: "",
  graduationYear: "",
  careerGoal: "",
  interests: "",
  preferredCountry: "",
  secondaryCountry: "",
  maxTuitionBudget: "",
  budgetCurrency: "EUR",
  desiredCourseArea: "",
  preferredIntake: "",
  ielts: "",
  toefl: "",
  gre: "",
  experience: "",
};

export const DEMO_PROFILE: StudentProfile = {
  name: "Demo Student",
  degree: "B.E. Artificial Intelligence and Data Science",
  fieldOfStudy: "Artificial Intelligence and Data Science",
  academicScore: "9.1/10",
  graduationYear: "",
  careerGoal: "Machine Learning Engineer",
  interests: "AI, Machine Learning, NLP",
  preferredCountry: "Ireland",
  secondaryCountry: "United Kingdom",
  maxTuitionBudget: "35000",
  budgetCurrency: "EUR",
  desiredCourseArea: "",
  preferredIntake: "September",
  ielts: "",
  toefl: "",
  gre: "",
  experience: "",
};

const PROFILE_KEYS = Object.keys(EMPTY_PROFILE) as (keyof StudentProfile)[];

export function isProfile(value: unknown): value is StudentProfile {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return PROFILE_KEYS.every((key) => key in record);
}

export function sanitizeProfile(value: unknown): StudentProfile {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const next: StudentProfile = { ...EMPTY_PROFILE };
  for (const key of PROFILE_KEYS) {
    if (key === "budgetCurrency") continue;
    const raw = source[key];
    if (typeof raw === "string") next[key] = raw.slice(0, 240);
  }
  if (source.budgetCurrency === "EUR" || source.budgetCurrency === "GBP" || source.budgetCurrency === "USD") {
    next.budgetCurrency = source.budgetCurrency;
  }
  return next;
}

export function profileCompleteness(profile: StudentProfile): {
  filled: number;
  total: number;
  percent: number;
} {
  const fields = PROFILE_KEYS.filter((key) => key !== "budgetCurrency");
  const filled = fields.filter((key) => profile[key].trim().length > 0).length;
  return {
    filled,
    total: fields.length,
    percent: Math.round((filled / fields.length) * 100),
  };
}

export function parseLooseNumber(value: string): number | null {
  const match = value.trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}
