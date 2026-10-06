"use client";

import type { ReactNode } from "react";
import { profileCompleteness } from "@/lib/profile";
import type { CurrencyCode, StudentProfile } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-[#d5dbe1] bg-white px-2.5 py-1.5 text-sm text-[#1c2430] outline-none focus:border-[#1f4e5f]";

const COUNTRIES = ["", "Ireland", "United Kingdom", "United States"];
const INTAKES = ["", "September", "January", "October", "May"];
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#5c6773]">
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
    <section className="rounded-lg border border-[#e1e6eb] bg-white">
      <div className="border-b border-[#e1e6eb] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Student profile</h2>
          <span className="text-xs text-[#5c6773]">{completeness.percent}% complete</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7ebef]">
          <div className="h-full rounded-full bg-[#1f4e5f]" style={{ width: `${completeness.percent}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-[#5c6773]">
          {completeness.filled} of {completeness.total} fields. Recommendations run with a partial profile.
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onDemo} className="rounded-md bg-[#1f4e5f] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#183e4c]">
            Load demo student
          </button>
          <button type="button" onClick={onClear} className="rounded-md border border-[#d5dbe1] px-2.5 py-1.5 text-xs font-medium text-[#1c2430] hover:bg-[#f4f7f8]">
            Clear
          </button>
        </div>
      </div>
      {meetingMode ? (
        <div className="space-y-3 px-4 py-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div><dt className="text-[#5c6773]">Student</dt><dd>{profile.name || "Unnamed"}</dd></div>
            <div><dt className="text-[#5c6773]">Result</dt><dd>{profile.academicScore || "Unknown"}</dd></div>
            <div className="col-span-2"><dt className="text-[#5c6773]">Degree</dt><dd>{profile.degree || "Not provided"}</dd></div>
            <div className="col-span-2"><dt className="text-[#5c6773]">Career</dt><dd>{profile.careerGoal || "Not provided"}</dd></div>
            <div><dt className="text-[#5c6773]">Country</dt><dd>{profile.preferredCountry || "Open"}</dd></div>
            <div><dt className="text-[#5c6773]">Budget</dt><dd>{profile.maxTuitionBudget ? `${profile.budgetCurrency} ${profile.maxTuitionBudget}` : "Unknown"}</dd></div>
            <div><dt className="text-[#5c6773]">Intake</dt><dd>{profile.preferredIntake || "Open"}</dd></div>
            <div><dt className="text-[#5c6773]">IELTS</dt><dd>{profile.ielts || "Unknown"}</dd></div>
          </dl>
          <details>
            <summary className="cursor-pointer text-xs font-medium text-[#1f4e5f]">Edit profile</summary>
            <div className="mt-3">{form}</div>
          </details>
        </div>
      ) : (
        <div className="px-4 py-3">{form}</div>
      )}
    </section>
  );
}
