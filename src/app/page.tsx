import { redirect } from "next/navigation";
import { getCurrentUser, homePathForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Root entry: send each user to their role's home.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(homePathForRole(user.role));
}
