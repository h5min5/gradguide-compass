import { toEur } from "./currency";
import { parseLooseNumber } from "./profile";
import type { EligibilityStatus, RankedCourse } from "./types";

export interface CatalogueFilters {
  keyword: string;
  university: string;
  country: string;
  subject: string;
  maxTuitionEur: string;
  intake: string;
  eligibility: "" | EligibilityStatus;
}

export const EMPTY_FILTERS: CatalogueFilters = {
  keyword: "",
  university: "",
  country: "",
  subject: "",
  maxTuitionEur: "",
  intake: "",
  eligibility: "",
};

export function applyFilters(
  ranked: RankedCourse[],
  filters: CatalogueFilters,
): RankedCourse[] {
  const keyword = filters.keyword.trim().toLowerCase();
  const maxTuition = parseLooseNumber(filters.maxTuitionEur);

  return ranked.filter((item) => {
    const course = item.course;
    if (keyword) {
      const haystack = [
        course.courseName,
        course.university,
        course.city,
        course.country,
        course.description,
        ...course.subjects,
        ...course.careerPaths,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (filters.university && course.university !== filters.university) return false;
    if (filters.country && course.country !== filters.country) return false;
    if (filters.subject) {
      const blob = `${course.courseName} ${course.subjects.join(" ")}`.toLowerCase();
      if (!blob.includes(filters.subject.toLowerCase())) return false;
    }
    if (filters.intake) {
      const match = course.intakes.some(
        (intake) => intake.toLowerCase() === filters.intake.toLowerCase(),
      );
      if (!match) return false;
    }
    if (filters.eligibility && item.eligibilityStatus !== filters.eligibility) {
      return false;
    }
    if (maxTuition != null) {
      const fee =
        course.tuitionFee == null ? null : toEur(course.tuitionFee, course.currency);
      if (fee == null || fee > maxTuition) return false;
    }
    return true;
  });
}
