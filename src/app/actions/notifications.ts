"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

// Returned (not thrown) so the real reason reaches the browser. Next.js redacts
// thrown server-action error messages in production, which would otherwise hide
// the actual cause (missing service key, RLS, schema) behind a generic string.
export type SendResult = { ok: true } | { ok: false; error: string };

// Any signed-in user can send a free-text notification to any other user. The
// row is written server-side (service-role) because the recipient owns it; the
// sender is recorded as the actor so the recipient sees who it's from.
export async function sendMessage(input: {
  recipientId: string;
  body: string;
}): Promise<SendResult> {
  const user = await requireUser();
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Message can't be empty." };
  if (input.recipientId === user.id) {
    return { ok: false, error: "You can't send a message to yourself." };
  }

  // Confirm the recipient exists (the users directory is readable by everyone).
  const supabase = createClient();
  const { data: recipient } = await supabase
    .from("users")
    .select("id")
    .eq("id", input.recipientId)
    .single();
  if (!recipient) return { ok: false, error: "Recipient not found." };

  try {
    await notify({
      userId: input.recipientId,
      type: "message",
      actorId: user.id,
      actorName: user.full_name ?? user.email,
      body,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Could not send the notification." };
  }
}
