/**
 * Canonical facts types (SPEC-0.0.8).
 */

export interface FactRow {
  id: string;
  canonical_text: string;
  tag_path: string | null;
  subject: string | null;
  predicate: string | null;
  object: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertFact {
  id?: string;
  canonical_text: string;
  tag_path?: string | null;
  subject?: string | null;
  predicate?: string | null;
  object?: string | null;
}
