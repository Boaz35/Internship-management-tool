// Server-only. Uses the service-role client, so it must never be imported into
// a client component — only server actions call it.
import { createAdminClient } from "@/lib/supabase/server";
import type { NotificationData, NotificationType } from "@/lib/database.types";

// A single notification to deliver to one recipient.
export type NewNotification = {
  userId: string; // recipient
  type: NotificationType;
  actorId?: string | null;
  actorName?: string | null;
  data?: NotificationData;
  body?: string | null;
  href?: string | null;
};

// Insert one or more notifications using the service-role client, which bypasses
// RLS — necessary because the acting user writes rows OWNED BY OTHER users, and
// the notifications table has no insert policy for that reason.
//
// Best-effort by design: a failure here is logged but never thrown, so a hiccup
// delivering a notification can't roll back the task/link mutation that caused
// it. Callers `await` it but don't need to guard it.
export async function notify(
  input: NewNotification | NewNotification[]
): Promise<void> {
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) return;

  const rows = list.map((n) => ({
    user_id: n.userId,
    type: n.type,
    actor_id: n.actorId ?? null,
    actor_name: n.actorName ?? null,
    data: n.data ?? {},
    body: n.body ?? null,
    href: n.href ?? null,
  }));

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert(rows);
    if (error) console.error("[notify] insert failed:", error.message);
  } catch (err: any) {
    console.error("[notify] threw:", err?.message ?? err);
  }
}
