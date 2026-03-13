/**
 * Fetches available tags for the tag filter bar.
 * Prefers GET /api/tags (taxonomy); falls back to GET /api/questions/tags when the taxonomy
 * is unavailable (non-OK response, non-JSON body, or unexpected shape). See SPEC-0.0.8.
 */
export async function fetchAvailableTags(): Promise<string[]> {
  try {
    const res = await fetch("/api/tags");
    if (!res.ok) {
      return fetchFallbackTags();
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return fetchFallbackTags();
    }
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof data[0] === "object" &&
      data[0] !== null &&
      "path" in data[0]
    ) {
      return (data as { path: string }[]).map((t) => t.path);
    }
    if (Array.isArray(data)) {
      return data as string[];
    }
    return fetchFallbackTags();
  } catch {
    return [];
  }
}

async function fetchFallbackTags(): Promise<string[]> {
  const fallback = await fetch("/api/questions/tags").then((r) => r.json().catch(() => []));
  return Array.isArray(fallback) ? fallback : [];
}
