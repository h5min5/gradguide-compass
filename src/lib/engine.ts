import { findAlternatives } from "./alternatives";
import { askNext } from "./information-gain";
import { getCourses } from "./courses";
import { rankCourses } from "./recommend";
import { recommendationStability } from "./stability";

export function runCounselling(profile: Parameters<typeof rankCourses>[0]) {
  const courses = getCourses();
  const ranked = rankCourses(profile, courses);
  return {
    courses,
    ranked,
    ask: askNext(profile, courses),
    stability: recommendationStability(profile, courses),
    alternativesFor(courseId: string) {
      return findAlternatives(
        courseId,
        ranked,
        profile.preferredCountry,
        profile.secondaryCountry,
      );
    },
  };
}
