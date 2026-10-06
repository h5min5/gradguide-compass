export type EligibilityStatus =
  | "LIKELY_COMPATIBLE"
  | "NEEDS_VERIFICATION"
  | "REQUIREMENT_MISMATCH";

export type DataConfidence = "high" | "medium" | "low";

export type StabilityLabel = "HIGH" | "MEDIUM" | "LOW";

export type CurrencyCode = "EUR" | "GBP" | "USD";

export interface Course {
  id: string;
  courseName: string;
  university: string;
  city: string;
  country: string;
  tuitionFee: number | null;
  currency: CurrencyCode | null;
  tuitionBasis: string;
  durationMonths: number | null;
  intakes: string[];
  /** Hard comparison floor on a 0–100 profile scale. Below this is a mismatch. */
  minimumAcademicScore: number | null;
  /**
   * When set, a score between the hard floor and this value needs a human check
   * because the programme page leaves room for discretion.
   */
  academicReviewScore: number | null;
  academicRequirementLabel: string;
  acceptedBackgrounds: string[];
  /** conversion_non_computing means the page asks for a degree outside computing. */
  backgroundRule?: "match_list" | "conversion_non_computing" | "any_subject_review";
  ieltsRequirement: number | null;
  /** Classic TOEFL iBT total (0–120) when the page states one. */
  toeflRequirement: number | null;
  /** New TOEFL 1–6 scale when the page states one. */
  toeflNewScaleRequirement: number | null;
  subjects: string[];
  careerPaths: string[];
  description: string;
  officialUrl: string;
  lastVerified: string;
  dataConfidence: DataConfidence;
  dataStatus: string;
}

export interface StudentProfile {
  name: string;
  degree: string;
  fieldOfStudy: string;
  academicScore: string;
  graduationYear: string;
  careerGoal: string;
  interests: string;
  preferredCountry: string;
  secondaryCountry: string;
  maxTuitionBudget: string;
  budgetCurrency: CurrencyCode;
  desiredCourseArea: string;
  preferredIntake: string;
  ielts: string;
  toefl: string;
  gre: string;
  experience: string;
}

export interface ScoreWeights {
  academic: number;
  career: number;
  subject: number;
  budget: number;
  country: number;
  intake: number;
}

export interface EligibilityFactor {
  factor: "academic" | "english" | "background";
  status: "met" | "needs_verification" | "mismatch";
  detail: string;
}

export interface ScoredCourse {
  course: Course;
  overallScore: number;
  academicScore: number;
  careerScore: number;
  subjectScore: number;
  budgetScore: number;
  countryScore: number;
  intakeScore: number;
  eligibilityStatus: EligibilityStatus;
  eligibilityFactors: EligibilityFactor[];
  reasons: string[];
  warnings: string[];
  positives: string[];
  negatives: string[];
  factorNotes: {
    academic: string;
    career: string;
    subject: string;
    budget: string;
    country: string;
    intake: string;
  };
}

export interface RankedCourse extends ScoredCourse {
  rank: number;
}

export type OverrideReason =
  | "Student expressed stronger preference"
  | "Programme content preferred"
  | "Research orientation"
  | "Career considerations"
  | "Updated information not captured"
  | "Other";

export interface LedgerEntry {
  id: string;
  courseId: string;
  courseName: string;
  university: string;
  originalRank: number;
  originalScore: number;
  newPriority: number;
  reason: OverrideReason;
  note: string;
  timestamp: string;
  action: "prioritize" | "clear";
}

export interface AlternativeSuggestion {
  kind:
    | "cheaper"
    | "career"
    | "eligibility"
    | "country";
  title: string;
  courseId: string;
  explanation: string;
}

export interface AskNextResult {
  fieldId: string;
  question: string;
  informationGainScore: number;
  why: string;
  rankingNote: string;
  eligibilityNote: string;
  viableNote: string;
}

export interface StabilityInsight {
  courseId: string;
  stability: number;
  label: StabilityLabel;
  summary: string;
  observations: string[];
  scenariosInTop5: number;
  totalScenarios: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  academic: 25,
  career: 25,
  subject: 15,
  budget: 15,
  country: 10,
  intake: 10,
};

export const ELIGIBILITY_ORDER: Record<EligibilityStatus, number> = {
  LIKELY_COMPATIBLE: 0,
  NEEDS_VERIFICATION: 1,
  REQUIREMENT_MISMATCH: 2,
};
