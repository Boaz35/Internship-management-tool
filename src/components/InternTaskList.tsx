"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MilestoneRow, TaskRow } from "@/lib/database.types";
import { setTaskCompleted } from "@/app/actions/intern";
import { StatusPill } from "@/components/ui";

type TaskLink = { name: string; url: string };

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
}: {
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  linksByTemplateId?: Record<string, TaskLink[]>;
  taskLinksByTaskId?: Record<string, TaskLink[]>;
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
}: {
  milestone: MilestoneRow;
  tasks: TaskRow[];
  linksByTemplateId: Record<string, TaskLink[]>;
  taskLinksByTaskId: Record<string, TaskLink[]>;
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
              />
            ))}
        </>
      )}
    </section>
  );
}

function TaskRowItem({ task, links = [] }: { task: TaskRow; links?: TaskLink[] }) {
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
