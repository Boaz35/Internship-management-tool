"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type {
  FeedbackCategoryRow,
  MilestoneRow,
  TaskRow,
} from "@/lib/database.types";
import {
  setTaskApproved,
  addCustomTask,
  deleteTask,
} from "@/app/actions/designer";
import { StatusPill } from "@/components/ui";
import { TaskFeedbackModal } from "@/components/TaskFeedbackModal";

type ActiveTask = {
  taskId: string;
  taskName: string;
  milestoneName: string;
};

export function DesignerTaskList({
  internId,
  milestones,
  tasks,
  readOnly = false,
  categories = [],
  feedbackCountByTask = {},
}: {
  internId: string;
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  readOnly?: boolean;
  categories?: FeedbackCategoryRow[];
  feedbackCountByTask?: Record<string, number>;
}) {
  const t = useTranslations("tasks");
  const [active, setActive] = useState<ActiveTask | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {milestones.map((m) => {
        const group = tasks.filter((t) => t.milestone_id === m.id);
        const approved = group.filter((t) => t.approved_by_designer).length;
        return (
          <section
            key={m.id}
            className="ios-card"
            style={{ padding: "18px 20px 14px" }}
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
              <DesignerTaskRow
                key={task.id}
                task={task}
                internId={internId}
                readOnly={readOnly}
                feedbackCount={feedbackCountByTask[task.id] ?? 0}
                onFeedback={() =>
                  setActive({
                    taskId: task.id,
                    taskName: task.name,
                    milestoneName: m.name,
                  })
                }
              />
            ))}
            {group.length === 0 && (
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

            {!readOnly && (
              <AddCustomTask internId={internId} milestoneId={m.id} />
            )}
          </section>
        );
      })}

      {active && (
        <TaskFeedbackModal
          internId={internId}
          taskId={active.taskId}
          taskName={active.taskName}
          milestoneName={active.milestoneName}
          categories={categories}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function DesignerTaskRow({
  task,
  internId,
  readOnly,
  feedbackCount,
  onFeedback,
}: {
  task: TaskRow;
  internId: string;
  readOnly: boolean;
  feedbackCount: number;
  onFeedback: () => void;
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
    <div
      className="flex items-center gap-3"
      style={{ minHeight: 46, borderTop: "1px solid var(--separator)" }}
    >
      <div
        style={{
          flex: 1,
          fontSize: 15,
          color: approved ? "var(--label-secondary)" : "var(--label)",
        }}
      >
        {task.name}
      </div>

      {feedbackCount > 0 && (
        <span
          title={t("hasFeedback", { count: feedbackCount })}
          className="ios-pill"
          style={{
            color: "var(--rating-good)",
            background: "var(--rating-good-bg)",
            fontWeight: 500,
          }}
        >
          {t("feedback")} · {feedbackCount}
        </span>
      )}

      {task.source === "custom" && <StatusPill tone="orange">{t("custom")}</StatusPill>}

      {approved ? (
        <StatusPill tone="green">{t("approved")}</StatusPill>
      ) : completed ? (
        <StatusPill tone="tint">{t("readyToReview")}</StatusPill>
      ) : (
        <StatusPill tone="neutral">{t("notStarted")}</StatusPill>
      )}

      {!readOnly && (
        <button
          onClick={onFeedback}
          style={{
            fontSize: 13,
            fontWeight: 590,
            borderRadius: 100,
            padding: "5px 14px",
            flexShrink: 0,
            cursor: "pointer",
            color: "#000",
            background: "var(--fill-tertiary)",
          }}
        >
          {t("feedback")}
        </button>
      )}

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
