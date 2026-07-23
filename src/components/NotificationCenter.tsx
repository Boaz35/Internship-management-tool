"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/notifications";
import type { NotificationRow, UserRow } from "@/lib/database.types";

type Tr = ReturnType<typeof useTranslations>;

// Render a notification's title + body from its type + payload, localised.
function describe(n: NotificationRow, t: Tr): { title: string; body: string } {
  const d = n.data ?? {};
  switch (n.type) {
    case "task_added":
      return { title: t("taskAddedTitle"), body: d.taskName ?? "" };
    case "link_added":
      return {
        title: t("linkAddedTitle"),
        body: t("linkAddedBody", { task: d.taskName ?? "", link: d.linkName ?? "" }),
      };
    case "task_completed":
      return {
        title: t("taskCompletedTitle"),
        body: t("taskCompletedBody", { name: d.internName ?? "", task: d.taskName ?? "" }),
      };
    case "message":
      return {
        title: t("messageTitle", { name: n.actor_name ?? "" }),
        body: n.body ?? "",
      };
    default:
      return { title: "", body: "" };
  }
}

// Compact relative time ("3m", "2h", "yesterday") in the active locale.
function useRelativeTime() {
  const locale = useLocale();
  return useCallback(
    (iso: string) => {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const diffMs = new Date(iso).getTime() - Date.now();
      const s = Math.round(diffMs / 1000);
      const abs = Math.abs(s);
      if (abs < 60) return rtf.format(Math.round(s), "second");
      const m = Math.round(s / 60);
      if (Math.abs(m) < 60) return rtf.format(m, "minute");
      const h = Math.round(m / 60);
      if (Math.abs(h) < 24) return rtf.format(h, "hour");
      const days = Math.round(h / 24);
      return rtf.format(days, "day");
    },
    [locale]
  );
}

export function NotificationCenter() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const relative = useRelativeTime();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [people, setPeople] = useState<UserRow[]>([]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Read the current browser permission once mounted (Notification is undefined
  // during SSR and in insecure contexts).
  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  // Ask for permission the first time it's relevant — triggered from a user
  // gesture (opening the panel / toggling), which browsers require.
  const ensurePermission = useCallback(async () => {
    if (!pushEnabled || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  }, [pushEnabled]);

  const unread = items.filter((n) => !n.read).length;

  // Show a browser OS notification, if the user allows it and the tab granted
  // permission. This is the "push" half — it only fires while a tab is open.
  const maybePush = useCallback(
    (n: NotificationRow) => {
      if (!pushEnabled) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const { title, body } = describe(n, t);
      try {
        const notif = new Notification(title, { body, tag: n.id });
        notif.onclick = () => {
          window.focus();
          if (n.href) router.push(n.href);
          notif.close();
        };
      } catch {
        /* some browsers throw if constructed outside a user gesture — ignore */
      }
    },
    [pushEnabled, t, router]
  );

  // Initial load: who am I, my latest notifications, the user directory, my pref.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (cancelled || !uid) return;
      setUserId(uid);

      const [{ data: notes }, { data: users }, { data: pref }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("users").select("*").order("full_name"),
        supabase.from("notification_prefs").select("push_enabled").eq("user_id", uid).maybeSingle(),
      ]);
      if (cancelled) return;
      setItems((notes as NotificationRow[]) ?? []);
      setPeople(((users as UserRow[]) ?? []).filter((u) => u.id !== uid));
      if (pref) setPushEnabled((pref as { push_enabled: boolean }).push_enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Live delivery: prepend new rows and raise an OS notification for each.
  // Realtime enforces RLS against the subscriber's token, so we hand it the
  // current access token before subscribing — otherwise it connects anonymously
  // and the row-level filter hides everything.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
            maybePush(row);
          }
        )
        .subscribe();
    })();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, userId, maybePush]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(n: NotificationRow) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
  }

  async function markAllRead() {
    if (unread === 0) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("read", false);
  }

  function onRowClick(n: NotificationRow) {
    void markRead(n);
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  }

  async function togglePush() {
    const next = !pushEnabled;
    setPushEnabled(next);
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
    if (userId) {
      await supabase
        .from("notification_prefs")
        .upsert({ user_id: userId, push_enabled: next, updated_at: new Date().toISOString() });
    }
  }

  // Opening the panel is a user gesture — a good moment to request permission
  // if push is on but the browser hasn't been asked yet.
  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next) void ensurePermission();
      return next;
    });
  }

  const permissionDenied = permission === "denied";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={t("bell")}
        aria-expanded={open}
        onClick={toggleOpen}
        className="inline-flex items-center justify-center"
        style={{
          position: "relative",
          width: 32,
          height: 32,
          borderRadius: 100,
          background: "var(--fill-tertiary)",
          cursor: "pointer",
        }}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -3,
              insetInlineEnd: -3,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              borderRadius: 100,
              background: "var(--terracotta)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              lineHeight: "17px",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="ios-card"
          style={{
            position: "absolute",
            top: 40,
            insetInlineEnd: 0,
            width: 340,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "min(560px, calc(100vh - 80px))",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "14px 18px", borderBottom: "1px solid var(--separator)" }}
          >
            <span style={{ fontSize: 15, fontWeight: 590 }}>{t("title")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{ fontSize: 13, color: "var(--label-secondary)", cursor: "pointer" }}
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* Push preference */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "10px 18px", borderBottom: "1px solid var(--separator)", gap: 12 }}
          >
            <div className="min-w-0">
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t("pushLabel")}</div>
              <div style={{ fontSize: 11, color: "var(--label-secondary)" }}>
                {permissionDenied ? t("pushBlocked") : t("pushHint")}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pushEnabled}
              aria-label={t("pushLabel")}
              onClick={togglePush}
              style={{
                flexShrink: 0,
                width: 44,
                height: 26,
                borderRadius: 100,
                padding: 3,
                background: pushEnabled ? "var(--green)" : "var(--fill-tertiary)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transform: pushEnabled
                    ? "translateX(calc(18px * var(--dir-flip)))"
                    : "translateX(0)",
                  transition: "transform 0.15s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>

          {/* Compose a free-text message */}
          <Composer people={people} onSent={() => setOpen(false)} t={t} />

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {items.length === 0 ? (
              <div
                style={{ padding: "28px 18px", fontSize: 13, color: "var(--label-secondary)", textAlign: "center" }}
              >
                {t("empty")}
              </div>
            ) : (
              items.map((n) => {
                const { title, body } = describe(n, t);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onRowClick(n)}
                    className="flex w-full items-start gap-[10px] text-start"
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--separator)",
                      background: n.read ? "transparent" : "var(--fill-quaternary)",
                      cursor: n.href ? "pointer" : "default",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        marginTop: 6,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: n.read ? "transparent" : "var(--tint)",
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
                        <span style={{ fontSize: 11, color: "var(--label-tertiary)", flexShrink: 0 }}>
                          {relative(n.created_at)}
                        </span>
                      </span>
                      {body && (
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            color: "var(--label-secondary)",
                            marginTop: 1,
                            wordBreak: "break-word",
                          }}
                        >
                          {body}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  people,
  onSent,
  t,
}: {
  people: UserRow[];
  onSent: () => void;
  t: Tr;
}) {
  const [recipientId, setRecipientId] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId || !body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendMessage({ recipientId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setRecipientId("");
      onSent();
    } catch (err: any) {
      setError(err?.message ?? "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{ padding: "12px 18px", borderBottom: "1px solid var(--separator)", display: "grid", gap: 8 }}
    >
      <select
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
        style={{
          height: 34,
          borderRadius: 10,
          border: "1px solid var(--separator)",
          background: "var(--surface)",
          padding: "0 10px",
          fontSize: 13,
        }}
      >
        <option value="">{t("composeTo")}</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name ?? p.email}
          </option>
        ))}
      </select>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("composePlaceholder")}
        rows={2}
        style={{
          borderRadius: 10,
          border: "1px solid var(--separator)",
          background: "var(--surface)",
          padding: "8px 10px",
          fontSize: 13,
          resize: "vertical",
        }}
      />
      {error && <div style={{ fontSize: 12, color: "var(--terracotta)" }}>{error}</div>}
      <button
        type="submit"
        disabled={!recipientId || !body.trim() || busy}
        className="self-end"
        style={{
          height: 32,
          padding: "0 16px",
          borderRadius: 100,
          background: "var(--sun)",
          color: "#000",
          fontSize: 13,
          fontWeight: 500,
          cursor: !recipientId || !body.trim() || busy ? "default" : "pointer",
          opacity: !recipientId || !body.trim() || busy ? 0.5 : 1,
        }}
      >
        {t("send")}
      </button>
    </form>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.6a3.4 3.4 0 0 0-3.4 3.4v2.2c0 .5-.2 1-.6 1.4L3 12.4h10l-1-1.8c-.4-.4-.6-.9-.6-1.4V5A3.4 3.4 0 0 0 8 1.6Z"
        fill="none"
        stroke="#000"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.4 13.2a1.6 1.6 0 0 0 3.2 0" fill="none" stroke="#000" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
