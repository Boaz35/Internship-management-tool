"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

// Any signed-in user can send a free-text notification to any other user. The
// row is written server-side (service-role) because the recipient owns it; the
// sender is recorded as the actor so the recipient sees who it's from.
export async function sendMessage(input: {
  recipientId: string;
  body: string;
}) {
  const user = await requireUser();
  const body = input.body.trim();
  if (!body) throw new Error("Message can't be empty.");
  if (input.recipientId === user.id) {
    throw new Error("You can't send a message to yourself.");
  }

  // Confirm the recipient exists (the users directory is readable by everyone).
  const supabase = createClient();
  const { data: recipient } = await supabase
    .from("users")
    .select("id")
    .eq("id", input.recipientId)
    .single();
  if (!recipient) throw new Error("Recipient not found.");

  await notify({
    userId: input.recipientId,
    type: "message",
    actorId: user.id,
    actorName: user.full_name ?? user.email,
    body,
  });
}
