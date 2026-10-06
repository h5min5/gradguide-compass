"use client";

import type { ReactNode } from "react";
import { COUNSELLING_COUNTRIES } from "@/lib/countries";
import { profileCompleteness } from "@/lib/profile";
import type { CurrencyCode, StudentProfile } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand";

const COUNTRIES = ["", ...COUNSELLING_COUNTRIES];
const INTAKES = ["", "September", "January", "February", "March", "July", "October", "May"];
const AREAS = [
  "",
  "Artificial Intelligence",
  "Data Science",
  "Computer Science",
  "Software Engineering",
  "Cybersecurity",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ProfilePanel({
  profile,
  meetingMode,
  onChange,
  onDemo,
  onClear,
}: {
  profile: StudentProfile;
  meetingMode: boolean;
  onChange: (profile: StudentProfile) => void;
  onDemo: () => void;
  onClear: () => void;
}) {
  const completeness = profileCompleteness(profile);
  const set = (key: keyof StudentProfile, value: string) =>
    onChange({ ...profile, [key]: value });

  const form = (
    <div className="space-y-3">
      <Field label="Name">
        <input className={inputClass} value={profile.name} onChange={(event) => set("name", event.target.value)} />
      </Field>
      <Field label="Degree">
        <input className={inputClass} value={profile.degree} placeholder="B.E. Artificial Intelligence and Data Science" onChange={(event) => set("degree", event.target.value)} />
      </Field>
      <Field label="Field of study">
        <input className={inputClass} value={profile.fieldOfStudy} onChange={(event) => set("fieldOfStudy", event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CGPA / percentage">
          <input className={inputClass} value={profile.academicScore} placeholder="9.1/10" onChange={(event) => set("academicScore", event.target.value)} />
        </Field>
        <Field label="Graduation year">
          <input className={inputClass} value={profile.graduationYear} placeholder="2025" onChange={(event) => set("graduationYear", event.target.value)} />
        </Field>
      </div>
      <Field label="Career goal">
        <input className={inputClass} value={profile.careerGoal} placeholder="Machine Learning Engineer" onChange={(event) => set("careerGoal", event.target.value)} />
      </Field>
      <Field label="Interests">
        <input className={inputClass} value={profile.interests} placeholder="AI, Machine Learning, NLP" onChange={(event) => set("interests", event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Preferred country">
          <select className={inputClass} value={profile.preferredCountry} onChange={(event) => set("preferredCountry", event.target.value)}>
            {COUNTRIES.map((country) => (
              <option key={country || "none"} value={country}>{country || "Not specified"}</option>
            ))}
          </select>
        </Field>
        <Field label="Secondary country">
          <select className={inputClass} value={profile.secondaryCountry} onChange={(event) => set("secondaryCountry", event.target.value)}>
            {COUNTRIES.map((country) => (
              <option key={country || "none"} value={country}>{country || "Not specified"}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <Field label="Maximum tuition budget">
          <input className={inputClass} inputMode="decimal" value={profile.maxTuitionBudget} placeholder="35000" onChange={(event) => set("maxTuitionBudget", event.target.value)} />
        </Field>
        <Field label="Currency">
          <select className={inputClass} value={profile.budgetCurrency} onChange={(event) => set("budgetCurrency", event.target.value as CurrencyCode)}>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
        </Field>
      </div>
      <Field label="Desired course area">
        <select className={inputClass} value={profile.desiredCourseArea} onChange={(event) => set("desiredCourseArea", event.target.value)}>
          {AREAS.map((area) => (
            <option key={area || "none"} value={area}>{area || "Not specified"}</option>
          ))}
        </select>
      </Field>
      <Field label="Preferred intake">
        <select className={inputClass} value={profile.preferredIntake} onChange={(event) => set("preferredIntake", event.target.value)}>
          {INTAKES.map((intake) => (
            <option key={intake || "none"} value={intake}>{intake || "Not specified"}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="IELTS">
          <input className={inputClass} value={profile.ielts} placeholder="Optional" onChange={(event) => set("ielts", event.target.value)} />
        </Field>
        <Field label="TOEFL">
          <input className={inputClass} value={profile.toefl} placeholder="Optional" onChange={(event) => set("toefl", event.target.value)} />
        </Field>
        <Field label="GRE">
          <input className={inputClass} value={profile.gre} placeholder="Optional" onChange={(event) => set("gre", event.target.value)} />
        </Field>
      </div>
      <Field label="Work / internship experience">
        <textarea className={`${inputClass} min-h-16 resize-y`} value={profile.experience} onChange={(event) => set("experience", event.target.value)} />
      </Field>
    </div>
  );

  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Student profile</h2>
          <span className="text-xs text-muted">{completeness.percent}% complete</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
          <div className="h-full rounded-full bg-brand" style={{ width: `${completeness.percent}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          {completeness.filled} of {completeness.total} fields. Recommendations run with a partial profile.
        </p>
        <div className="mt-3 flex gap-2">
          {!meetingMode && (
            <button type="button" onClick={onDemo} className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">
              Load demo student
            </button>
          )}
          <button type="button" onClick={onClear} className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-soft">
            Clear
          </button>
        </div>
      </div>
      <div className="px-4 py-3">{form}</div>
    </section>
  );
}
