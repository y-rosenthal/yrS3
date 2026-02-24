import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Check if current user is an author (from authors table or claim). */
export async function isAuthor(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("authors")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  return !!data;
}

export async function requireAuthor() {
  const user = await requireUser();
  const author = await isAuthor();
  if (!author) redirect("/");
  return user;
}
