import { rankCourses, topIds } from "./recommend";
import type {
  Course,
  StabilityInsight,
  StabilityLabel,
  StudentProfile,
} from "./types";
import { DEFAULT_WEIGHTS } from "./types";

interface Scenario {
  id: string;
  group: "baseline" | "budget" | "career" | "subject" | "country";
  profile: StudentProfile;
  weights: typeof DEFAULT_WEIGHTS;
}

function labelFor(ratio: number): StabilityLabel {
  if (ratio >= 0.75) return "HIGH";
  if (ratio >= 0.45) return "MEDIUM";
  return "LOW";
}

function scenariosFor(
  profile: StudentProfile,
): { scenarios: Scenario[]; budgetSkipped: boolean } {
  const scenarios: Scenario[] = [
    {
      id: "baseline",
      group: "baseline",
      profile,
      weights: DEFAULT_WEIGHTS,
    },
  ];

  const budget = Number(profile.maxTuitionBudget);
  const budgetSkipped = !Number.isFinite(budget) || budget <= 0;
  if (!budgetSkipped) {
    for (const factor of [0.8, 0.9, 1.1, 1.2]) {
      scenarios.push({
        id: `budget-${factor}`,
        group: "budget",
        profile: {
          ...profile,
          maxTuitionBudget: String(Math.round(budget * factor)),
        },
        weights: DEFAULT_WEIGHTS,
      });
    }
  }

  scenarios.push(
    {
      id: "career-up",
      group: "career",
      profile,
      weights: {
        academic: 22,
        career: 34,
        subject: 12,
        budget: 14,
        country: 10,
        intake: 8,
      },
    },
    {
      id: "career-down",
      group: "career",
      profile,
      weights: {
        academic: 25,
        career: 15,
        subject: 22,
        budget: 16,
        country: 12,
        intake: 10,
      },
    },
    {
      id: "subject-up",
      group: "subject",
      profile,
      weights: {
        academic: 22,
        career: 18,
        subject: 28,
        budget: 14,
        country: 10,
        intake: 8,
      },
    },
    {
      id: "subject-down",
      group: "subject",
      profile,
      weights: {
        academic: 26,
        career: 27,
        subject: 8,
        budget: 16,
        country: 13,
        intake: 10,
      },
    },
  );

  if (profile.preferredCountry.trim() && profile.secondaryCountry.trim()) {
    scenarios.push({
      id: "country-swap",
      group: "country",
      profile: {
        ...profile,
        preferredCountry: profile.secondaryCountry,
        secondaryCountry: profile.preferredCountry,
      },
      weights: DEFAULT_WEIGHTS,
    });
  }

  scenarios.push({
    id: "country-ignore",
    group: "country",
    profile: { ...profile, preferredCountry: "", secondaryCountry: "" },
    weights: DEFAULT_WEIGHTS,
  });

  const used = new Set(
    [profile.preferredCountry, profile.secondaryCountry]
      .map((country) => country.trim().toLowerCase())
      .filter(Boolean),
  );
  const alternate = ["Ireland", "United Kingdom", "United States"].find(
    (country) => !used.has(country.toLowerCase()),
  );
  if (alternate) {
    scenarios.push({
      id: "country-alternate",
      group: "country",
      profile: {
        ...profile,
        preferredCountry: alternate,
        secondaryCountry: profile.preferredCountry,
      },
      weights: DEFAULT_WEIGHTS,
    });
  }

  return { scenarios, budgetSkipped };
}

export function recommendationStability(
  profile: StudentProfile,
  courses: Course[],
): {
  insights: StabilityInsight[];
  scenarioCount: number;
  budgetSkipped: boolean;
} {
  const { scenarios, budgetSkipped } = scenariosFor(profile);
  const tops = scenarios.map((scenario) =>
    new Set(topIds(rankCourses(scenario.profile, courses, scenario.weights), 5)),
  );
  const baselineTop = tops[0];

  const insights = courses.map((course) => {
    const hits = tops.filter((top) => top.has(course.id)).length;
    const stability = hits / scenarios.length;
    const observations: string[] = [];

    const droppedFrom = (group: Scenario["group"]) =>
      scenarios.some((scenario, index) => {
        if (scenario.group !== group) return false;
        return baselineTop.has(course.id) && !tops[index].has(course.id);
      });

    const heldIn = (group: Scenario["group"]) => {
      const indexes = scenarios
        .map((scenario, index) => (scenario.group === group ? index : -1))
        .filter((index) => index >= 0);
      return (
        indexes.length > 0 &&
        baselineTop.has(course.id) &&
        indexes.every((index) => tops[index].has(course.id))
      );
    };

    if (droppedFrom("budget")) observations.push("Sensitive to budget");
    if (heldIn("country")) {
      observations.push("Remains strong if country preference changes");
    }
    if (droppedFrom("career")) {
      observations.push("Ranking depends heavily on career alignment");
    }
    if (droppedFrom("subject")) {
      observations.push("Sensitive to how much subject fit is emphasised");
    }

    const percent = Math.round(stability * 100);
    const label = labelFor(stability);
    return {
      courseId: course.id,
      stability,
      label,
      summary: `Stayed within the Top 5 in ${percent}% of tested preference variations.`,
      observations,
      scenariosInTop5: hits,
      totalScenarios: scenarios.length,
    } satisfies StabilityInsight;
  });

  return { insights, scenarioCount: scenarios.length, budgetSkipped };
}
