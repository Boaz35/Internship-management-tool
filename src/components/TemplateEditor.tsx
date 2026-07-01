"use client";

import { useState, useTransition } from "react";
import type { MilestoneRow, TaskTemplateRow } from "@/lib/database.types";
import {
  addTemplateTask,
  renameTemplateTask,
  deleteTemplateTask,
  updateMilestone,
} from "@/app/actions/leader";

export function TemplateEditor({
  milestones,
  templates,
}: {
  milestones: MilestoneRow[];
  templates: TaskTemplateRow[];
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Changes here define the default program. New tasks apply to interns
        created afterwards; existing interns keep their current task lists.
      </p>
      {milestones.map((m) => (
        <MilestoneBlock
          key={m.id}
          milestone={m}
          tasks={templates.filter((t) => t.milestone_id === m.id)}
        />
      ))}
    </div>
  );
}

function MilestoneBlock({
  milestone,
  tasks,
}: {
  milestone: MilestoneRow;
  tasks: TaskTemplateRow[];
}) {
  const [name, setName] = useState(milestone.name);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [newTask, setNewTask] = useState("");
  const [pending, startTransition] = useTransition();

  function saveMilestone() {
    startTransition(async () => {
      try {
        await updateMilestone({ id: milestone.id, name, description });
      } catch {
        /* ignore */
      }
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    const value = newTask;
    setNewTask("");
    startTransition(async () => {
      try {
        await addTemplateTask(milestone.id, value);
      } catch {
        setNewTask(value);
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveMilestone}
          className="w-full rounded-md border border-transparent px-1 py-1 text-lg font-semibold text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveMilestone}
          rows={2}
          placeholder="Description"
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 focus:border-brand-500 focus:outline-none"
        />
      </div>

      <ul className="divide-y divide-slate-100">
        {tasks.map((t) => (
          <TemplateTaskRow key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <li className="py-2 text-sm text-slate-400">No template tasks.</li>
        )}
      </ul>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task…"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Add
        </button>
      </form>
    </section>
  );
}

function TemplateTaskRow({ task }: { task: TaskTemplateRow }) {
  const [name, setName] = useState(task.name);
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-2 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== task.name) {
            startTransition(async () => {
              try {
                await renameTemplateTask(task.id, name);
              } catch {
                setName(task.name);
              }
            });
          }
        }}
        className="flex-1 rounded-md border border-transparent px-1 py-1 text-sm text-slate-800 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
      />
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deleteTemplateTask(task.id);
            } catch {
              /* ignore */
            }
          })
        }
        className="text-xs text-slate-400 hover:text-red-600"
      >
        Delete
      </button>
    </li>
  );
}
