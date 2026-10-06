import { scoreCourse } from "./scoring";
import type {
  Course,
  RankedCourse,
  ScoreWeights,
  StudentProfile,
} from "./types";
import { DEFAULT_WEIGHTS, ELIGIBILITY_ORDER } from "./types";

export function rankCourses(
  profile: StudentProfile,
  courses: Course[],
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): RankedCourse[] {
  const scored = courses.map((course) => scoreCourse(profile, course, weights));
  scored.sort((a, b) => {
    const eligibilityGap =
      ELIGIBILITY_ORDER[a.eligibilityStatus] -
      ELIGIBILITY_ORDER[b.eligibilityStatus];
    if (eligibilityGap !== 0) return eligibilityGap;
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    return a.course.id.localeCompare(b.course.id);
  });

  return scored.map((item, index) => ({ ...item, rank: index + 1 }));
}

export function topIds(ranked: RankedCourse[], count = 5): string[] {
  return ranked.slice(0, count).map((item) => item.course.id);
}
