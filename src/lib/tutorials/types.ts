/**
 * Minimal tutorial content types (SPEC-0.0.8). Four modes: direct, pointer_only, pointer_plus_full, pointer_plus_excerpt.
 */

export type TutorialContentMode =
  | "direct"
  | "pointer_only"
  | "pointer_plus_full"
  | "pointer_plus_excerpt";

export interface TutorialRow {
  id: string;
  title: string | null;
  external_ref: string | null;
  content_mode: TutorialContentMode;
  stored_content_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertTutorial {
  title?: string | null;
  external_ref?: string | null;
  content_mode?: TutorialContentMode;
  stored_content_path?: string | null;
}
