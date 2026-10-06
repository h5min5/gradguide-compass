import { toEur } from "./currency";
import { coverage } from "./text";
import type { AlternativeSuggestion, RankedCourse } from "./types";
import { ELIGIBILITY_ORDER } from "./types";

function subjectOverlap(a: RankedCourse, b: RankedCourse): number {
  const left = a.course.subjects.join(" ");
  const right = [b.course.courseName, b.course.subjects.join(" ")].join(" ");
  return coverage(left, right);
}

function feeEur(item: RankedCourse): number | null {
  if (item.course.tuitionFee == null) return null;
  return toEur(item.course.tuitionFee, item.course.currency);
}

export function findAlternatives(
  selectedId: string,
  ranked: RankedCourse[],
  preferredCountry: string,
  secondaryCountry: string,
): AlternativeSuggestion[] {
  const selected = ranked.find((item) => item.course.id === selectedId);
  if (!selected) return [];

  const others = ranked.filter((item) => item.course.id !== selectedId);
  const suggestions: AlternativeSuggestion[] = [];
  const used = new Set<string>();

  const selectedFee = feeEur(selected);
  const cheaper = others
    .map((item) => ({ item, fee: feeEur(item), overlap: subjectOverlap(selected, item) }))
    .filter(
      (entry) =>
        entry.fee != null &&
        selectedFee != null &&
        entry.fee < selectedFee &&
        entry.overlap >= 0.34,
    )
    .sort((a, b) => {
      if (b.item.overallScore !== a.item.overallScore) {
        return b.item.overallScore - a.item.overallScore;
      }
      return (a.fee ?? 0) - (b.fee ?? 0);
    })[0];

  if (cheaper) {
    used.add(cheaper.item.course.id);
    const gap = Math.round((selectedFee ?? 0) - (cheaper.fee ?? 0));
    suggestions.push({
      kind: "cheaper",
      title: "Similar but cheaper",
      courseId: cheaper.item.course.id,
      explanation: `${cheaper.item.course.courseName} at ${cheaper.item.course.university} shares subject ground with the selected course and its captured tuition is about €${gap.toLocaleString("en-IE")} lower after approximate conversion. Match score is ${cheaper.item.overallScore}/100.`,
    });
  }

  const strongerCareer = others
    .filter((item) => !used.has(item.course.id))
    .map((item) => ({ item, overlap: subjectOverlap(selected, item) }))
    .filter(
      (entry) =>
        entry.item.careerScore > selected.careerScore && entry.overlap >= 0.2,
    )
    .sort((a, b) => {
      if (b.item.careerScore !== a.item.careerScore) {
        return b.item.careerScore - a.item.careerScore;
      }
      return b.item.overallScore - a.item.overallScore;
    })[0];

  if (strongerCareer) {
    used.add(strongerCareer.item.course.id);
    suggestions.push({
      kind: "career",
      title: "Stronger career alignment",
      courseId: strongerCareer.item.course.id,
      explanation: `${strongerCareer.item.course.courseName} scores ${strongerCareer.item.careerScore}/25 on career alignment, compared with ${selected.careerScore}/25 for the selected course, with overlapping subject matter.`,
    });
  }

  const clearer = others
    .filter((item) => !used.has(item.course.id))
    .map((item) => ({ item, overlap: subjectOverlap(selected, item) }))
    .filter((entry) => {
      const betterStatus =
        ELIGIBILITY_ORDER[entry.item.eligibilityStatus] <
        ELIGIBILITY_ORDER[selected.eligibilityStatus];
      const fewerWarnings =
        entry.item.eligibilityStatus === selected.eligibilityStatus &&
        entry.item.warnings.length < selected.warnings.length;
      return (betterStatus || fewerWarnings) && entry.overlap >= 0.2;
    })
    .sort((a, b) => {
      const statusGap =
        ELIGIBILITY_ORDER[a.item.eligibilityStatus] -
        ELIGIBILITY_ORDER[b.item.eligibilityStatus];
      if (statusGap !== 0) return statusGap;
      if (a.item.warnings.length !== b.item.warnings.length) {
        return a.item.warnings.length - b.item.warnings.length;
      }
      return b.item.overallScore - a.item.overallScore;
    })[0];

  if (clearer) {
    used.add(clearer.item.course.id);
    suggestions.push({
      kind: "eligibility",
      title: "Higher eligibility confidence",
      courseId: clearer.item.course.id,
      explanation: `${clearer.item.course.courseName} is ${clearer.item.eligibilityStatus.replaceAll("_", " ").toLowerCase()} with ${clearer.item.warnings.length} warning${clearer.item.warnings.length === 1 ? "" : "s"}, compared with ${selected.eligibilityStatus.replaceAll("_", " ").toLowerCase()} and ${selected.warnings.length} warning${selected.warnings.length === 1 ? "" : "s"} on the selected course.`,
    });
  }

  const preferred = preferredCountry.trim().toLowerCase();
  const secondary = secondaryCountry.trim().toLowerCase();
  const countryTarget = others
    .filter((item) => !used.has(item.course.id))
    .map((item) => ({ item, overlap: subjectOverlap(selected, item) }))
    .filter((entry) => {
      if (entry.item.course.country === selected.course.country) return false;
      if (entry.overlap < 0.2) return false;
      const country = entry.item.course.country.toLowerCase();
      if (preferred || secondary) {
        return country === preferred || country === secondary;
      }
      return true;
    })
    .sort((a, b) => b.item.overallScore - a.item.overallScore)[0];

  if (countryTarget) {
    const country = countryTarget.item.course.country;
    const role =
      country.toLowerCase() === preferred
        ? "preferred country"
        : country.toLowerCase() === secondary
          ? "secondary country"
          : "another country in the catalogue";
    suggestions.push({
      kind: "country",
      title: "Similar course in another preferred country",
      courseId: countryTarget.item.course.id,
      explanation: `${countryTarget.item.course.courseName} at ${countryTarget.item.course.university} is a subject-similar option in ${country}, the student's ${role}. Match score is ${countryTarget.item.overallScore}/100.`,
    });
  }

  return suggestions;
}
