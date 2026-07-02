import { redirect } from "next/navigation";

// Template editing now lives at the shared /template route (team leaders + mentors).
export default function LeaderTemplateRedirect() {
  redirect("/template");
}
