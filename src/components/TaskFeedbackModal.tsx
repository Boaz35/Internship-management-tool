"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { FeedbackCategoryRow } from "@/lib/database.types";
import { FeedbackComposer } from "@/components/FeedbackComposer";

// Side sheet holding the task-specific feedback composer, titled with the task
// name + milestone. No manual task-name/duration inputs — they come from the task.
export function TaskFeedbackModal({
  internId,
  taskId,
  taskName,
  milestoneName,
  categories,
  onClose,
}: {
  internId: string;
  taskId: string;
  taskName: string;
  milestoneName: string;
  categories: FeedbackCategoryRow[];
  onClose: () => void;
}) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)" }}
      />
      <aside
        style={{
          position: "relative",
          width: "min(480px, 100%)",
          height: "100%",
          background: "var(--bg)",
          boxShadow: "0 0 40px rgba(0,0,0,0.15)",
          overflowY: "auto",
          padding: "24px 24px 40px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="flex items-start justify-between gap-3"
          style={{ marginBottom: 18 }}
        >
          <div>
            <div className="ios-section-label" style={{ padding: 0 }}>
              {milestoneName}
            </div>
            <h2
              style={{
                margin: "4px 0 0",
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "-0.4px",
              }}
            >
              {t("title")} · {taskName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: "var(--label-secondary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div className="ios-card" style={{ padding: "18px 20px 20px" }}>
          <FeedbackComposer
            internId={internId}
            taskId={taskId}
            kind="task"
            categories={categories}
            onSaved={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
