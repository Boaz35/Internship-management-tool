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
    <div className="flex flex-col gap-4">
      <p style={{ fontSize: 15, color: "var(--label-secondary)" }}>
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
    <section className="ios-card" style={{ padding: "18px 20px 16px" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveMilestone}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 17,
          fontWeight: 590,
          letterSpacing: "-0.43px",
          padding: "2px 0",
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={saveMilestone}
        rows={2}
        placeholder="Description"
        className="ios-textarea"
        style={{ marginTop: 6, fontSize: 13, color: "var(--label-secondary)" }}
      />

      <div className="mt-2">
        {tasks.map((t) => (
          <TemplateTaskRow key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <div
            style={{
              minHeight: 40,
              display: "flex",
              alignItems: "center",
              borderTop: "1px solid var(--separator)",
              fontSize: 15,
              color: "var(--label-tertiary)",
            }}
          >
            No template tasks.
          </div>
        )}
      </div>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task…"
          className="ios-input flex-1"
        />
        <button type="submit" disabled={pending} className="ios-btn">
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
    <div
      className="flex items-center gap-2"
      style={{ minHeight: 44, borderTop: "1px solid var(--separator)" }}
    >
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
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 15,
          color: "var(--label)",
          padding: "2px 0",
        }}
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
        style={{ fontSize: 13, color: "var(--label-tertiary)", cursor: "pointer" }}
      >
        Delete
      </button>
    </div>
  );
}
