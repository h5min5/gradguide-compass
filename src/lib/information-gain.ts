import { rankCourses, topIds } from "./recommend";
import type { AskNextResult, Course, StudentProfile } from "./types";

interface ScenarioResult {
  top: string[];
  statuses: string[];
  viable: number;
}

function snapshot(profile: StudentProfile, courses: Course[]): ScenarioResult {
  const ranked = rankCourses(profile, courses);
  const viable = ranked.filter(
    (item) =>
      item.eligibilityStatus !== "REQUIREMENT_MISMATCH" && item.overallScore >= 50,
  ).length;
  return {
    top: topIds(ranked, 5),
    statuses: ranked.map((item) => item.eligibilityStatus),
    viable,
  };
}

function jaccardDistance(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  let intersection = 0;
  for (const id of a) if (b.has(id)) intersection += 1;
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return 1 - intersection / union;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface Candidate {
  fieldId: string;
  question: string;
  profiles: StudentProfile[];
}

function withField(
  profile: StudentProfile,
  field: keyof StudentProfile,
  value: string,
): StudentProfile {
  return { ...profile, [field]: value };
}

function candidatesFor(profile: StudentProfile): Candidate[] {
  const candidates: Candidate[] = [];
  const currency = profile.budgetCurrency;

  if (!profile.maxTuitionBudget.trim()) {
    const amounts =
      currency === "GBP"
        ? ["15000", "22000", "30000", "45000"]
        : currency === "USD"
          ? ["20000", "35000", "50000", "70000"]
          : ["20000", "25000", "35000", "50000", "70000"];
    candidates.push({
      fieldId: "maxTuitionBudget",
      question: "What's the maximum tuition budget you're comfortable with?",
      profiles: amounts.map((amount) =>
        withField(profile, "maxTuitionBudget", amount),
      ),
    });
  }

  if (!profile.ielts.trim()) {
    candidates.push({
      fieldId: "ielts",
      question: "Do you already have an IELTS score?",
      profiles: ["5.5", "6.0", "6.5", "7.0", "7.5"].map((score) =>
        withField(profile, "ielts", score),
      ),
    });
  }

  if (!profile.preferredCountry.trim()) {
    candidates.push({
      fieldId: "preferredCountry",
      question: "Which country would you most like to study in?",
      profiles: ["Ireland", "United Kingdom", "United States"].map((country) =>
        withField(profile, "preferredCountry", country),
      ),
    });
  } else if (profile.preferredCountry.trim() && profile.secondaryCountry.trim()) {
    const preferred = profile.preferredCountry.trim();
    const secondary = profile.secondaryCountry.trim();
    candidates.push({
      fieldId: "countryStrength",
      question: `Would you strongly prefer ${preferred} over ${secondary}?`,
      profiles: [
        { ...profile, secondaryCountry: "" },
        {
          ...profile,
          preferredCountry: secondary,
          secondaryCountry: preferred,
        },
        { ...profile, preferredCountry: "", secondaryCountry: "" },
      ],
    });
  }

  if (!profile.careerGoal.trim()) {
    candidates.push({
      fieldId: "careerGoal",
      question: "What career role is the student aiming for after the master's?",
      profiles: [
        "Machine Learning Engineer",
        "Data Scientist",
        "Software Engineer",
        "Cybersecurity Analyst",
        "AI Researcher",
      ].map((goal) => withField(profile, "careerGoal", goal)),
    });
  }

  if (!profile.academicScore.trim()) {
    candidates.push({
      fieldId: "academicScore",
      question: "What is the student's CGPA or percentage?",
      profiles: ["6.0/10", "7.0/10", "8.0/10", "9.1/10"].map((score) =>
        withField(profile, "academicScore", score),
      ),
    });
  }

  if (!profile.desiredCourseArea.trim()) {
    candidates.push({
      fieldId: "desiredCourseArea",
      question: "Which course area should we prioritize?",
      profiles: [
        "Artificial Intelligence",
        "Data Science",
        "Computer Science",
        "Software Engineering",
        "Cybersecurity",
      ].map((area) => withField(profile, "desiredCourseArea", area)),
    });
  }

  if (!profile.preferredIntake.trim()) {
    candidates.push({
      fieldId: "preferredIntake",
      question: "Which intake is the student targeting?",
      profiles: ["September", "January", "October"].map((intake) =>
        withField(profile, "preferredIntake", intake),
      ),
    });
  }

  if (!profile.fieldOfStudy.trim() && !profile.degree.trim()) {
    candidates.push({
      fieldId: "fieldOfStudy",
      question: "What was the student's undergraduate field of study?",
      profiles: [
        "Computer Science",
        "Artificial Intelligence",
        "Electrical Engineering",
        "Mathematics",
        "Business",
      ].map((field) => withField(profile, "fieldOfStudy", field)),
    });
  }

  if (!profile.interests.trim()) {
    candidates.push({
      fieldId: "interests",
      question: "Which subjects is the student most interested in?",
      profiles: [
        "machine learning, natural language processing",
        "data science, statistics",
        "software engineering",
        "cybersecurity",
      ].map((interest) => withField(profile, "interests", interest)),
    });
  }

  if (!profile.toefl.trim() && !profile.ielts.trim()) {
    candidates.push({
      fieldId: "toefl",
      question: "If there is no IELTS score, is there a TOEFL score?",
      profiles: ["80", "90", "100", "110"].map((score) =>
        withField(profile, "toefl", score),
      ),
    });
  }

  if (!profile.experience.trim()) {
    candidates.push({
      fieldId: "experience",
      question: "What work or internship experience should we factor in?",
      profiles: [
        "machine learning internship",
        "software engineering internship",
        "cybersecurity internship",
        "research project in natural language processing",
      ].map((experience) => withField(profile, "experience", experience)),
    });
  }

  return candidates;
}

export function askNext(
  profile: StudentProfile,
  courses: Course[],
): AskNextResult | null {
  const baseline = snapshot(profile, courses);
  const courseCount = Math.max(courses.length, 1);
  let best: AskNextResult | null = null;

  for (const candidate of candidatesFor(profile)) {
    const runs = candidate.profiles.map((nextProfile) =>
      snapshot(nextProfile, courses),
    );
    const rankingDistances = runs.map((run) =>
      jaccardDistance(baseline.top, run.top),
    );
    const flips = runs.map((run) => {
      let changed = 0;
      for (let index = 0; index < baseline.statuses.length; index += 1) {
        if (baseline.statuses[index] !== run.statuses[index]) changed += 1;
      }
      return changed / courseCount;
    });
    const viableCounts = runs.map((run) => run.viable);
    const viableSpread =
      (Math.max(...viableCounts) - Math.min(...viableCounts)) / courseCount;
    const topChanged =
      runs.filter((run) => run.top[0] !== baseline.top[0]).length / runs.length;

    const rankingImpact = average(rankingDistances);
    const eligibilityImpact = average(flips);
    const informationGainScore = Math.round(
      100 *
        (0.4 * rankingImpact +
          0.15 * topChanged +
          0.3 * eligibilityImpact +
          0.15 * viableSpread),
    );

    const changedRankings = runs.filter(
      (run) => jaccardDistance(baseline.top, run.top) > 0,
    ).length;
    const meanFlips = Math.round(average(flips) * courseCount);
    const viableMin = Math.min(...viableCounts);
    const viableMax = Math.max(...viableCounts);

    const result: AskNextResult = {
      fieldId: candidate.fieldId,
      question: candidate.question,
      informationGainScore,
      rankingNote: `In ${changedRankings} of ${runs.length} simulated answers, the current top 5 changed.`,
      eligibilityNote: `Those answers changed eligibility status for about ${meanFlips} course${meanFlips === 1 ? "" : "s"} on average.`,
      viableNote: `The number of viable courses (not a requirement mismatch, and scored at least 50) ranged from ${viableMin} to ${viableMax}.`,
      why: "",
    };
    result.why = `${result.rankingNote} ${result.eligibilityNote} ${result.viableNote} Information gain is ${informationGainScore}/100 against the profile as it stands.`;

    if (
      !best ||
      result.informationGainScore > best.informationGainScore ||
      (result.informationGainScore === best.informationGainScore &&
        result.question.localeCompare(best.question) < 0)
    ) {
      best = result;
    }
  }

  return best;
}
