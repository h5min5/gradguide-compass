import { clamp } from "./text";

/**
 * Maps a counsellor-entered result onto a 0–100 comparison scale.
 * 9.1/10 → 91, 3.6/4 → 90, 85% → 85.
 * A bare number at or below 4 is treated as a 4.0 GPA.
 * A bare number above 4 and at or below 10 is treated as a 10-point CGPA.
 */
export function parseAcademicScore(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  const ratio = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (ratio) {
    const value = Number(ratio[1]);
    const scale = Number(ratio[2]);
    if (!Number.isFinite(value) || !Number.isFinite(scale) || scale <= 0) {
      return null;
    }
    return clamp((value / scale) * 100, 0, 100);
  }

  const percent = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) return clamp(Number(percent[1]), 0, 100);

  const numeric = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(numeric)) return null;
  if (numeric <= 4) return clamp((numeric / 4) * 100, 0, 100);
  if (numeric <= 10) return clamp(numeric * 10, 0, 100);
  return clamp(numeric, 0, 100);
}
