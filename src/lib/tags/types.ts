/**
 * Hierarchical tag types (SPEC-0.0.8). Path separator is "/" (e.g. programming/python/if).
 */

export interface TagRow {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface InsertTag {
  id?: string;
  name: string;
  parent_id?: string | null;
  path: string;
}

export interface TagTreeNode extends TagRow {
  children?: TagTreeNode[];
}
