import { parseAcademicScore } from "./academic";
import { parseLooseNumber } from "./profile";
import { tokenSet, tokens, stem } from "./text";
import type {
  Course,
  EligibilityFactor,
  EligibilityStatus,
  StudentProfile,
} from "./types";

const COMPUTING_PHRASES = [
  "artificial intelligence",
  "computer science",
  "data science",
  "software engineering",
  "software development",
  "informatics",
  "machine learning",
  "cybersecurity",
  "information technology",
];

function studentBackground(profile: StudentProfile): string {
  return `${profile.degree} ${profile.fieldOfStudy}`.trim();
}

export function academicFactor(
  profile: StudentProfile,
  course: Course,
): EligibilityFactor {
  const student = parseAcademicScore(profile.academicScore);
  const floor = course.minimumAcademicScore;
  const review = course.academicReviewScore;

  if (floor == null) {
    return {
      factor: "academic",
      status: "needs_verification",
      detail:
        "An academic threshold was not captured from the programme page, so academic eligibility stays unverified.",
    };
  }

  if (student == null) {
    return {
      factor: "academic",
      status: "needs_verification",
      detail: `Academic score was not provided. ${course.academicRequirementLabel}`,
    };
  }

  if (student < floor) {
    return {
      factor: "academic",
      status: "mismatch",
      detail: `Stated result maps to ${student.toFixed(0)}/100, below the ${floor}/100 comparison floor. ${course.academicRequirementLabel}`,
    };
  }

  if (review != null && student < review) {
    return {
      factor: "academic",
      status: "needs_verification",
      detail: `Stated result maps to ${student.toFixed(0)}/100. It clears the hard floor of ${floor}/100 but sits below ${review}/100, where the programme page leaves the decision to review. ${course.academicRequirementLabel}`,
    };
  }

  return {
    factor: "academic",
    status: "met",
    detail: `Stated result maps to ${student.toFixed(0)}/100 and clears the comparison threshold. ${course.academicRequirementLabel}`,
  };
}

function englishMeets(
  score: number | null,
  requirement: number | null,
): "unknown" | "met" | "below" | "not_required" {
  if (requirement == null) return "not_required";
  if (score == null) return "unknown";
  return score >= requirement ? "met" : "below";
}

export function englishFactor(
  profile: StudentProfile,
  course: Course,
): EligibilityFactor {
  const ielts = parseLooseNumber(profile.ielts);
  const toeflRaw = parseLooseNumber(profile.toefl);
  const hasClassic = course.toeflRequirement != null;
  const hasNew = course.toeflNewScaleRequirement != null;
  const hasIelts = course.ieltsRequirement != null;

  if (!hasIelts && !hasClassic && !hasNew) {
    return {
      factor: "english",
      status: "needs_verification",
      detail:
        "No English-language score was captured from the programme page. Confirm the requirement before treating English as satisfied.",
    };
  }

  const toeflIsNewScale = toeflRaw != null && toeflRaw <= 6;
  const toeflIsClassic = toeflRaw != null && toeflRaw > 6;
  const ieltsState = englishMeets(ielts, course.ieltsRequirement);
  const classicState = englishMeets(
    toeflIsClassic ? toeflRaw : null,
    course.toeflRequirement,
  );
  const newState = englishMeets(
    toeflIsNewScale ? toeflRaw : null,
    course.toeflNewScaleRequirement,
  );

  if (ieltsState === "met" || classicState === "met" || newState === "met") {
    const used =
      ieltsState === "met"
        ? `IELTS ${ielts} meets the stated ${course.ieltsRequirement}`
        : classicState === "met"
          ? `TOEFL iBT ${toeflRaw} meets the stated ${course.toeflRequirement}`
          : `TOEFL ${toeflRaw} meets the stated new-scale ${course.toeflNewScaleRequirement}`;
    return {
      factor: "english",
      status: "met",
      detail: `${used}. Universities often also set component minimums that this check does not score.`,
    };
  }

  const ieltsBelow = ieltsState === "below";
  const classicBelow = classicState === "below";
  const newBelow = newState === "below";
  const anyScoreKnown = ielts != null || toeflRaw != null;

  if (!anyScoreKnown) {
    const parts = [];
    if (hasIelts) parts.push(`IELTS ${course.ieltsRequirement}`);
    if (hasClassic) parts.push(`TOEFL iBT ${course.toeflRequirement}`);
    if (hasNew) parts.push(`TOEFL new scale ${course.toeflNewScaleRequirement}`);
    return {
      factor: "english",
      status: "needs_verification",
      detail: `No IELTS or TOEFL score was entered. The programme page lists ${parts.join(" or ")}.`,
    };
  }

  if (
    toeflRaw != null &&
    ielts == null &&
    ((toeflRaw <= 6 && !hasNew && hasClassic) ||
      (toeflRaw > 6 && !hasClassic && hasNew))
  ) {
    return {
      factor: "english",
      status: "needs_verification",
      detail:
        "The TOEFL score and the captured requirement use different scales, so they were not compared.",
    };
  }

  const belowBits: string[] = [];
  if (ieltsBelow) {
    belowBits.push(`IELTS ${ielts} is below the stated ${course.ieltsRequirement}`);
  }
  if (classicBelow) {
    belowBits.push(`TOEFL iBT ${toeflRaw} is below the stated ${course.toeflRequirement}`);
  }
  if (newBelow) {
    belowBits.push(
      `TOEFL ${toeflRaw} is below the stated new-scale ${course.toeflNewScaleRequirement}`,
    );
  }

  if (belowBits.length) {
    return {
      factor: "english",
      status: "mismatch",
      detail: `${belowBits.join(". ")}.`,
    };
  }

  return {
    factor: "english",
    status: "needs_verification",
    detail:
      "The entered English score could not be compared cleanly with the captured requirement.",
  };
}

export function backgroundFactor(
  profile: StudentProfile,
  course: Course,
): EligibilityFactor {
  const text = studentBackground(profile);
  if (!text) {
    return {
      factor: "background",
      status: "needs_verification",
      detail:
        "Degree and field of study were not provided, so background fit cannot be confirmed.",
    };
  }

  if (!course.acceptedBackgrounds.length) {
    return {
      factor: "background",
      status: "needs_verification",
      detail:
        "Accepted backgrounds were not captured from the programme page.",
    };
  }

  const student = text.toLowerCase();
  const studentHasComputing = COMPUTING_PHRASES.some((phrase) =>
    student.includes(phrase),
  );

  if (course.backgroundRule === "conversion_non_computing") {
    if (!text) {
      return {
        factor: "background",
        status: "needs_verification",
        detail:
          "This reads as a conversion programme. The undergraduate field is needed to check that the degree is outside computing.",
      };
    }
    if (studentHasComputing) {
      return {
        factor: "background",
        status: "mismatch",
        detail:
          "The programme page asks for a degree that is not already in computer science or a closely related computing subject.",
      };
    }
    return {
      factor: "background",
      status: "met",
      detail:
        "The stated field is outside computing, which matches a conversion programme. Quantitative preparation still needs a human check.",
    };
  }

  if (course.backgroundRule === "any_subject_review") {
    return {
      factor: "background",
      status: "needs_verification",
      detail:
        "The programme page accepts a broad range of degrees, with extra conditions such as programming or quantitative preparation that this check does not score.",
    };
  }

  const studentTokens = tokenSet(text);
  let best = 0;
  let bestLabel = course.acceptedBackgrounds[0];

  for (const background of course.acceptedBackgrounds) {
    const parts = tokens(background).map(stem);
    if (!parts.length) continue;
    const hit = parts.filter((part) => studentTokens.has(part)).length / parts.length;
    if (hit > best) {
      best = hit;
      bestLabel = background;
    }
  }

  const courseWantsComputing = course.acceptedBackgrounds.some((background) =>
    /computer|computing|informatics|software|data|artificial|cyber|engineer|math/.test(
      background.toLowerCase(),
    ),
  );

  if (studentHasComputing && courseWantsComputing) {
    return {
      factor: "background",
      status: "met",
      detail: `Stated background overlaps the published computing-related list (closest: ${bestLabel}).`,
    };
  }

  if (best >= 0.6) {
    return {
      factor: "background",
      status: "met",
      detail: `Stated background overlaps the published list (${bestLabel}).`,
    };
  }

  if (best >= 0.34) {
    return {
      factor: "background",
      status: "needs_verification",
      detail: `Partial overlap with "${bestLabel}". Check the programme page before treating the background as accepted.`,
    };
  }

  return {
    factor: "background",
    status: "mismatch",
    detail:
      "The stated degree or field does not match the backgrounds listed for this programme.",
  };
}

export function eligibilityFactors(
  profile: StudentProfile,
  course: Course,
): EligibilityFactor[] {
  return [
    academicFactor(profile, course),
    englishFactor(profile, course),
    backgroundFactor(profile, course),
  ];
}

export function combineEligibility(
  factors: EligibilityFactor[],
): EligibilityStatus {
  if (factors.some((factor) => factor.status === "mismatch")) {
    return "REQUIREMENT_MISMATCH";
  }
  if (factors.some((factor) => factor.status === "needs_verification")) {
    return "NEEDS_VERIFICATION";
  }
  return "LIKELY_COMPATIBLE";
}
