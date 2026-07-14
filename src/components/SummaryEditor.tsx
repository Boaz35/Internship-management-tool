"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  generateSummary,
  saveSummary,
  finalizeSummary,
} from "@/app/actions/summary";

export function SummaryEditor({
  internId,
  internName,
  initialContent,
  initialFinalized,
}: {
  internId: string;
  internName: string;
  initialContent: string;
  initialFinalized: boolean;
}) {
  const t = useTranslations("summary");
  const tc = useTranslations("common");
  const [content, setContent] = useState(initialContent);
  const [finalized, setFinalized] = useState(initialFinalized);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, message: string) {
    setStatus(null);
    startTransition(async () => {
      try {
        await fn();
        setStatus(message);
      } catch (e: any) {
        setStatus(e?.message ?? tc("somethingWrong"));
      }
    });
  }

  function regenerate() {
    run(async () => {
      const fresh = await generateSummary(internId);
      setContent(fresh);
    }, t("draftRegenerated"));
  }

  function save() {
    run(() => saveSummary(internId, content), t("savedMsg"));
  }

  function toggleFinalize() {
    const next = !finalized;
    setFinalized(next);
    run(
      () => finalizeSummary(internId, next),
      next ? t("markedFinalized") : t("reopened")
    );
  }

  function download() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${internName.replace(/\s+/g, "-").toLowerCase()}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={regenerate} disabled={pending} className="ios-btn-ghost">
          {content ? t("regenerateDraft") : t("generateDraft")}
        </button>
        <button onClick={save} disabled={pending} className="ios-btn">
          {tc("save")}
        </button>
        <button onClick={download} disabled={!content} className="ios-btn-ghost">
          {t("export")}
        </button>
        <button
          onClick={toggleFinalize}
          disabled={pending}
          className="ios-btn"
          style={
            finalized
              ? {
                  background: "var(--surface)",
                  color: "var(--label)",
                  boxShadow: "var(--ring)",
                  fontWeight: 500,
                }
              : { background: "var(--green)", color: "#fff" }
          }
        >
          {finalized ? t("reopen") : t("finalize")}
        </button>
        {status && (
          <span style={{ fontSize: 14, color: "var(--label-secondary)" }}>
            {status}
          </span>
        )}
      </div>

      {finalized && (
        <p
          className="ios-pill"
          style={{ color: "var(--green)", background: "rgba(31,110,71,0.12)", alignSelf: "flex-start", padding: "6px 12px" }}
        >
          {t("finalizedNote")}
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={finalized}
        rows={28}
        placeholder={t("editorPlaceholder")}
        className="ios-card"
        style={{
          padding: 20,
          border: "none",
          outline: "none",
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 14,
          lineHeight: 1.6,
          color: finalized ? "var(--label-secondary)" : "var(--label)",
          resize: "vertical",
        }}
      />
    </div>
  );
}
