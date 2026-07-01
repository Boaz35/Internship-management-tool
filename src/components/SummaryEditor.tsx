"use client";

import { useState, useTransition } from "react";
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
        setStatus(e?.message ?? "Something went wrong.");
      }
    });
  }

  function regenerate() {
    run(async () => {
      const fresh = await generateSummary(internId);
      setContent(fresh);
    }, "Draft regenerated from the latest data.");
  }

  function save() {
    run(() => saveSummary(internId, content), "Saved.");
  }

  function toggleFinalize() {
    const next = !finalized;
    setFinalized(next);
    run(
      () => finalizeSummary(internId, next),
      next ? "Marked as finalized." : "Reopened for editing."
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={regenerate}
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {content ? "Regenerate draft" : "Generate draft"}
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Save
        </button>
        <button
          onClick={download}
          disabled={!content}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Export (.md)
        </button>
        <button
          onClick={toggleFinalize}
          disabled={pending}
          className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
            finalized
              ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {finalized ? "Reopen" : "Finalize"}
        </button>
        {status && <span className="text-sm text-slate-500">{status}</span>}
      </div>

      {finalized && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          This summary is finalized. Reopen it to make further edits.
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={finalized}
        rows={28}
        placeholder="Generate a draft to get started, then edit it here."
        className="w-full rounded-xl border border-slate-300 bg-white p-4 font-mono text-sm leading-relaxed focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
      />
    </div>
  );
}
