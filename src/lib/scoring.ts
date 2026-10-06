import { parseAcademicScore } from "./academic";
import { toEur } from "./currency";
import { combineEligibility, eligibilityFactors } from "./eligibility";
import { parseLooseNumber } from "./profile";
import { clamp, coverage, normalizeIntent } from "./text";
import type {
  Course,
  ScoredCourse,
  ScoreWeights,
  StudentProfile,
} from "./types";
import { DEFAULT_WEIGHTS } from "./types";

function ratioToPoints(ratio: number, max: number): number {
  return Math.round(clamp(ratio, 0, 1) * max);
}

function academicRatio(profile: StudentProfile, course: Course): number {
  const student = parseAcademicScore(profile.academicScore);
  if (student == null) return 0.5;
  if (course.minimumAcademicScore == null) {
    return clamp(0.35 + ((student - 50) / 50) * 0.65, 0.15, 1);
  }
  const margin = student - course.minimumAcademicScore;
  return clamp(0.72 + margin * 0.014, 0, 1);
}

function careerRatio(profile: StudentProfile, course: Course): number {
  const goal = profile.careerGoal.trim();
  const interests = profile.interests.trim();
  const experience = profile.experience.trim();
  if (!goal && !interests && !experience) return 0.4;

  const intent = `${goal} ${interests} ${experience}`;
  const paths = course.careerPaths.length
    ? course.careerPaths
    : [course.courseName];
  const best = Math.max(...paths.map((path) => coverage(path, intent)));
  const goalNorm = normalizeIntent(goal);
  const direct = paths.some(
    (path) => goalNorm && normalizeIntent(path).includes(goalNorm),
  );
  let ratio = direct ? Math.max(best, 0.95) : best;
  if (!goal) ratio *= 0.75;
  return clamp(ratio, 0, 1);
}

function subjectRatio(profile: StudentProfile, course: Course): number {
  const area = profile.desiredCourseArea.trim();
  const interests = profile.interests.trim();
  const field = profile.fieldOfStudy.trim();
  if (!area && !interests && !field) return 0.45;

  const haystack = [course.courseName, course.subjects.join(" ")].join(" ");
  const weighted: Array<{ score: number; weight: number }> = [];
  if (area) weighted.push({ score: coverage(area, haystack), weight: 1 });
  if (interests) {
    weighted.push({ score: coverage(interests, haystack), weight: 0.85 });
  }
  if (field) weighted.push({ score: coverage(field, haystack), weight: 0.55 });
  const weightSum = weighted.reduce((sum, item) => sum + item.weight, 0);
  const score =
    weighted.reduce((sum, item) => sum + item.score * item.weight, 0) /
    weightSum;
  return clamp(score, 0, 1);
}

function budgetRatio(profile: StudentProfile, course: Course): number {
  const budget = parseLooseNumber(profile.maxTuitionBudget);
  if (budget == null || budget <= 0 || course.tuitionFee == null) return 0.5;
  const feeEur = toEur(course.tuitionFee, course.currency);
  const budgetEur = toEur(budget, profile.budgetCurrency);
  if (feeEur == null || budgetEur == null || budgetEur <= 0) return 0.5;
  const ratio = feeEur / budgetEur;
  if (ratio <= 1) return 1;
  if (ratio >= 1.6) return 0;
  return 1 - (ratio - 1) / 0.6;
}

function countryRatio(profile: StudentProfile, course: Course): number {
  const preferred = profile.preferredCountry.trim().toLowerCase();
  const secondary = profile.secondaryCountry.trim().toLowerCase();
  const country = course.country.trim().toLowerCase();
  if (!preferred && !secondary) return 0.55;
  if (preferred && country === preferred) return 1;
  if (secondary && country === secondary) return 0.62;
  return 0.12;
}

function intakeRatio(profile: StudentProfile, course: Course): number {
  const preferred = profile.preferredIntake.trim().toLowerCase();
  if (!preferred) return 0.6;
  if (!course.intakes.length) return 0.45;
  const match = course.intakes.some(
    (intake) => intake.trim().toLowerCase() === preferred,
  );
  return match ? 1 : 0.15;
}

function pointsLabel(score: number, max: number): string {
  return `${score}/${max}`;
}

export function scoreCourse(
  profile: StudentProfile,
  course: Course,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoredCourse {
  const ratios = {
    academic: academicRatio(profile, course),
    career: careerRatio(profile, course),
    subject: subjectRatio(profile, course),
    budget: budgetRatio(profile, course),
    country: countryRatio(profile, course),
    intake: intakeRatio(profile, course),
  };

  const academicScore = ratioToPoints(ratios.academic, weights.academic);
  const careerScore = ratioToPoints(ratios.career, weights.career);
  const subjectScore = ratioToPoints(ratios.subject, weights.subject);
  const budgetScore = ratioToPoints(ratios.budget, weights.budget);
  const countryScore = ratioToPoints(ratios.country, weights.country);
  const intakeScore = ratioToPoints(ratios.intake, weights.intake);
  const overallScore =
    academicScore +
    careerScore +
    subjectScore +
    budgetScore +
    countryScore +
    intakeScore;

  const factors = eligibilityFactors(profile, course);
  const eligibilityStatus = combineEligibility(factors);
  const studentAcademic = parseAcademicScore(profile.academicScore);
  const budget = parseLooseNumber(profile.maxTuitionBudget);
  const feeEur =
    course.tuitionFee == null ? null : toEur(course.tuitionFee, course.currency);
  const budgetEur =
    budget == null ? null : toEur(budget, profile.budgetCurrency);

  const factorNotes = {
    academic:
      studentAcademic == null
        ? "No academic score was entered, so academic fit stays neutral."
        : course.minimumAcademicScore == null
          ? "No academic threshold was captured, so this uses only the strength of the stated result."
          : `Stated result is ${studentAcademic.toFixed(0)}/100 on the comparison scale, against a floor of ${course.minimumAcademicScore}/100.`,
    career:
      !profile.careerGoal.trim() && !profile.interests.trim()
        ? "No career goal or interests were entered, so career alignment stays neutral."
        : `Compared "${profile.careerGoal || profile.interests}" with listed paths: ${course.careerPaths.slice(0, 3).join(", ") || course.courseName}.`,
    subject:
      !profile.desiredCourseArea.trim() &&
      !profile.interests.trim() &&
      !profile.fieldOfStudy.trim()
        ? "No course area, interests, or field were entered, so subject fit stays neutral."
        : `Checked ${course.subjects.slice(0, 4).join(", ")} against the stated field, interests, and course area.`,
    budget:
      budget == null
        ? "No tuition budget was entered, so budget fit stays neutral."
        : course.tuitionFee == null
          ? "Tuition was not captured from the official page, so budget fit stays neutral."
          : feeEur != null && budgetEur != null && feeEur > budgetEur
            ? "Listed tuition is above the maximum budget after approximate currency conversion."
            : "Listed tuition is within the maximum budget after approximate currency conversion.",
    country: !profile.preferredCountry.trim() && !profile.secondaryCountry.trim()
      ? "No country preference was entered, so country fit stays neutral."
      : course.country.toLowerCase() === profile.preferredCountry.trim().toLowerCase()
        ? `${course.country} matches the preferred country.`
        : course.country.toLowerCase() ===
            profile.secondaryCountry.trim().toLowerCase()
          ? `${course.country} matches the secondary country.`
          : `${course.country} is outside the stated country preferences.`,
    intake: !profile.preferredIntake.trim()
      ? "No intake was selected, so intake fit stays neutral."
      : course.intakes.some(
            (intake) =>
              intake.toLowerCase() === profile.preferredIntake.trim().toLowerCase(),
          )
        ? `${profile.preferredIntake} is a listed intake.`
        : `${profile.preferredIntake} is not among the listed intakes (${course.intakes.join(", ") || "none captured"}).`,
  };

  const scoredBits = [
    { key: "academic", score: academicScore, max: weights.academic, note: factorNotes.academic, ratio: ratios.academic },
    { key: "career", score: careerScore, max: weights.career, note: factorNotes.career, ratio: ratios.career },
    { key: "subject", score: subjectScore, max: weights.subject, note: factorNotes.subject, ratio: ratios.subject },
    { key: "budget", score: budgetScore, max: weights.budget, note: factorNotes.budget, ratio: ratios.budget },
    { key: "country", score: countryScore, max: weights.country, note: factorNotes.country, ratio: ratios.country },
    { key: "intake", score: intakeScore, max: weights.intake, note: factorNotes.intake, ratio: ratios.intake },
  ] as const;

  const titles: Record<(typeof scoredBits)[number]["key"], string> = {
    academic: "Academic fit",
    career: "Career alignment",
    subject: "Subject fit",
    budget: "Budget fit",
    country: "Country preference",
    intake: "Intake fit",
  };

  const positives = scoredBits
    .filter((bit) => bit.ratio >= 0.75)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map(
      (bit) =>
        `${titles[bit.key]} is ${pointsLabel(bit.score, bit.max)}. ${bit.note}`,
    );

  const negatives = scoredBits
    .filter((bit) => bit.ratio < 0.5)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3)
    .map(
      (bit) =>
        `${titles[bit.key]} is ${pointsLabel(bit.score, bit.max)}. ${bit.note}`,
    );

  const reasons = [
    ...positives,
    ...factors
      .filter((factor) => factor.status === "met")
      .map((factor) => factor.detail),
  ].slice(0, 4);

  const warnings = [
    ...factors
      .filter((factor) => factor.status !== "met")
      .map((factor) => factor.detail),
    ...negatives,
  ].slice(0, 5);

  if (course.dataConfidence === "low") {
    warnings.push(
      "Several facts were missing from the captured programme page. Treat this card as a prompt to check the official URL.",
    );
  }

  return {
    course,
    overallScore,
    academicScore,
    careerScore,
    subjectScore,
    budgetScore,
    countryScore,
    intakeScore,
    eligibilityStatus,
    eligibilityFactors: factors,
    reasons: reasons.length
      ? reasons
      : ["Partial profile: several factors are neutral until more information is added."],
    warnings,
    positives,
    negatives,
    factorNotes,
  };
}
