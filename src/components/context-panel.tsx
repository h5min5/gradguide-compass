"use client";

import { useState } from "react";
import { askCompass } from "@/lib/compass-client";
import { formatDuration, formatMoney } from "@/lib/currency";
import { eligibilityLabel } from "@/lib/format";
import type {
  AlternativeSuggestion,
  AskNextResult,
  LedgerEntry,
  OverrideReason,
  RankedCourse,
  StabilityInsight,
  StudentProfile,
} from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";

const REASONS: OverrideReason[] = [
  "Student expressed stronger preference",
  "Programme content preferred",
  "Research orientation",
  "Career considerations",
  "Updated information not captured",
  "Other",
];

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  return (
    <div className="grid grid-cols-[1fr_52px_1fr] items-center gap-2 text-xs">
      <span>{label}</span>
      <span className="tabular-nums text-[#1c2430]">{score}/{max}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-[#e7ebef]">
        <span className="block h-full bg-[#1f4e5f]" style={{ width: `${max ? (score / max) * 100 : 0}%` }} />
      </span>
    </div>
  );
}

export function ContextPanel({
  tab,
  onTab,
  profile,
  ledger,
  ranked,
  selected,
  alternatives,
  ask,
  stability,
  compareIds,
  onRemoveCompare,
  overrideCourseId,
  onSaveOverride,
  onClearOverride,
}: {
  tab: string;
  onTab: (tab: string) => void;
  profile: StudentProfile;
  ledger: LedgerEntry[];
  ranked: RankedCourse[];
  selected: RankedCourse | null;
  alternatives: AlternativeSuggestion[];
  ask: AskNextResult | null;
  stability: StabilityInsight | null;
  compareIds: string[];
  onRemoveCompare: (courseId: string) => void;
  overrideCourseId: string | null;
  onSaveOverride: (entry: {
    courseId: string;
    newPriority: number;
    reason: OverrideReason;
    note: string;
  }) => void;
  onClearOverride: (courseId: string) => void;
}) {
  const tabs = [
    ["ask", "Ask next"],
    ["why", "Why this"],
    ["details", "Details"],
    ["alternatives", "Alternatives"],
    ["compare", "Compare"],
    ["ledger", "Ledger"],
    ["compass", "Ask Compass"],
  ] as const;

  return (
    <section className="rounded-lg border border-[#e1e6eb] bg-white">
      <div className="flex gap-1 overflow-x-auto border-b border-[#e1e6eb] px-2 py-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${tab === id ? "bg-[#1f4e5f] text-white" : "text-[#3d4854] hover:bg-[#f4f7f8]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {tab === "ask" && <AskNextView ask={ask} profile={profile} />}
        {tab === "why" && <WhyView selected={selected} stability={stability} />}
        {tab === "details" && <DetailsView selected={selected} />}
        {tab === "alternatives" && (
          <AlternativesView selected={selected} alternatives={alternatives} ranked={ranked} />
        )}
        {tab === "compare" && (
          <CompareView ranked={ranked} compareIds={compareIds} onRemove={onRemoveCompare} />
        )}
        {tab === "ledger" && (
          <LedgerView
            ledger={ledger}
            ranked={ranked}
            overrideCourseId={overrideCourseId}
            onSave={onSaveOverride}
            onClear={onClearOverride}
          />
        )}
        <div className={tab === "compass" ? "" : "hidden"}>
          <AskCompassPanel profile={profile} ledger={ledger} />
        </div>
      </div>
    </section>
  );
}

function AskNextView({
  ask,
  profile,
}: {
  ask: AskNextResult | null;
  profile: StudentProfile;
}) {
  const [phrased, setPhrased] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function phrase() {
    if (!ask) return;
    setBusy(true);
    setError("");
    const response = await askCompass(
      [
        {
          role: "user",
          content: `Phrase this Ask Next briefing in two short sentences for a counsellor. Do not change the question, the information-gain score, or any counts. Question: ${ask.question} Briefing: ${ask.why}`,
        },
      ],
      profile,
      [],
    );
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setPhrased(response.message);
  }

  if (!ask) {
    return (
      <p className="text-sm leading-6 text-[#3d4854]">
        The profile already contains the fields that move eligibility and ranking. Confirm programme-specific conditions on the official pages before an offer is discussed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1f4e5f]">Ask next</p>
      <p className="text-sm font-medium leading-6">{ask.question}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6773]">Why this matters</p>
      <p className="text-sm leading-6 text-[#3d4854]">{ask.why}</p>
      <p className="text-xs text-[#5c6773]">Information gain {ask.informationGainScore}/100. The engine chose the question. Wording below, if requested, does not change it.</p>
      <button type="button" onClick={phrase} disabled={busy} className="rounded-md border border-[#d5dbe1] px-2.5 py-1.5 text-xs font-medium">
        {busy ? "Phrasing…" : "Phrase with Compass"}
      </button>
      {phrased && <p className="rounded-md bg-[#f4f8f9] p-2 text-sm leading-6">{phrased}</p>}
      {error && <p className="text-xs leading-5 text-[#7a4b12]">{error}</p>}
    </div>
  );
}

function WhyView({
  selected,
  stability,
}: {
  selected: RankedCourse | null;
  stability: StabilityInsight | null;
}) {
  if (!selected) {
    return <p className="text-sm text-[#5c6773]">Choose Why this? on a course to see the score breakdown.</p>;
  }
  const rows = [
    ["Academic", selected.academicScore, DEFAULT_WEIGHTS.academic, selected.factorNotes.academic],
    ["Career", selected.careerScore, DEFAULT_WEIGHTS.career, selected.factorNotes.career],
    ["Subject", selected.subjectScore, DEFAULT_WEIGHTS.subject, selected.factorNotes.subject],
    ["Budget", selected.budgetScore, DEFAULT_WEIGHTS.budget, selected.factorNotes.budget],
    ["Country", selected.countryScore, DEFAULT_WEIGHTS.country, selected.factorNotes.country],
    ["Intake", selected.intakeScore, DEFAULT_WEIGHTS.intake, selected.factorNotes.intake],
  ] as const;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{selected.course.courseName}</h3>
        <p className="text-xs text-[#5c6773]">{selected.course.university}</p>
      </div>
      <div className="space-y-2">
        {rows.map(([label, score, max]) => (
          <ScoreRow key={label} label={label} score={score} max={max} />
        ))}
        <div className="border-t border-[#e1e6eb] pt-2 text-sm font-semibold">
          Total {selected.overallScore}/100
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6773]">Main positive factors</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5 text-[#3d4854]">
          {(selected.positives.length ? selected.positives : ["No strong positive factor yet."]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6773]">Main cautions</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5 text-[#3d4854]">
          {(selected.negatives.length ? selected.negatives : selected.warnings).slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
          {selected.negatives.length === 0 && selected.warnings.length === 0 && <li>No material caution on the scored factors.</li>}
        </ul>
      </div>
      {stability && (
        <p className="text-xs leading-5 text-[#5c6773]">
          {stability.label === "HIGH" ? "High stability" : stability.label === "MEDIUM" ? "Medium stability" : "Low stability"}. {stability.summary} {stability.observations.join(". ")}
        </p>
      )}
    </div>
  );
}

function DetailsView({ selected }: { selected: RankedCourse | null }) {
  if (!selected) return <p className="text-sm text-[#5c6773]">Choose Details on a course.</p>;
  const course = selected.course;
  return (
    <div className="space-y-3 text-sm leading-6">
      <div>
        <h3 className="font-semibold">{course.courseName}</h3>
        <p className="text-xs text-[#5c6773]">{course.university} · {course.city}, {course.country}</p>
      </div>
      <p>{course.description}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-[#5c6773]">Tuition</dt><dd>{formatMoney(course.tuitionFee, course.currency)}</dd></div>
        <div><dt className="text-[#5c6773]">Duration</dt><dd>{formatDuration(course.durationMonths)}</dd></div>
        <div className="col-span-2"><dt className="text-[#5c6773]">Fee basis</dt><dd>{course.tuitionBasis}</dd></div>
        <div className="col-span-2"><dt className="text-[#5c6773]">Academic requirement</dt><dd>{course.academicRequirementLabel}</dd></div>
        <div><dt className="text-[#5c6773]">IELTS</dt><dd>{course.ieltsRequirement ?? "Not captured"}</dd></div>
        <div><dt className="text-[#5c6773]">TOEFL</dt><dd>{course.toeflRequirement ?? course.toeflNewScaleRequirement ?? "Not captured"}</dd></div>
      </dl>
      <p className="text-xs"><span className="text-[#5c6773]">Subjects. </span>{course.subjects.join(", ")}</p>
      <p className="text-xs"><span className="text-[#5c6773]">Career paths. </span>{course.careerPaths.join(", ")}</p>
      <p className="text-xs"><span className="text-[#5c6773]">Eligibility. </span>{eligibilityLabel(selected.eligibilityStatus)}</p>
      <div className="rounded-md border border-[#e1e6eb] bg-[#f8fafb] p-2 text-xs leading-5">
        <p className="font-medium">Data source</p>
        <p className="mt-1">{course.dataStatus}</p>
        <p className="mt-1">Last read: {course.lastVerified}. Confidence: {course.dataConfidence}.</p>
        <a className="mt-1 inline-block font-medium text-[#1f4e5f] underline" href={course.officialUrl} target="_blank" rel="noreferrer">
          Official page
        </a>
      </div>
    </div>
  );
}

function AlternativesView({
  selected,
  alternatives,
  ranked,
}: {
  selected: RankedCourse | null;
  alternatives: AlternativeSuggestion[];
  ranked: RankedCourse[];
}) {
  if (!selected) return <p className="text-sm text-[#5c6773]">Choose Alternatives on a course.</p>;
  if (!alternatives.length) {
    return <p className="text-sm text-[#5c6773]">No calculated alternative met the similarity rules for this course.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-[#5c6773]">Alternatives for {selected.course.courseName}, calculated from the current scores.</p>
      {alternatives.map((alternative) => {
        const match = ranked.find((item) => item.course.id === alternative.courseId);
        return (
          <article key={alternative.kind} className="rounded-md border border-[#e1e6eb] p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1f4e5f]">{alternative.title}</p>
            <p className="mt-1 text-sm font-medium">{match?.course.courseName}</p>
            <p className="text-xs text-[#5c6773]">{match?.course.university} · {match ? `${match.overallScore}%` : ""}</p>
            <p className="mt-1 text-xs leading-5">{alternative.explanation}</p>
          </article>
        );
      })}
    </div>
  );
}

function CompareView({
  ranked,
  compareIds,
  onRemove,
}: {
  ranked: RankedCourse[];
  compareIds: string[];
  onRemove: (courseId: string) => void;
}) {
  const rows = compareIds
    .map((id) => ranked.find((item) => item.course.id === id))
    .filter((item): item is RankedCourse => Boolean(item));
  if (rows.length < 2) {
    return <p className="text-sm text-[#5c6773]">Add up to 3 courses with Compare. {rows.length} selected.</p>;
  }
  const fields: Array<[string, (item: RankedCourse) => string]> = [
    ["Match", (item) => `${item.overallScore}/100`],
    ["University", (item) => item.course.university],
    ["Country", (item) => item.course.country],
    ["Tuition", (item) => formatMoney(item.course.tuitionFee, item.course.currency)],
    ["Duration", (item) => formatDuration(item.course.durationMonths)],
    ["Intake", (item) => item.course.intakes.join(", ") || "Not captured"],
    ["Eligibility", (item) => eligibilityLabel(item.eligibilityStatus)],
    ["Academic", (item) => `${item.academicScore}/${DEFAULT_WEIGHTS.academic}`],
    ["Career", (item) => `${item.careerScore}/${DEFAULT_WEIGHTS.career}`],
    ["Subject", (item) => `${item.subjectScore}/${DEFAULT_WEIGHTS.subject}`],
    ["Warnings", (item) => String(item.warnings.length)],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="border-b border-[#e1e6eb] py-2 pr-2 font-medium text-[#5c6773]">Field</th>
            {rows.map((item) => (
              <th key={item.course.id} className="border-b border-[#e1e6eb] py-2 pr-2 font-medium">
                {item.course.courseName}
                <button type="button" className="mt-1 block font-normal text-[#1f4e5f]" onClick={() => onRemove(item.course.id)}>Remove</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map(([label, read]) => (
            <tr key={label}>
              <td className="border-b border-[#f0f2f4] py-2 pr-2 text-[#5c6773]">{label}</td>
              {rows.map((item) => (
                <td key={item.course.id} className="border-b border-[#f0f2f4] py-2 pr-2 align-top">{read(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerView({
  ledger,
  ranked,
  overrideCourseId,
  onSave,
  onClear,
}: {
  ledger: LedgerEntry[];
  ranked: RankedCourse[];
  overrideCourseId: string | null;
  onSave: (entry: { courseId: string; newPriority: number; reason: OverrideReason; note: string }) => void;
  onClear: (courseId: string) => void;
}) {
  const [reason, setReason] = useState<OverrideReason>(REASONS[0]);
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState(1);
  const target = ranked.find((item) => item.course.id === overrideCourseId);

  return (
    <div className="space-y-3">
      {target && (
        <form
          className="space-y-2 rounded-md border border-[#e1e6eb] p-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ courseId: target.course.id, newPriority: priority, reason, note });
            setNote("");
          }}
        >
          <p className="text-sm font-medium">Why prioritize {target.course.courseName}?</p>
          <p className="text-xs text-[#5c6773]">System rank #{target.rank} · {target.overallScore}%</p>
          <label className="block text-xs">
            Priority
            <select className="mt-1 w-full rounded-md border border-[#d5dbe1] px-2 py-1.5" value={priority} onChange={(event) => setPriority(Number(event.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <label className="block text-xs">
            Reason
            <select className="mt-1 w-full rounded-md border border-[#d5dbe1] px-2 py-1.5" value={reason} onChange={(event) => setReason(event.target.value as OverrideReason)}>
              {REASONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-xs">
            Note (optional)
            <textarea className="mt-1 w-full rounded-md border border-[#d5dbe1] px-2 py-1.5" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <button type="submit" className="rounded-md bg-[#1f4e5f] px-2.5 py-1.5 text-xs font-medium text-white">Save decision</button>
        </form>
      )}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6773]">Decision trail</p>
        {ledger.length === 0 && <p className="mt-2 text-sm text-[#5c6773]">No counsellor overrides yet. System ranking stays in force.</p>}
        <ol className="mt-2 space-y-2">
          {[...ledger].reverse().map((entry) => (
            <li key={entry.id} className="rounded-md border border-[#e1e6eb] p-2 text-xs leading-5">
              <p className="font-medium text-[#5c6773]">SYSTEM</p>
              <p>{entry.courseName} ranked #{entry.originalRank} — {entry.originalScore}%</p>
              <p className="mt-1 font-medium text-[#5c6773]">COUNSELLOR</p>
              <p>{entry.action === "clear" ? "Cleared priority for" : "Prioritized"} {entry.courseName}{entry.action === "prioritize" ? ` at priority ${entry.newPriority}` : ""}</p>
              <p className="mt-1 font-medium text-[#5c6773]">REASON</p>
              <p>{entry.reason}{entry.note ? ` ${entry.note}` : ""}</p>
              <p className="mt-1 text-[#5c6773]">{new Date(entry.timestamp).toLocaleString()}</p>
              {entry.action === "prioritize" && (
                <button type="button" className="mt-1 text-[#1f4e5f]" onClick={() => onClear(entry.courseId)}>Remove from shortlist</button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function AskCompassPanel({
  profile,
  ledger,
}: {
  profile: StudentProfile;
  ledger: LedgerEntry[];
}) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const prompts = [
    "Why is the top course ranked above the second?",
    "Find something cheaper but still focused on machine learning.",
    "What are my best options in Ireland?",
    "Which courses have stronger AI content?",
    "What alternatives would you suggest if the student's budget drops to €25,000?",
    "Compare the top two options.",
    "Which information should I ask the student for next?",
  ];

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    setBusy(true);
    const response = await askCompass(history, profile, ledger);
    setMessages((current) => [...current, { role: "assistant", content: response.message }]);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-[#5c6773]">
        Ask Compass answers from the scored catalogue for this profile. It does not rank courses or invent fees.
      </p>
      <div className="flex flex-wrap gap-1">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="rounded-full border border-[#d5dbe1] px-2 py-1 text-[11px]" onClick={() => send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-[#5c6773]">Ask a question about this student&apos;s options.</p>}
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={`rounded-md px-2 py-1.5 text-sm leading-6 ${message.role === "user" ? "bg-[#f4f7f8]" : "bg-[#f4f8f9]"}`}>
            <span className="mr-1 text-[11px] font-semibold uppercase text-[#5c6773]">{message.role === "user" ? "You" : "Compass"}</span>
            {message.content}
          </p>
        ))}
        {busy && <p className="text-xs text-[#5c6773]">Compass is reading the scored catalogue…</p>}
      </div>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 rounded-md border border-[#d5dbe1] px-2.5 py-1.5 text-sm outline-none focus:border-[#1f4e5f]" placeholder="Ask about this profile" />
        <button type="submit" disabled={busy} className="rounded-md bg-[#1f4e5f] px-3 py-1.5 text-xs font-medium text-white">Send</button>
      </form>
    </div>
  );
}
