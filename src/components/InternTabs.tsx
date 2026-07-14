"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type TabKey = "tasks" | "feedback";

// Client tab bar for the intern page. Both panels are rendered on the server
// and passed in as slots; this component only toggles which one is visible,
// so no client data-fetch round-trip is needed. Tab state survives Next.js
// soft refreshes (e.g. after saving feedback), keeping the user on the tab.
export function InternTabs({
  tasksSlot,
  feedbackSlot,
}: {
  tasksSlot: ReactNode;
  feedbackSlot: ReactNode;
}) {
  const t = useTranslations("intern");
  const [active, setActive] = useState<TabKey>("tasks");
  const baseId = useId();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "tasks", label: t("tabTasks") },
    { key: "feedback", label: t("tabFeedback") },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("tabsLabel")}
        className="ios-segmented"
        style={{
          display: "inline-flex",
          gap: 2,
          padding: 2,
          borderRadius: 100,
          background: "var(--fill-tertiary)",
        }}
      >
        {tabs.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: 100,
                padding: "7px 20px",
                fontSize: 14,
                fontWeight: 590,
                color: selected ? "var(--label)" : "var(--label-secondary)",
                background: selected ? "var(--bg, #fff)" : "transparent",
                boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-tasks`}
        aria-labelledby={`${baseId}-tab-tasks`}
        hidden={active !== "tasks"}
        style={{ marginTop: 24 }}
      >
        {tasksSlot}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-feedback`}
        aria-labelledby={`${baseId}-tab-feedback`}
        hidden={active !== "feedback"}
        style={{ marginTop: 24 }}
      >
        {feedbackSlot}
      </div>
    </div>
  );
}
