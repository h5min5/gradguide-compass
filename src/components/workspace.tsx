"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { ContextPanel } from "@/components/context-panel";
import { ProfilePanel } from "@/components/profile-panel";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { findAlternatives } from "@/lib/alternatives";
import { getCourses } from "@/lib/courses";
import { applyFilters, EMPTY_FILTERS, type CatalogueFilters } from "@/lib/filters";
import { askNext } from "@/lib/information-gain";
import { DEMO_PROFILE, EMPTY_PROFILE } from "@/lib/profile";
import { rankCourses } from "@/lib/recommend";
import { recommendationStability } from "@/lib/stability";
import type { LedgerEntry, OverrideReason, StudentProfile } from "@/lib/types";

const PROFILE_KEY = "gradguide.profile.v1";
const LEDGER_KEY = "gradguide.ledger.v1";
const MEETING_KEY = "gradguide.meetingMode";

function shortlistFrom(ledger: LedgerEntry[]): LedgerEntry[] {
  const latest = new Map<string, LedgerEntry>();
  const ordered = [...ledger].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const entry of ordered) latest.set(entry.courseId, entry);
  return [...latest.values()]
    .filter((entry) => entry.action === "prioritize")
    .sort((a, b) => a.newPriority - b.newPriority || b.timestamp.localeCompare(a.timestamp));
}

export function Workspace() {
  const courses = useMemo(() => getCourses(), []);
  const [profile, setProfile] = useState<StudentProfile>(EMPTY_PROFILE);
  const [filters, setFilters] = useState<CatalogueFilters>(EMPTY_FILTERS);
  const [meetingMode, setMeetingMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("ask");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareNote, setCompareNote] = useState("");
  const [overrideCourseId, setOverrideCourseId] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only available after hydration */
    try {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      const savedLedger = localStorage.getItem(LEDGER_KEY);
      const meeting = localStorage.getItem(MEETING_KEY) === "1";
      setProfile(
        savedProfile ? { ...EMPTY_PROFILE, ...JSON.parse(savedProfile) } : EMPTY_PROFILE,
      );
      if (savedLedger) setLedger(JSON.parse(savedLedger) as LedgerEntry[]);
      if (meeting) setMeetingMode(true);
    } catch {
      setProfile(EMPTY_PROFILE);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  }, [ledger, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(MEETING_KEY, meetingMode ? "1" : "0");
  }, [meetingMode, hydrated]);

  const ranked = useMemo(() => rankCourses(profile, courses), [profile, courses]);
  const visible = useMemo(() => applyFilters(ranked, filters), [ranked, filters]);
  const ask = useMemo(() => askNext(profile, courses), [profile, courses]);
  const stability = useMemo(() => recommendationStability(profile, courses), [profile, courses]);
  const stabilityById = useMemo(
    () => new Map(stability.insights.map((insight) => [insight.courseId, insight])),
    [stability],
  );
  const selected = ranked.find((item) => item.course.id === selectedId) ?? null;
  const alternatives = useMemo(
    () =>
      selected
        ? findAlternatives(selected.course.id, ranked, profile.preferredCountry, profile.secondaryCountry)
        : [],
    [selected, ranked, profile.preferredCountry, profile.secondaryCountry],
  );
  const shortlist = shortlistFrom(ledger);

  const universities = [...new Set(courses.map((course) => course.university))].sort();
  const countries = [...new Set(courses.map((course) => course.country))].sort();
  const intakes = [...new Set(courses.flatMap((course) => course.intakes))].sort();
  const subjects = [
    "Artificial Intelligence",
    "Data Science",
    "Computer Science",
    "Software Engineering",
    "Cybersecurity",
  ];

  function openCourse(courseId: string, nextTab: string) {
    setSelectedId(courseId);
    setTab(nextTab);
  }

  function compare(courseId: string) {
    setCompareNote("");
    setCompareIds((current) => {
      if (current.includes(courseId)) return current.filter((id) => id !== courseId);
      if (current.length >= 3) {
        setCompareNote("Comparison holds 3 courses. Remove one before adding another.");
        return current;
      }
      return [...current, courseId];
    });
    setSelectedId(courseId);
    setTab("compare");
  }

  function saveOverride(input: {
    courseId: string;
    newPriority: number;
    reason: OverrideReason;
    note: string;
  }) {
    const course = ranked.find((item) => item.course.id === input.courseId);
    if (!course) return;
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      courseId: course.course.id,
      courseName: course.course.courseName,
      university: course.course.university,
      originalRank: course.rank,
      originalScore: course.overallScore,
      newPriority: input.newPriority,
      reason: input.reason,
      note: input.note.trim(),
      timestamp: new Date().toISOString(),
      action: "prioritize",
    };
    setLedger((current) => [...current, entry]);
    setOverrideCourseId(null);
    setTab("ledger");
  }

  function clearOverride(courseId: string) {
    const course = ranked.find((item) => item.course.id === courseId);
    const previous = [...ledger].reverse().find((entry) => entry.courseId === courseId && entry.action === "prioritize");
    if (!course || !previous) return;
    setLedger((current) => [
      ...current,
      {
        ...previous,
        id: crypto.randomUUID(),
        action: "clear",
        timestamp: new Date().toISOString(),
        originalRank: course.rank,
        originalScore: course.overallScore,
      },
    ]);
  }

  const profilePanel = (
    <ProfilePanel
      profile={profile}
      meetingMode={meetingMode}
      onChange={setProfile}
      onDemo={() => setProfile(DEMO_PROFILE)}
      onClear={() => setProfile(EMPTY_PROFILE)}
    />
  );
  const recommendationPanel = (
    <div className="space-y-2">
      {compareNote && <p className="text-xs text-brand-dark">{compareNote}</p>}
      <RecommendationPanel
        ranked={ranked}
        visible={visible}
        filters={filters}
        universities={universities}
        countries={countries}
        intakes={intakes}
        subjects={subjects}
        stabilityById={stabilityById}
        shortlist={shortlist}
        meetingMode={meetingMode}
        onFilters={setFilters}
        compareIds={compareIds}
        onWhy={(courseId) => openCourse(courseId, "why")}
        onCompare={compare}
        onAlternatives={(courseId) => openCourse(courseId, "alternatives")}
        onDetails={(courseId) => openCourse(courseId, "details")}
        onPrioritize={(courseId) => {
          setOverrideCourseId(courseId);
          setSelectedId(courseId);
          setTab("ledger");
        }}
      />
    </div>
  );
  const contextPanel = (
    <ContextPanel
      tab={tab}
      onTab={setTab}
      profile={profile}
      ledger={ledger}
      ranked={ranked}
      selected={selected}
      alternatives={alternatives}
      ask={ask}
      stability={selected ? (stabilityById.get(selected.course.id) ?? null) : null}
      compareIds={compareIds}
      onRemoveCompare={(courseId) =>
        setCompareIds((current) => current.filter((id) => id !== courseId))
      }
      overrideCourseId={overrideCourseId}
      onSaveOverride={saveOverride}
      onClearOverride={clearOverride}
    />
  );

  const header = (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-semibold tracking-tight">GradGuide Compass</p>
            <p className="text-[11px] text-muted">
              {meetingMode ? "Beside the call" : "Counselling workspace"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMeetingMode((current) => !current)}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${meetingMode ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}
          aria-pressed={meetingMode}
        >
          Meeting mode
        </button>
      </div>
    </header>
  );

  if (meetingMode) {
    return (
      <div className="flex min-h-dvh justify-end bg-background">
        <div className="flex h-dvh w-full max-w-[440px] flex-col border-l border-line bg-background">
          {header}
          <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
            {profilePanel}
            {recommendationPanel}
            {contextPanel}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {header}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[300px_minmax(0,1fr)_360px] lg:overflow-hidden">
        <div className="lg:overflow-y-auto">{profilePanel}</div>
        <div className="lg:overflow-y-auto">{recommendationPanel}</div>
        <div className="lg:overflow-y-auto">{contextPanel}</div>
      </main>
    </div>
  );
}
