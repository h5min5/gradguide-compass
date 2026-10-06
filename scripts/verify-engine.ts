import { askNext } from "../src/lib/information-gain";
import { findAlternatives } from "../src/lib/alternatives";
import { getCourses } from "../src/lib/courses";
import { DEMO_PROFILE, EMPTY_PROFILE } from "../src/lib/profile";
import { rankCourses } from "../src/lib/recommend";
import { recommendationStability } from "../src/lib/stability";
import { DEFAULT_WEIGHTS } from "../src/lib/types";

const courses = getCourses();

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const first = rankCourses(DEMO_PROFILE, courses);
const second = rankCourses(DEMO_PROFILE, courses);
assert(
  first.map((item) => `${item.course.id}:${item.overallScore}`).join("|") ===
    second.map((item) => `${item.course.id}:${item.overallScore}`).join("|"),
  "ranking is not deterministic",
);

for (const item of first) {
  const sum =
    item.academicScore +
    item.careerScore +
    item.subjectScore +
    item.budgetScore +
    item.countryScore +
    item.intakeScore;
  assert(sum === item.overallScore, `${item.course.id} breakdown does not add up`);
  assert(item.academicScore <= DEFAULT_WEIGHTS.academic, "academic above max");
  assert(item.careerScore <= DEFAULT_WEIGHTS.career, "career above max");
  assert(item.overallScore >= 0 && item.overallScore <= 100, "score out of range");
}

const galway = first.find((item) => item.course.id === "galway-msc-ai");
assert(Boolean(galway), "missing Galway AI");
assert(
  galway?.eligibilityStatus === "NEEDS_VERIFICATION",
  `demo IELTS should need verification, got ${galway?.eligibilityStatus}`,
);

const withIelts = rankCourses({ ...DEMO_PROFILE, ielts: "7.5" }, courses);
const galwayKnown = withIelts.find((item) => item.course.id === "galway-msc-ai");
assert(
  galwayKnown?.eligibilityStatus === "LIKELY_COMPATIBLE",
  `IELTS 7.5 should be likely compatible, got ${galwayKnown?.eligibilityStatus}`,
);

const lowIelts = rankCourses({ ...DEMO_PROFILE, ielts: "5.5" }, courses);
const galwayLow = lowIelts.find((item) => item.course.id === "galway-msc-ai");
assert(
  galwayLow?.eligibilityStatus === "REQUIREMENT_MISMATCH",
  `IELTS 5.5 should mismatch, got ${galwayLow?.eligibilityStatus}`,
);

const history = rankCourses(
  {
    ...DEMO_PROFILE,
    degree: "B.A. History",
    fieldOfStudy: "History",
    interests: "History",
    careerGoal: "Historian",
    ielts: "7.5",
  },
  courses,
);
const galwayHistory = history.find((item) => item.course.id === "galway-msc-ai");
assert(
  galwayHistory?.eligibilityStatus === "REQUIREMENT_MISMATCH",
  "history background should mismatch a computing programme",
);

const tightBudget = rankCourses(
  { ...DEMO_PROFILE, maxTuitionBudget: "12000" },
  courses,
);
const looseBudget = rankCourses(
  { ...DEMO_PROFILE, maxTuitionBudget: "80000" },
  courses,
);
const galwayTight = tightBudget.find((item) => item.course.id === "galway-msc-ai");
const galwayLoose = looseBudget.find((item) => item.course.id === "galway-msc-ai");
assert(
  (galwayTight?.budgetScore ?? 0) < (galwayLoose?.budgetScore ?? 0),
  "budget change did not change the budget score",
);

const usProfile = rankCourses(
  {
    ...DEMO_PROFILE,
    preferredCountry: "United States",
    secondaryCountry: "Ireland",
    maxTuitionBudget: "80000",
    budgetCurrency: "USD",
  },
  courses,
);
assert(
  first.map((item) => item.course.id).join() !== usProfile.map((item) => item.course.id).join(),
  "changing country and budget did not change rank order",
);

const partial = rankCourses(EMPTY_PROFILE, courses);
assert(partial.length === courses.length, "partial profile should still rank every course");
assert(
  partial.every((item) => item.eligibilityStatus !== "REQUIREMENT_MISMATCH"),
  "an empty profile must not be treated as a mismatch",
);

const next = askNext(DEMO_PROFILE, courses);
assert(Boolean(next?.question), "Ask Next did not return a question");
assert(
  (next?.informationGainScore ?? -1) >= 0 && (next?.informationGainScore ?? 101) <= 100,
  "information gain out of range",
);

const alternatives = findAlternatives(
  "galway-msc-ai",
  first,
  DEMO_PROFILE.preferredCountry,
  DEMO_PROFILE.secondaryCountry,
);
assert(alternatives.length > 0, "no alternatives were calculated");
assert(
  alternatives.every((item) => item.courseId !== "galway-msc-ai"),
  "alternative pointed at the selected course",
);
assert(new Set(alternatives.map((item) => item.courseId)).size === alternatives.length, "duplicate alternatives");

const stability = recommendationStability(DEMO_PROFILE, courses);
assert(stability.scenarioCount >= 8, "too few stability scenarios");
assert(
  stability.insights.every(
    (item) => item.stability >= 0 && item.stability <= 1 && ["HIGH", "MEDIUM", "LOW"].includes(item.label),
  ),
  "stability result invalid",
);

const bristol = first.find((item) => item.course.id === "bristol-msc-cs-conversion");
assert(
  bristol?.eligibilityStatus === "REQUIREMENT_MISMATCH",
  "conversion programme should mismatch a computing degree",
);

console.log(`courses ${courses.length}`);
console.log(`demo top ${first.slice(0, 5).map((item) => `${item.rank}. ${item.course.courseName} ${item.overallScore} ${item.eligibilityStatus}`).join(" | ")}`);
console.log(`ask next: ${next?.question} (${next?.informationGainScore})`);
console.log(`alternatives: ${alternatives.map((item) => item.title).join(", ")}`);
console.log("engine checks passed");
