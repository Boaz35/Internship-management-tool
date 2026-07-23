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

function toRows(input: NewNotification | NewNotification[]) {
  const list = Array.isArray(input) ? input : [input];
  return list.map((n) => ({
    user_id: n.userId,
    type: n.type,
    actor_id: n.actorId ?? null,
    actor_name: n.actorName ?? null,
    data: n.data ?? {},
    body: n.body ?? null,
    href: n.href ?? null,
  }));
}

// Insert one or more notifications using the service-role client, which bypasses
// RLS — necessary because the acting user writes rows OWNED BY OTHER users, and
// the notifications table has deliberately no insert policy for that reason.
//
// THROWS on failure so callers can surface the problem. The most common cause is
// a missing SUPABASE_SERVICE_ROLE_KEY in the environment — without it, no
// notification can ever be written. Event triggers should wrap this in
// `notifyQuiet` so a delivery hiccup can't roll back the task/link mutation;
// user-initiated sends (free-text messages) let it propagate for real feedback.
export async function notify(
  input: NewNotification | NewNotification[]
): Promise<void> {
  const rows = toRows(input);
  if (rows.length === 0) return;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Notifications are not configured: SUPABASE_SERVICE_ROLE_KEY is missing from the server environment."
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    throw new Error(`Could not save notification: ${error.message}`);
  }
}

// Best-effort variant for event triggers: never throws, only logs, so a failed
// notification can't break the underlying task/link mutation that caused it.
export async function notifyQuiet(
  input: NewNotification | NewNotification[]
): Promise<void> {
  try {
    await notify(input);
  } catch (err: any) {
    console.error("[notify]", err?.message ?? err);
  }
}
