"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MilestoneRow, TaskRow } from "@/lib/database.types";
import { setTaskCompleted } from "@/app/actions/intern";
import { StatusPill } from "@/components/ui";

export function InternTaskList({
  milestones,
  tasks,
}: {
  milestones: MilestoneRow[];
  tasks: TaskRow[];
}) {
  const t = useTranslations("internTasks");
  return (
    <div className="flex flex-col gap-4">
      {milestones.map((m) => {
        const group = tasks.filter((t) => t.milestone_id === m.id);
        const approved = group.filter((t) => t.approved_by_designer).length;
        return (
          <section
            key={m.id}
            className="ios-card"
            style={{ padding: "18px 20px 8px" }}
          >
            <div
              className="flex items-baseline justify-between"
              style={{ paddingBottom: 8 }}
            >
              <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
                {m.name}
              </div>
              <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
                {t("approvedOf", { approved, total: group.length })}
              </div>
            </div>
            {group.map((task) => (
              <TaskRowItem key={task.id} task={task} />
            ))}
            {group.length === 0 && (
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
          </section>
        );
      })}
    </div>
  );
}

function TaskRowItem({ task }: { task: TaskRow }) {
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
    <div
      className="flex items-center gap-3"
      style={{ minHeight: 44, borderTop: "1px solid var(--separator)" }}
    >
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
  );
}
