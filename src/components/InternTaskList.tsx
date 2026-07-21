"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MilestoneRow, TaskRow } from "@/lib/database.types";
import {
  setTaskCompleted,
  uploadTaskAttachment,
  addTaskAttachmentLink,
  deleteTaskAttachment,
} from "@/app/actions/intern";
import { StatusPill } from "@/components/ui";

type TaskLink = { name: string; url: string };
export type AttachmentItem = {
  id: string;
  kind: "file" | "link";
  name: string;
  href: string;
  mime: string | null;
};

// Combine a task's template-task links (matched by tasks.template_id) with the
// per-task links attached directly to it.
function linksForTask(
  task: TaskRow,
  linksByTemplateId: Record<string, TaskLink[]>,
  taskLinksByTaskId: Record<string, TaskLink[]>
): TaskLink[] {
  return [
    ...(task.template_id ? linksByTemplateId[task.template_id] ?? [] : []),
    ...(taskLinksByTaskId[task.id] ?? []),
  ];
}

export function InternTaskList({
  milestones,
  tasks,
  linksByTemplateId = {},
  taskLinksByTaskId = {},
  attachmentsByTaskId = {},
}: {
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  linksByTemplateId?: Record<string, TaskLink[]>;
  taskLinksByTaskId?: Record<string, TaskLink[]>;
  attachmentsByTaskId?: Record<string, AttachmentItem[]>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {milestones.map((m) => (
        <InternMilestoneSection
          key={m.id}
          milestone={m}
          tasks={tasks.filter((t) => t.milestone_id === m.id)}
          linksByTemplateId={linksByTemplateId}
          taskLinksByTaskId={taskLinksByTaskId}
          attachmentsByTaskId={attachmentsByTaskId}
        />
      ))}
    </div>
  );
}

function InternMilestoneSection({
  milestone,
  tasks,
  linksByTemplateId,
  taskLinksByTaskId,
  attachmentsByTaskId,
}: {
  milestone: MilestoneRow;
  tasks: TaskRow[];
  linksByTemplateId: Record<string, TaskLink[]>;
  taskLinksByTaskId: Record<string, TaskLink[]>;
  attachmentsByTaskId: Record<string, AttachmentItem[]>;
}) {
  const t = useTranslations("internTasks");
  const [showApproved, setShowApproved] = useState(false);

  const activeTasks = tasks.filter((task) => !task.approved_by_designer);
  const approvedTasks = tasks.filter((task) => task.approved_by_designer);

  return (
    <section className="ios-card" style={{ padding: "18px 20px 8px" }}>
      <div className="flex items-baseline justify-between" style={{ paddingBottom: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
          {milestone.name}
        </div>
        <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
          {t("approvedOf", { approved: approvedTasks.length, total: tasks.length })}
        </div>
      </div>

      {activeTasks.map((task) => (
        <TaskRowItem
          key={task.id}
          task={task}
          links={linksForTask(task, linksByTemplateId, taskLinksByTaskId)}
          attachments={attachmentsByTaskId[task.id] ?? []}
        />
      ))}

      {tasks.length === 0 && (
        <div
          style={{
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            borderTop: "1px solid var(--separator)",
            fontSize: 15,
            color: "var(--label-tertiary)",
          }}
        >
          {t("noTasks")}
        </div>
      )}

      {approvedTasks.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowApproved((s) => !s)}
            className="flex w-full items-center gap-2"
            style={{
              minHeight: 40,
              borderTop: "1px solid var(--separator)",
              fontSize: 13,
              fontWeight: 590,
              color: "var(--label-secondary)",
              cursor: "pointer",
              textAlign: "start",
            }}
          >
            <span style={{ fontSize: 11 }}>{showApproved ? "▾" : "▸"}</span>
            <span>{t("approvedCount", { count: approvedTasks.length })}</span>
          </button>
          {showApproved &&
            approvedTasks.map((task) => (
              <TaskRowItem
                key={task.id}
                task={task}
                links={linksForTask(task, linksByTemplateId, taskLinksByTaskId)}
                attachments={attachmentsByTaskId[task.id] ?? []}
              />
            ))}
        </>
      )}
    </section>
  );
}

function TaskRowItem({
  task,
  links = [],
  attachments = [],
}: {
  task: TaskRow;
  links?: TaskLink[];
  attachments?: AttachmentItem[];
}) {
  const t = useTranslations("internTasks");
  const [completed, setCompleted] = useState(task.completed_by_intern);
  const [pending, startTransition] = useTransition();
  const approved = task.approved_by_designer;

  function toggle() {
    if (approved || pending) return; // locked once approved
    const next = !completed;
    setCompleted(next);
    startTransition(async () => {
      try {
        await setTaskCompleted(task.id, next);
      } catch {
        setCompleted(!next);
      }
    });
  }

  const checked = completed || approved;
  const circleBg = approved
    ? "var(--green)"
    : completed
    ? "var(--tint)"
    : "transparent";
  const circleBorder =
    approved || completed ? "none" : "1px solid var(--label-tertiary)";

  return (
    <div style={{ borderTop: "1px solid var(--separator)", padding: "6px 0" }}>
      <div className="flex items-center gap-3" style={{ minHeight: 32 }}>
        <button
          onClick={toggle}
          disabled={approved || pending}
          aria-label={checked ? t("completed") : t("markDone")}
          className="flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            boxSizing: "border-box",
            background: circleBg,
            border: circleBorder,
            cursor: approved ? "default" : "pointer",
          }}
        >
          {checked && (
            <svg width="11" height="9" viewBox="0 0 11 9">
              <path
                d="M 1 4.5 L 4 7.5 L 10 1"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <div
          style={{
            flex: 1,
            fontSize: 15,
            color: approved ? "var(--label-secondary)" : "var(--label)",
            textDecoration: approved ? "line-through" : "none",
          }}
        >
          {task.name}
        </div>

        {task.source === "custom" && <StatusPill tone="orange">{t("mentor")}</StatusPill>}

        {approved ? (
          <StatusPill tone="green">{t("approved")}</StatusPill>
        ) : completed ? (
          <StatusPill tone="tint">{t("awaitingApproval")}</StatusPill>
        ) : null}
      </div>

      {links.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          style={{ marginInlineStart: 34, marginTop: 4 }}
        >
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              title={l.url}
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 13,
                borderRadius: 100,
                padding: "3px 10px",
                background: "var(--fill-tertiary)",
                color: "var(--tint)",
                textDecoration: "none",
              }}
            >
              <LinkGlyph />
              {l.name}
            </a>
          ))}
        </div>
      )}

      <InternAttachments taskId={task.id} attachments={attachments} />
    </div>
  );
}

// Intern's own files + links for a task: chips with a remove control, plus an
// upload button and an add-link form. Only the intern sees this on their own
// dashboard; mentors/leaders see the same attachments (read + delete) elsewhere.
function InternAttachments({
  taskId,
  attachments,
}: {
  taskId: string;
  attachments: AttachmentItem[];
}) {
  const t = useTranslations("internTasks");
  const tc = useTranslations("common");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("taskId", taskId);
    fd.append("file", file);
    startTransition(async () => {
      try {
        await uploadTaskAttachment(fd);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addTaskAttachmentLink({ taskId, name, url });
        setName("");
        setUrl("");
        setLinkOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteTaskAttachment(id);
        router.refresh();
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div style={{ marginInlineStart: 34, marginTop: 4 }}>
      <div className="flex flex-wrap items-center gap-2">
        {attachments.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 13,
              borderRadius: 100,
              padding: "3px 4px 3px 10px",
              background: "var(--fill-tertiary)",
            }}
          >
            <a
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              download={a.kind === "file" ? a.name : undefined}
              title={a.name}
              className="inline-flex items-center gap-1"
              style={{ color: "var(--tint)", textDecoration: "none" }}
            >
              {a.kind === "file" ? <FileGlyph /> : <LinkGlyph />}
              {a.name}
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(a.id)}
              aria-label={t("removeAttachment")}
              title={t("removeAttachment")}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                color: "var(--label-tertiary)",
                cursor: "pointer",
                fontSize: 11,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </span>
        ))}

        <input
          ref={fileRef}
          type="file"
          onChange={onPickFile}
          disabled={pending}
          style={{ display: "none" }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          style={{ fontSize: 13, color: "var(--tint)", cursor: "pointer" }}
        >
          {pending ? t("uploading") : t("addFile")}
        </button>
        {!linkOpen && (
          <button
            type="button"
            onClick={() => setLinkOpen(true)}
            style={{ fontSize: 13, color: "var(--tint)", cursor: "pointer" }}
          >
            {t("addLink")}
          </button>
        )}
      </div>

      {linkOpen && (
        <form onSubmit={submitLink} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("linkName")}
            className="ios-input"
            style={{ width: 150 }}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("linkUrl")}
            className="ios-input flex-1"
            style={{ minWidth: 180 }}
          />
          <button
            type="submit"
            disabled={pending || !name.trim() || !url.trim()}
            className="ios-btn"
            style={{ height: 32, fontSize: 14 }}
          >
            {tc("add")}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false);
              setError(null);
            }}
            className="ios-btn-ghost"
            style={{ height: 32, fontSize: 14 }}
          >
            {tc("cancel")}
          </button>
        </form>
      )}

      {error && (
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--terracotta)" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function LinkGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" style={{ flexShrink: 0 }} aria-hidden>
      <path
        d="M5.5 8.5 L8.5 5.5 M6 3.5 L8.5 1 A2.5 2.5 0 0 1 12 4.5 L9.5 7 M8 10.5 L5.5 13 A2.5 2.5 0 0 1 2 9.5 L4.5 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" style={{ flexShrink: 0 }} aria-hidden>
      <path
        d="M3 1.5 h5 l3 3 v8 a0 0 0 0 1 0 0 h-8 a0 0 0 0 1 0 0 z M8 1.5 v3 h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
