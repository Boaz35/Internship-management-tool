"use client";

import { useState, useTransition } from "react";
import type { MilestoneRow, TaskRow } from "@/lib/database.types";
import {
  setTaskApproved,
  addCustomTask,
  deleteTask,
} from "@/app/actions/designer";

export function DesignerTaskList({
  internId,
  milestones,
  tasks,
  readOnly = false,
}: {
  internId: string;
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-6">
      {milestones.map((m) => {
        const group = tasks.filter((t) => t.milestone_id === m.id);
        const approved = group.filter((t) => t.approved_by_designer).length;
        return (
          <section
            key={m.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{m.name}</h3>
              <span className="text-xs text-slate-500">
                {approved} of {group.length} approved
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {group.map((task) => (
                <DesignerTaskRow
                  key={task.id}
                  task={task}
                  internId={internId}
                  readOnly={readOnly}
                />
              ))}
              {group.length === 0 && (
                <li className="py-2 text-sm text-slate-400">No tasks.</li>
              )}
            </ul>
            {!readOnly && (
              <AddCustomTask internId={internId} milestoneId={m.id} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function DesignerTaskRow({
  task,
  internId,
  readOnly,
}: {
  task: TaskRow;
  internId: string;
  readOnly: boolean;
}) {
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

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex-1 text-sm text-slate-800">
        {task.name}
        {task.source === "custom" && (
          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            custom
          </span>
        )}
      </span>

      {approved ? (
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
          Approved
        </span>
      ) : completed ? (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Ready to review
        </span>
      ) : (
        <span className="text-xs text-slate-400">Not started</span>
      )}

      {!readOnly && (
        <button
          onClick={toggleApprove}
          disabled={pending || (!completed && !approved)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
            approved
              ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {approved ? "Undo" : "Approve"}
        </button>
      )}
      {!readOnly && task.source === "custom" && (
        <button
          onClick={() =>
            startTransition(async () => {
              try {
                await deleteTask(task.id, internId);
              } catch {
                /* ignore */
              }
            })
          }
          className="text-xs text-slate-400 hover:text-red-600"
        >
          ✕
        </button>
      )}
    </li>
  );
}

function AddCustomTask({
  internId,
  milestoneId,
}: {
  internId: string;
  milestoneId: string;
}) {
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
        className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        + Add task
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task name"
        className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
      >
        Cancel
      </button>
    </form>
  );
}
