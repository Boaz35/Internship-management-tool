"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MilestoneRow, TaskRow } from "@/lib/database.types";
import {
  setTaskApproved,
  addCustomTask,
  deleteTask,
  addTaskLink,
  deleteTaskLink,
} from "@/app/actions/designer";
import { StatusPill } from "@/components/ui";

type TaskLink = { name: string; url: string };
type TaskLinkItem = { id: string; name: string; url: string };

function taskKey(milestoneId: string, name: string) {
  return `${milestoneId} ${name.trim().toLowerCase()}`;
}

export function DesignerTaskList({
  internId,
  milestones,
  tasks,
  readOnly = false,
  linksByKey = {},
  taskLinksByTaskId = {},
}: {
  internId: string;
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  readOnly?: boolean;
  linksByKey?: Record<string, TaskLink[]>;
  taskLinksByTaskId?: Record<string, TaskLinkItem[]>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {milestones.map((m) => (
        <MilestoneSection
          key={m.id}
          milestone={m}
          tasks={tasks.filter((t) => t.milestone_id === m.id)}
          internId={internId}
          readOnly={readOnly}
          linksByKey={linksByKey}
          taskLinksByTaskId={taskLinksByTaskId}
        />
      ))}
    </div>
  );
}

function MilestoneSection({
  milestone,
  tasks,
  internId,
  readOnly,
  linksByKey,
  taskLinksByTaskId,
}: {
  milestone: MilestoneRow;
  tasks: TaskRow[];
  internId: string;
  readOnly: boolean;
  linksByKey: Record<string, TaskLink[]>;
  taskLinksByTaskId: Record<string, TaskLinkItem[]>;
}) {
  const t = useTranslations("tasks");
  const [showApproved, setShowApproved] = useState(false);

  const activeTasks = tasks.filter((task) => !task.approved_by_designer);
  const approvedTasks = tasks.filter((task) => task.approved_by_designer);

  return (
    <section className="ios-card" style={{ padding: "18px 20px 14px" }}>
      <div className="flex items-baseline justify-between" style={{ paddingBottom: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
          {milestone.name}
        </div>
        <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
          {t("approvedOf", { approved: approvedTasks.length, total: tasks.length })}
        </div>
      </div>

      {activeTasks.map((task) => (
        <DesignerTaskRow
          key={task.id}
          task={task}
          internId={internId}
          readOnly={readOnly}
          links={linksByKey[taskKey(task.milestone_id, task.name)] ?? []}
          taskLinks={taskLinksByTaskId[task.id] ?? []}
        />
      ))}

      {tasks.length === 0 && (
        <div
          style={{
            minHeight: 46,
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

      {/* Approved tasks — collapsed by default, struck through when shown. */}
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
              <DesignerTaskRow
                key={task.id}
                task={task}
                internId={internId}
                readOnly={readOnly}
                links={linksByKey[taskKey(task.milestone_id, task.name)] ?? []}
                taskLinks={taskLinksByTaskId[task.id] ?? []}
              />
            ))}
        </>
      )}

      {!readOnly && <AddCustomTask internId={internId} milestoneId={milestone.id} />}
    </section>
  );
}

function DesignerTaskRow({
  task,
  internId,
  readOnly,
  links = [],
  taskLinks = [],
}: {
  task: TaskRow;
  internId: string;
  readOnly: boolean;
  links?: TaskLink[];
  taskLinks?: TaskLinkItem[];
}) {
  const t = useTranslations("tasks");
  const [approved, setApproved] = useState(task.approved_by_designer);
  const [pending, startTransition] = useTransition();
  const completed = task.completed_by_intern;

  function toggleApprove() {
    const next = !approved;
    setApproved(next);
    startTransition(async () => {
      try {
        await setTaskApproved(task.id, internId, next);
      } catch {
        setApproved(!next);
      }
    });
  }

  const canApprove = completed || approved;

  return (
    <div style={{ borderTop: "1px solid var(--separator)", padding: "2px 0" }}>
      <div className="flex items-center gap-3" style={{ minHeight: 44 }}>
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

        {task.source === "custom" && <StatusPill tone="orange">{t("custom")}</StatusPill>}

        {approved ? (
          <StatusPill tone="green">{t("approved")}</StatusPill>
        ) : completed ? (
          <StatusPill tone="tint">{t("readyToReview")}</StatusPill>
        ) : null}

        {!readOnly && (
          <button
            onClick={toggleApprove}
            disabled={pending || !canApprove}
            style={{
              fontSize: 13,
              fontWeight: 590,
              borderRadius: 100,
              padding: "5px 14px",
              flexShrink: 0,
              cursor: canApprove ? "pointer" : "default",
              color: approved ? "var(--label-secondary)" : "#fff",
              background: approved ? "transparent" : "var(--green)",
              border: approved ? "1px solid var(--separator)" : "none",
              opacity: canApprove ? 1 : 0.35,
            }}
          >
            {approved ? t("undo") : t("approve")}
          </button>
        )}

        {!readOnly && task.source === "custom" && (
          <DeleteTaskButton taskId={task.id} internId={internId} />
        )}
      </div>

      <TaskLinksArea
        internId={internId}
        taskId={task.id}
        templateLinks={links}
        taskLinks={taskLinks}
        readOnly={readOnly}
      />
    </div>
  );
}

// Links row for a task: read-only template links + removable per-task links,
// plus an add-link form for mentors/leaders. Works for custom + template tasks.
function TaskLinksArea({
  internId,
  taskId,
  templateLinks,
  taskLinks,
  readOnly,
}: {
  internId: string;
  taskId: string;
  templateLinks: TaskLink[];
  taskLinks: TaskLinkItem[];
  readOnly: boolean;
}) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addTaskLink({ taskId, internId, name, url });
        setName("");
        setUrl("");
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteTaskLink(id, internId);
      } catch {
        /* ignore */
      }
    });
  }

  const hasLinks = templateLinks.length > 0 || taskLinks.length > 0;
  if (readOnly && !hasLinks) return null;

  return (
    <div style={{ marginTop: hasLinks || !readOnly ? 2 : 0, marginBottom: 6 }}>
      <div className="flex flex-wrap items-center gap-2">
        {templateLinks.map((l, i) => (
          <a
            key={`t${i}`}
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
        {taskLinks.map((l) => (
          <span
            key={l.id}
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 13,
              borderRadius: 100,
              padding: "3px 4px 3px 10px",
              background: "var(--fill-tertiary)",
            }}
          >
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              title={l.url}
              className="inline-flex items-center gap-1"
              style={{ color: "var(--tint)", textDecoration: "none" }}
            >
              <LinkGlyph />
              {l.name}
            </a>
            {!readOnly && (
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(l.id)}
                aria-label={t("removeLink")}
                title={t("removeLink")}
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
            )}
          </span>
        ))}
        {!readOnly && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ fontSize: 13, color: "var(--tint)", cursor: "pointer" }}
          >
            {t("addLink")}
          </button>
        )}
      </div>

      {!readOnly && open && (
        <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
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
              setOpen(false);
              setError(null);
            }}
            className="ios-btn-ghost"
            style={{ height: 32, fontSize: 14 }}
          >
            {tc("cancel")}
          </button>
          {error && (
            <span style={{ width: "100%", fontSize: 13, color: "var(--terracotta)" }}>
              {error}
            </span>
          )}
        </form>
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

function DeleteTaskButton({
  taskId,
  internId,
}: {
  taskId: string;
  internId: string;
}) {
  const t = useTranslations("tasks");
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteTask(taskId, internId);
          } catch {
            /* ignore */
          }
        })
      }
      style={{ fontSize: 13, color: "var(--label-tertiary)", cursor: "pointer" }}
      title={t("deleteTask")}
    >
      ✕
    </button>
  );
}

function AddCustomTask({
  internId,
  milestoneId,
}: {
  internId: string;
  milestoneId: string;
}) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const value = name;
    setName("");
    startTransition(async () => {
      try {
        await addCustomTask({ internId, milestoneId, name: value });
        setOpen(false);
      } catch {
        setName(value);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 4,
          paddingTop: 10,
          borderTop: "1px solid var(--separator)",
          width: "100%",
          textAlign: "start",
          fontSize: 13,
          fontWeight: 590,
          color: "var(--tint)",
          cursor: "pointer",
        }}
      >
        {t("addTask")}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex gap-2"
      style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--separator)" }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("taskName")}
        className="ios-input flex-1"
      />
      <button type="submit" disabled={pending} className="ios-btn">
        {tc("add")}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="ios-btn-ghost">
        {tc("cancel")}
      </button>
    </form>
  );
}
