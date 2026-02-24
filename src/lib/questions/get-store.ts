import { createClient } from "@/lib/supabase/server";
import { createFsQuestionStore } from "./store-fs";
import { createSupabaseQuestionStore } from "./store-supabase";
import type { QuestionStore } from "./store";

/** Use Supabase Storage when QUESTIONS_STORAGE=supabase (e.g. Vercel); else filesystem. */
export async function getQuestionStore(): Promise<QuestionStore> {
  if (process.env.QUESTIONS_STORAGE === "supabase") {
    const supabase = await createClient();
    return createSupabaseQuestionStore(supabase);
  }
  return createFsQuestionStore();
}
