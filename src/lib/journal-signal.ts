/**
 * Deterministic local heuristic for journal-like content.
 * Returns a score in [0..1]. No ML, no judgment.
 */
export function computeJournalScore(text: string): number {
  const t = (text || "").trim();
  if (!t) return 0;

  const lower = t.toLowerCase();

  const firstPerson = /\b(i|i'm|im|me|my|myself)\b/.test(lower);
  const feelings = /\b(feel|felt|feeling|anxious|stressed|overwhelmed|sad|mad|angry|excited|grateful)\b/.test(lower);
  const reflection = /\b(today|lately|recently|i realized|i notice|i keep|i want to|i need to|i'm trying to)\b/.test(lower);
  const longForm = t.length >= 240;
  const questions = (t.match(/\?/g) || []).length >= 2;
  const mentionsPeople = /\b(mom|dad|wife|husband|kids|son|daughter|friend|therapist|counselor|pastor)\b/.test(lower);

  let score = 0;
  if (firstPerson) score += 0.25;
  if (feelings) score += 0.30;
  if (reflection) score += 0.25;
  if (longForm) score += 0.10;
  if (questions) score += 0.05;
  if (mentionsPeople) score += 0.05;

  return Math.max(0, Math.min(1, score));
}
