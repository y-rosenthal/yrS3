/**
 * Four-part semantic version for questions: Q_MAJ.Q_MIN.A_MAJ.A_MIN.
 * Per plan: required from day one; no two-part fallback.
 */

export const INITIAL_VERSION = "1.0.0.0";

const VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;

export interface VersionParts {
  qMaj: number;
  qMin: number;
  aMaj: number;
  aMin: number;
}

/**
 * Parse a four-part version string. Returns null if invalid.
 */
export function parseVersion(version: string): VersionParts | null {
  const m = version.trim().match(VERSION_REGEX);
  if (!m) return null;
  const qMaj = parseInt(m[1], 10);
  const qMin = parseInt(m[2], 10);
  const aMaj = parseInt(m[3], 10);
  const aMin = parseInt(m[4], 10);
  if (qMaj < 0 || qMin < 0 || aMaj < 0 || aMin < 0) return null;
  return { qMaj, qMin, aMaj, aMin };
}

/**
 * Validate that a string is a valid four-part version.
 */
export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}

/**
 * Compare two version strings. Returns negative if a < b, zero if equal, positive if a > b.
 * Invalid versions are always considered less than valid ones so they sort last when ordering by version descending.
 */
export function compareVersion(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (pa === null && pb === null) return 0;
  if (pa === null) return -1;
  if (pb === null) return 1;
  if (pa.qMaj !== pb.qMaj) return pa.qMaj - pb.qMaj;
  if (pa.qMin !== pb.qMin) return pa.qMin - pb.qMin;
  if (pa.aMaj !== pb.aMaj) return pa.aMaj - pb.aMaj;
  return pa.aMin - pb.aMin;
}

/**
 * Serialize version parts back to string.
 */
export function formatVersion(parts: VersionParts): string {
  return `${parts.qMaj}.${parts.qMin}.${parts.aMaj}.${parts.aMin}`;
}

/**
 * Bump question major (meaning change). Resets Q_MIN and can optionally reset A parts.
 * Plan: when question meaning changes, we bump Q_MAJ; A parts stay unless editor also changed answers.
 * We keep A parts as-is when bumping Q_MAJ (editor can bump A in same edit if needed).
 */
export function bumpQuestionMajor(current: string): string | null {
  const p = parseVersion(current);
  if (!p) return null;
  return formatVersion({
    qMaj: p.qMaj + 1,
    qMin: 0,
    aMaj: p.aMaj,
    aMin: p.aMin,
  });
}

/**
 * Bump question minor (wording only).
 */
export function bumpQuestionMinor(current: string): string | null {
  const p = parseVersion(current);
  if (!p) return null;
  return formatVersion({
    ...p,
    qMin: p.qMin + 1,
  });
}

/**
 * Bump answer major (meaning/correctness change). Resets A_MIN.
 */
export function bumpAnswerMajor(current: string): string | null {
  const p = parseVersion(current);
  if (!p) return null;
  return formatVersion({
    ...p,
    aMaj: p.aMaj + 1,
    aMin: 0,
  });
}

/**
 * Bump answer minor (wording or equivalent answer added).
 */
export function bumpAnswerMinor(current: string): string | null {
  const p = parseVersion(current);
  if (!p) return null;
  return formatVersion({
    ...p,
    aMin: p.aMin + 1,
  });
}

export type VersionBumpType =
  | "question_major"
  | "question_minor"
  | "answer_major"
  | "answer_minor";

/**
 * Bump version by the given type. Returns new version string or null if current is invalid.
 */
export function bumpVersion(
  current: string,
  bumpType: VersionBumpType
): string | null {
  switch (bumpType) {
    case "question_major":
      return bumpQuestionMajor(current);
    case "question_minor":
      return bumpQuestionMinor(current);
    case "answer_major":
      return bumpAnswerMajor(current);
    case "answer_minor":
      return bumpAnswerMinor(current);
    default:
      return null;
  }
}
