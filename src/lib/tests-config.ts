/**
 * MVP tests: defined as list of question ids in config or file.
 */

export interface TestDef {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
}

const DEFAULT_TESTS: TestDef[] = [
  {
    id: "test-1",
    title: "Sample Test",
    description: "First test",
    questionIds: ["q-mult-001"],
  },
];

let cachedTests: TestDef[] | null = null;

/** Load tests from env (JSON) or use defaults. */
export function getTestsConfig(): TestDef[] {
  if (cachedTests) return cachedTests;
  const raw = process.env.TESTS_CONFIG;
  if (raw) {
    try {
      cachedTests = JSON.parse(raw) as TestDef[];
      return cachedTests!;
    } catch {
      // fallback
    }
  }
  cachedTests = DEFAULT_TESTS;
  return cachedTests;
}

export function getTestById(id: string): TestDef | undefined {
  return getTestsConfig().find((t) => t.id === id);
}
