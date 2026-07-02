"use client";

import { useState, useTransition } from "react";
import type { MilestoneRow, TaskTemplateRow } from "@/lib/database.types";
import {
  addTemplateTask,
  renameTemplateTask,
  deleteTemplateTask,
  updateMilestone,
  addMilestone,
  deleteMilestone,
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
        Adding a task adds it to every current intern&apos;s checklist and to
        future interns. Removing a task only takes it out of the template —
        current interns keep it. Deleting a whole phase removes it for everyone.
      </p>
      {milestones.map((m) => (
        <MilestoneBlock
          key={m.id}
          milestone={m}
          tasks={templates.filter((t) => t.milestone_id === m.id)}
        />
      ))}
      <AddPhaseForm />
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

  function removePhase() {
    if (
      !window.confirm(
        `Delete the “${milestone.name}” phase? This removes it and its tasks for every intern.`
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteMilestone(milestone.id);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <section className="ios-card" style={{ padding: "18px 20px 16px" }}>
      <div className="flex items-start gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveMilestone}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 17,
            fontWeight: 590,
            letterSpacing: "-0.43px",
            padding: "2px 0",
          }}
        />
        <button
          disabled={pending}
          onClick={removePhase}
          style={{ fontSize: 13, color: "var(--red)", cursor: "pointer", flexShrink: 0 }}
          title="Delete phase"
        >
          Delete phase
        </button>
      </div>
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

function AddPhaseForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const n = name;
    const d = description;
    startTransition(async () => {
      try {
        await addMilestone({ name: n, description: d });
        setName("");
        setDescription("");
        setOpen(false);
      } catch {
        /* keep values */
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ios-card"
        style={{
          padding: "18px 20px",
          textAlign: "left",
          fontSize: 15,
          fontWeight: 590,
          color: "var(--tint)",
          cursor: "pointer",
        }}
      >
        + Add phase
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="ios-card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
        New phase
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Phase name (e.g. Design Review)"
        className="ios-input"
        style={{ marginTop: 12, width: "100%" }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="ios-textarea"
        style={{ marginTop: 10, fontSize: 13, color: "var(--label-secondary)" }}
      />
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className="ios-btn">
          Add phase
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ios-btn-ghost"
        >
          Cancel
        </button>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--label-secondary)" }}>
        Add the phase, then add its tasks below — tasks fan out to every current
        intern.
      </p>
    </form>
  );
}
