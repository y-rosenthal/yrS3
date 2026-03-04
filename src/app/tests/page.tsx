import { redirect } from "next/navigation";

/** Redirect legacy /tests to question sets. */
export default function TestsRedirectPage() {
  redirect("/question-sets");
}
