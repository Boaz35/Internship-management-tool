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
    <div className="flex flex-col gap-5">
      <p style={{ fontSize: 15, color: "var(--label-secondary)", maxWidth: 620 }}>
        Adding a task adds it to every current intern&apos;s checklist and to
        future interns. Removing a task only takes it out of the template.
        Deleting a whole phase removes it for everyone.
      </p>
      {milestones.map((m, i) => (
        <MilestoneBlock
          key={m.id}
          milestone={m}
          index={i}
          tasks={templates.filter((t) => t.milestone_id === m.id)}
        />
      ))}
      <AddPhaseForm />
    </div>
  );
}

function MilestoneBlock({
  milestone,
  index,
  tasks,
}: {
  milestone: MilestoneRow;
  index: number;
  tasks: TaskTemplateRow[];
}) {
  const [name, setName] = useState(milestone.name);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [newTask, setNewTask] = useState("");
  const [pending, startTransition] = useTransition();

  const num = String(index + 1).padStart(2, "0");

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
    <section className="ios-card" style={{ padding: "20px 24px 16px" }}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1" style={{ paddingTop: 22 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveMilestone}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.45px",
              padding: 0,
            }}
          />
        </div>
        {/* Ghost chapter number — Frank Ruhl Libre Light (Zemingo) */}
        <div
          aria-hidden
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 300,
            fontSize: 72,
            lineHeight: 0.9,
            color: "var(--neutral-avatar)",
            userSelect: "none",
            flexShrink: 0,
            marginLeft: 16,
          }}
        >
          {num}
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={saveMilestone}
        rows={2}
        placeholder="Description"
        className="ios-textarea"
        style={{ marginTop: 4, fontSize: 13, color: "var(--label-secondary)" }}
      />

      <div className="mt-3 flex items-center justify-end">
        <button
          disabled={pending}
          onClick={removePhase}
          style={{ fontSize: 13, color: "var(--terracotta)", cursor: "pointer" }}
        >
          Delete phase
        </button>
      </div>

      <div className="mt-1">
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

      <form
        onSubmit={add}
        className="flex items-center gap-[10px]"
        style={{ paddingTop: 12, borderTop: "1px solid var(--separator)" }}
      >
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
      className="flex items-center gap-3"
      style={{ minHeight: 44, borderTop: "1px solid var(--separator)" }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
        <circle cx="3" cy="2.5" r="1.2" fill="var(--label-tertiary)" />
        <circle cx="9" cy="2.5" r="1.2" fill="var(--label-tertiary)" />
        <circle cx="3" cy="6" r="1.2" fill="var(--label-tertiary)" />
        <circle cx="9" cy="6" r="1.2" fill="var(--label-tertiary)" />
        <circle cx="3" cy="9.5" r="1.2" fill="var(--label-tertiary)" />
        <circle cx="9" cy="9.5" r="1.2" fill="var(--label-tertiary)" />
      </svg>
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
        style={{ fontSize: 13, color: "var(--terracotta)", cursor: "pointer" }}
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
          fontWeight: 500,
          color: "#000",
          cursor: "pointer",
        }}
      >
        + Add phase
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="ios-card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.43px" }}>
        New phase
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Phase name (e.g. Design review)"
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
        <button type="button" onClick={() => setOpen(false)} className="ios-btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
