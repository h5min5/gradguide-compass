import { findAlternatives } from "./alternatives";
import { askNext } from "./information-gain";
import { rankCourses } from "./recommend";
import { recommendationStability } from "./stability";
import type { Course, LedgerEntry, StudentProfile } from "./types";
import { DEFAULT_WEIGHTS } from "./types";

export function buildCounsellingContext(
  profile: StudentProfile,
  courses: Course[],
  ledger: LedgerEntry[],
  latestUserText: string,
) {
  const ranked = rankCourses(profile, courses);
  const stability = recommendationStability(profile, courses);
  const stabilityById = new Map(
    stability.insights.map((insight) => [insight.courseId, insight]),
  );
  const next = askNext(profile, courses);
  const needle = latestUserText.toLowerCase();

  const compact = ranked.map((item) => ({
    rank: item.rank,
    id: item.course.id,
    courseName: item.course.courseName,
    university: item.course.university,
    city: item.course.city,
    country: item.course.country,
    tuitionFee: item.course.tuitionFee,
    currency: item.course.currency,
    tuitionBasis: item.course.tuitionBasis,
    durationMonths: item.course.durationMonths,
    intakes: item.course.intakes,
    subjects: item.course.subjects,
    careerPaths: item.course.careerPaths,
    ieltsRequirement: item.course.ieltsRequirement,
    toeflRequirement: item.course.toeflRequirement,
    academicRequirementLabel: item.course.academicRequirementLabel,
    officialUrl: item.course.officialUrl,
    dataConfidence: item.course.dataConfidence,
    dataStatus: item.course.dataStatus,
    description: item.course.description,
    overallScore: item.overallScore,
    academicScore: `${item.academicScore}/${DEFAULT_WEIGHTS.academic}`,
    careerScore: `${item.careerScore}/${DEFAULT_WEIGHTS.career}`,
    subjectScore: `${item.subjectScore}/${DEFAULT_WEIGHTS.subject}`,
    budgetScore: `${item.budgetScore}/${DEFAULT_WEIGHTS.budget}`,
    countryScore: `${item.countryScore}/${DEFAULT_WEIGHTS.country}`,
    intakeScore: `${item.intakeScore}/${DEFAULT_WEIGHTS.intake}`,
    eligibilityStatus: item.eligibilityStatus,
    reasons: item.reasons,
    warnings: item.warnings.slice(0, 3),
    stabilityLabel: stabilityById.get(item.course.id)?.label ?? null,
    stabilitySummary: stabilityById.get(item.course.id)?.summary ?? null,
    stabilityObservations:
      stabilityById.get(item.course.id)?.observations ?? [],
  }));

  const mentioned = ranked.filter((item) => {
    const name = item.course.courseName.toLowerCase();
    const university = item.course.university.toLowerCase();
    return needle.includes(name) || needle.includes(university);
  });
  const focus = mentioned[0] ?? ranked[0];
  const alternatives = focus
    ? findAlternatives(
        focus.course.id,
        ranked,
        profile.preferredCountry,
        profile.secondaryCountry,
      ).map((alternative) => {
        const course = ranked.find((item) => item.course.id === alternative.courseId);
        return {
          ...alternative,
          courseName: course?.course.courseName ?? alternative.courseId,
          university: course?.course.university ?? "",
          overallScore: course?.overallScore ?? null,
        };
      })
    : [];

  return {
    instruction:
      "These facts and scores were produced by the application. Quote them. Do not calculate new scores, eligibility, tuition, or rankings.",
    fxNote:
      "Budget fit uses approximate comparison rates of 1 GBP = 1.17 EUR and 1 USD = 0.92 EUR. Fees stay in the currency captured from the university page.",
    academicScaleNote:
      "Academic thresholds are Compass comparison floors on a 0–100 scale derived from the requirement label. They are not a university's official conversion table.",
    student: profile,
    weights: DEFAULT_WEIGHTS,
    askNext: next,
    stabilityScenarioCount: stability.scenarioCount,
    budgetSensitivitySkipped: stability.budgetSkipped,
    counsellorDecisions: ledger.slice(-12),
    alternativesForFocus: focus
      ? { courseId: focus.course.id, courseName: focus.course.courseName, alternatives }
      : null,
    recommendations: compact,
  };
}
