const STOP = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "your",
  "our",
  "msc",
  "masters",
  "master",
  "programme",
  "program",
]);

export function normalizeIntent(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bb\.?\s?tech\b/g, "bachelor technology engineering")
    .replace(/\bb\.e\b/g, "bachelor engineering")
    .replace(/\bb\.eng\b/g, "bachelor engineering")
    .replace(/\bm\.sc\b/g, "master science")
    .replace(/\bai\b/g, "artificial intelligence")
    .replace(/\bml\b/g, "machine learning")
    .replace(/\bnlp\b/g, "natural language processing")
    .replace(/\bcs\b/g, "computer science")
    .replace(/\bcyber\b/g, "cybersecurity");
}

export function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokens(text: string): string[] {
  return normalizeIntent(text)
    .split(/[^a-z0-9+]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP.has(token));
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokens(text).map(stem));
}

export function coverage(query: string, haystack: string): number {
  const needles = tokens(query).map(stem);
  if (!needles.length) return 0;
  const hay = tokenSet(haystack);
  const hits = needles.filter((token) => hay.has(token));
  return hits.length / needles.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
