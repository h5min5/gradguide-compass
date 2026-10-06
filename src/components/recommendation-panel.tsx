"use client";

import { formatDuration, formatMoney, FX_COMPARISON_NOTE } from "@/lib/currency";
import { eligibilityLabel, eligibilityTone, stabilityLabel, stabilityTone } from "@/lib/format";
import type { CatalogueFilters } from "@/lib/filters";
import type { LedgerEntry, RankedCourse, StabilityInsight } from "@/lib/types";

const selectClass =
  "rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand";

export function RecommendationPanel({
  ranked,
  visible,
  filters,
  universities,
  countries,
  intakes,
  subjects,
  stabilityById,
  shortlist,
  meetingMode,
  onFilters,
  onWhy,
  onCompare,
  onAlternatives,
  onDetails,
  onPrioritize,
  compareIds,
}: {
  ranked: RankedCourse[];
  visible: RankedCourse[];
  filters: CatalogueFilters;
  universities: string[];
  countries: string[];
  intakes: string[];
  subjects: string[];
  stabilityById: Map<string, StabilityInsight>;
  shortlist: LedgerEntry[];
  meetingMode: boolean;
  onFilters: (filters: CatalogueFilters) => void;
  onWhy: (courseId: string) => void;
  onCompare: (courseId: string) => void;
  onAlternatives: (courseId: string) => void;
  onDetails: (courseId: string) => void;
  onPrioritize: (courseId: string) => void;
  compareIds: string[];
}) {
  const cards = meetingMode ? visible.slice(0, 5) : visible;

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Ranked recommendations</h2>
            <p className="mt-1 text-xs text-muted">
              {visible.length} of {ranked.length} courses. Order follows eligibility, then match score. {FX_COMPARISON_NOTE}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={filters.keyword}
            onChange={(event) => onFilters({ ...filters, keyword: event.target.value })}
            placeholder="Search courses, universities, subjects"
            className="rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand md:col-span-2 xl:col-span-4"
          />
          <select className={selectClass} value={filters.university} onChange={(event) => onFilters({ ...filters, university: event.target.value })}>
            <option value="">All universities</option>
            {universities.map((university) => <option key={university}>{university}</option>)}
          </select>
          <select className={selectClass} value={filters.country} onChange={(event) => onFilters({ ...filters, country: event.target.value })}>
            <option value="">All countries</option>
            {countries.map((country) => <option key={country}>{country}</option>)}
          </select>
          <select className={selectClass} value={filters.subject} onChange={(event) => onFilters({ ...filters, subject: event.target.value })}>
            <option value="">All subjects</option>
            {subjects.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
          <select className={selectClass} value={filters.intake} onChange={(event) => onFilters({ ...filters, intake: event.target.value })}>
            <option value="">All intakes</option>
            {intakes.map((intake) => <option key={intake}>{intake}</option>)}
          </select>
          <select className={selectClass} value={filters.eligibility} onChange={(event) => onFilters({ ...filters, eligibility: event.target.value as CatalogueFilters["eligibility"] })}>
            <option value="">All eligibility</option>
            <option value="LIKELY_COMPATIBLE">Likely compatible</option>
            <option value="NEEDS_VERIFICATION">Needs verification</option>
            <option value="REQUIREMENT_MISMATCH">Requirement mismatch</option>
          </select>
          <input
            value={filters.maxTuitionEur}
            onChange={(event) => onFilters({ ...filters, maxTuitionEur: event.target.value })}
            placeholder="Max tuition in EUR"
            className="rounded-md border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand"
          />
          <button type="button" className="rounded-md border border-line px-2 py-1.5 text-xs" onClick={() => onFilters({ keyword: "", university: "", country: "", subject: "", maxTuitionEur: "", intake: "", eligibility: "" })}>
            Reset filters
          </button>
        </div>
      </div>

      {shortlist.length > 0 && (
        <div className="rounded-lg border border-line bg-brand-soft px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Counsellor shortlist</p>
          <ul className="mt-1 space-y-1">
            {shortlist.map((entry) => (
              <li key={entry.courseId} className="text-xs text-ink">
                Priority {entry.newPriority}: {entry.courseName} · system rank #{entry.originalRank} when recorded
              </li>
            ))}
          </ul>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-8 text-sm text-muted">
          No courses match these filters. Reset them to see the ranked list again.
        </div>
      ) : (
        cards.map((item) => {
          const stability = stabilityById.get(item.course.id);
          const priority = shortlist.find((entry) => entry.courseId === item.course.id);
          return (
            <article key={item.course.id} className="rounded-lg border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    System rank #{item.rank}
                    {priority ? ` · Counsellor priority ${priority.newPriority}` : ""}
                  </p>
                  <h3 className="mt-0.5 text-base font-semibold tracking-tight">{item.course.courseName}</h3>
                  <p className="text-sm text-ink">
                    {item.course.university} · {item.course.city}, {item.course.country}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold tabular-nums text-brand">{item.overallScore}%</p>
                  <p className="text-[11px] text-muted">match</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink sm:grid-cols-4">
                <div><dt className="text-muted">Tuition</dt><dd>{formatMoney(item.course.tuitionFee, item.course.currency)}</dd></div>
                <div><dt className="text-muted">Duration</dt><dd>{formatDuration(item.course.durationMonths)}</dd></div>
                <div><dt className="text-muted">Intake</dt><dd>{item.course.intakes.join(", ") || "Not captured"}</dd></div>
                <div><dt className="text-muted">Confidence</dt><dd className="capitalize">{item.course.dataConfidence}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${eligibilityTone(item.eligibilityStatus)}`}>
                  {eligibilityLabel(item.eligibilityStatus)}
                </span>
                {stability && (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stabilityTone(stability.label)}`}>
                    {stabilityLabel(stability.label)}
                  </span>
                )}
              </div>
              {item.warnings[0] && (
                <p className="mt-2 text-xs leading-5 text-brand-dark">{item.warnings[0]}</p>
              )}
              {stability && (
                <p className="mt-1 text-xs leading-5 text-muted">{stability.summary}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" className="rounded-md bg-brand px-2 py-1 text-[11px] font-medium text-white" onClick={() => onWhy(item.course.id)}>Why this?</button>
                <button type="button" className="rounded-md border border-line px-2 py-1 text-[11px] font-medium" onClick={() => onCompare(item.course.id)}>
                  {compareIds.includes(item.course.id) ? "In compare" : "Compare"}
                </button>
                <button type="button" className="rounded-md border border-line px-2 py-1 text-[11px] font-medium" onClick={() => onAlternatives(item.course.id)}>Alternatives</button>
                <button type="button" className="rounded-md border border-line px-2 py-1 text-[11px] font-medium" onClick={() => onDetails(item.course.id)}>Details</button>
                <button type="button" className="rounded-md border border-line px-2 py-1 text-[11px] font-medium" onClick={() => onPrioritize(item.course.id)}>Prioritize</button>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
