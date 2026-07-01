"use client";

import { useState, useTransition } from "react";
import type { MilestoneRow, TaskRow } from "@/lib/database.types";
import { setTaskCompleted } from "@/app/actions/intern";

export function InternTaskList({
  milestones,
  tasks,
}: {
  milestones: MilestoneRow[];
  tasks: TaskRow[];
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
                <TaskRowItem key={task.id} task={task} />
              ))}
              {group.length === 0 && (
                <li className="py-2 text-sm text-slate-400">No tasks yet.</li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TaskRowItem({ task }: { task: TaskRow }) {
  const [completed, setCompleted] = useState(task.completed_by_intern);
  const [pending, startTransition] = useTransition();
  const approved = task.approved_by_designer;

  function toggle() {
    if (approved) return; // locked once approved
    const next = !completed;
    setCompleted(next);
    startTransition(async () => {
      try {
        await setTaskCompleted(task.id, next);
      } catch {
        setCompleted(!next); // revert on failure
      }
    });
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <input
        type="checkbox"
        checked={completed || approved}
        disabled={approved || pending}
        onChange={toggle}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span
        className={`flex-1 text-sm ${
          approved ? "text-slate-500 line-through" : "text-slate-800"
        }`}
      >
        {task.name}
        {task.source === "custom" && (
          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            added by mentor
          </span>
        )}
      </span>
      {approved ? (
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
          Approved
        </span>
      ) : completed ? (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Awaiting approval
        </span>
      ) : null}
    </li>
  );
}
