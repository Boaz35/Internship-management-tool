"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type {
  MilestoneRow,
  TaskTemplateLinkRow,
  TaskTemplateRow,
} from "@/lib/database.types";
import {
  addTemplateTask,
  renameTemplateTask,
  deleteTemplateTask,
  reorderTemplateTasks,
  updateMilestone,
  addMilestone,
  deleteMilestone,
  addTaskLink,
  deleteTaskLink,
} from "@/app/actions/leader";

export type InternOption = { id: string; name: string };

export function TemplateEditor({
  milestones,
  templates,
  links = [],
  interns = [],
}: {
  milestones: MilestoneRow[];
  templates: TaskTemplateRow[];
  links?: TaskTemplateLinkRow[];
  interns?: InternOption[];
}) {
  const t = useTranslations("template");

  const linksByTask = useMemo(() => {
    const map: Record<string, TaskTemplateLinkRow[]> = {};
    for (const l of links) (map[l.template_id] ??= []).push(l);
    return map;
  }, [links]);

  // Global phases form the shared template; per-intern phases are listed apart.
  const globalMilestones = useMemo(
    () => milestones.filter((m) => !m.intern_id),
    [milestones]
  );
  const internMilestones = useMemo(
    () => milestones.filter((m) => m.intern_id),
    [milestones]
  );
  const internNameById = useMemo(
    () => new Map(interns.map((i) => [i.id, i.name])),
    [interns]
  );

  return (
    <div className="flex flex-col gap-5">
      <p style={{ fontSize: 15, color: "var(--label-secondary)", maxWidth: 620 }}>
        {t("intro")}
      </p>
      {globalMilestones.map((m, i) => (
        <MilestoneBlock
          key={m.id}
          milestone={m}
          index={i}
          tasks={templates
            .filter((t) => t.milestone_id === m.id)
            .sort((a, b) => a.sequence - b.sequence)}
          linksByTask={linksByTask}
        />
      ))}
      <AddPhaseForm interns={interns} />

      {internMilestones.length > 0 && (
        <InternPhasesSection
          milestones={internMilestones}
          internNameById={internNameById}
        />
      )}
    </div>
  );
}

// Read-only list of phases that belong to a single intern. Tasks are added to
// these from the intern's own Tasks tab; here they can only be removed.
function InternPhasesSection({
  milestones,
  internNameById,
}: {
  milestones: MilestoneRow[];
  internNameById: Map<string, string>;
}) {
  const t = useTranslations("template");
  return (
    <div className="mt-2">
      <div className="ios-section-label" style={{ padding: "0 4px" }}>
        {t("internPhasesTitle")}
      </div>
      <p style={{ fontSize: 13, color: "var(--label-tertiary)", padding: "2px 4px 10px" }}>
        {t("internPhasesHint")}
      </p>
      <div className="flex flex-col gap-2">
        {milestones.map((m) => (
          <InternPhaseRow
            key={m.id}
            milestone={m}
            internName={
              (m.intern_id && internNameById.get(m.intern_id)) || t("unknownIntern")
            }
          />
        ))}
      </div>
    </div>
  );
}

function InternPhaseRow({
  milestone,
  internName,
}: {
  milestone: MilestoneRow;
  internName: string;
}) {
  const t = useTranslations("template");
  const [pending, startTransition] = useTransition();

  function removePhase() {
    if (!window.confirm(t("confirmDeletePhase", { name: milestone.name }))) return;
    startTransition(async () => {
      try {
        await deleteMilestone(milestone.id);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div
      className="ios-card flex items-center gap-3"
      style={{ padding: "12px 16px" }}
    >
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 15, fontWeight: 500 }}>{milestone.name}</div>
        <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
          {t("forIntern", { name: internName })}
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={removePhase}
        title={t("deletePhase")}
        style={{
          fontSize: 13,
          color: "var(--terracotta)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {t("delete")}
      </button>
    </div>
  );
}

function MilestoneBlock({
  milestone,
  index,
  tasks,
  linksByTask,
}: {
  milestone: MilestoneRow;
  index: number;
  tasks: TaskTemplateRow[];
  linksByTask: Record<string, TaskTemplateLinkRow[]>;
}) {
  const t = useTranslations("template");
  const [name, setName] = useState(milestone.name);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [newTask, setNewTask] = useState("");
  const [pending, startTransition] = useTransition();

  // Optimistic local order so reordering feels instant; re-syncs whenever the
  // server sends a different set/order of tasks.
  const [order, setOrder] = useState<TaskTemplateRow[]>(tasks);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const serverKey = tasks.map((t) => `${t.id}:${t.sequence}`).join("|");
  useEffect(() => {
    setOrder(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

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
    if (!window.confirm(t("confirmDeletePhase", { name: milestone.name }))) return;
    startTransition(async () => {
      try {
        await deleteMilestone(milestone.id);
      } catch {
        /* ignore */
      }
    });
  }

  function reorder(from: number, to: number) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= order.length ||
      to >= order.length
    )
      return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const previous = order;
    setOrder(next); // optimistic — UI updates immediately
    startTransition(async () => {
      try {
        await reorderTemplateTasks(next.map((t) => t.id));
      } catch {
        setOrder(previous); // revert on failure
      }
    });
  }

  return (
    <section
      className="ios-card"
      style={{ padding: "20px 24px 16px", position: "relative" }}
    >
      {/* Delete phase — pinned to the top-right corner of the card. */}
      <button
        type="button"
        disabled={pending}
        onClick={removePhase}
        title={t("deletePhase")}
        aria-label={t("deletePhase")}
        className="flex items-center justify-center"
        style={{
          position: "absolute",
          top: 14,
          insetInlineEnd: 14,
          zIndex: 2,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--surface)",
          boxShadow: "var(--ring)",
          color: "var(--terracotta)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ✕
      </button>

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
            marginInlineStart: 16,
            paddingTop: 18,
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
        placeholder={t("description")}
        className="ios-textarea"
        style={{ marginTop: 4, fontSize: 13, color: "var(--label-secondary)" }}
      />

      <div className="mt-3">
        {order.map((task, i) => (
          <TemplateTaskRow
            key={task.id}
            task={task}
            links={linksByTask[task.id] ?? []}
            index={i}
            isDragging={dragIndex === i}
            isDropTarget={dragIndex !== null && dragIndex !== i}
            onDragStart={() => setDragIndex(i)}
            onDragEnd={() => setDragIndex(null)}
            onDropRow={() => {
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
            }}
          />
        ))}
        {order.length === 0 && (
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
            {t("noTemplateTasks")}
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
          placeholder={t("newTaskPlaceholder")}
          className="ios-input flex-1"
        />
        <button type="submit" disabled={pending} className="ios-btn">
          {t("add")}
        </button>
      </form>
    </section>
  );
}

function TemplateTaskRow({
  task,
  links,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDropRow,
}: {
  task: TaskTemplateRow;
  links: TaskTemplateLinkRow[];
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropRow: () => void;
}) {
  const t = useTranslations("template");
  const [name, setName] = useState(task.name);
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div
      onDragOver={(e) => {
        if (isDropTarget) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={() => {
        setOver(false);
        onDropRow();
      }}
      style={{
        borderTop: "1px solid var(--separator)",
        padding: "6px 0",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: over && isDropTarget ? "inset 0 2px 0 var(--tint)" : "none",
      }}
    >
      <div className="flex items-center gap-3" style={{ minHeight: 38 }}>
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          aria-label={t("reorder")}
          title={t("reorder")}
          className="flex items-center justify-center"
          style={{ cursor: "grab", flexShrink: 0, color: "var(--label-tertiary)" }}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden>
            <circle cx="3.5" cy="3" r="1.3" fill="currentColor" />
            <circle cx="8.5" cy="3" r="1.3" fill="currentColor" />
            <circle cx="3.5" cy="8" r="1.3" fill="currentColor" />
            <circle cx="8.5" cy="8" r="1.3" fill="currentColor" />
            <circle cx="3.5" cy="13" r="1.3" fill="currentColor" />
            <circle cx="8.5" cy="13" r="1.3" fill="currentColor" />
          </svg>
        </span>
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
          style={{ fontSize: 13, color: "var(--terracotta)", cursor: "pointer", flexShrink: 0 }}
        >
          {t("delete")}
        </button>
      </div>

      <TaskLinks templateId={task.id} links={links} />
    </div>
  );
}

function TaskLinks({
  templateId,
  links,
}: {
  templateId: string;
  links: TaskTemplateLinkRow[];
}) {
  const t = useTranslations("template");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addTaskLink({ templateId, name, url });
        setName("");
        setUrl("");
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteTaskLink(id);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div style={{ marginInlineStart: 30, marginTop: links.length || open ? 4 : 0 }}>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <span
            key={l.id}
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 13,
              borderRadius: 100,
              padding: "3px 4px 3px 10px",
              background: "var(--fill-tertiary)",
            }}
          >
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--tint)", textDecoration: "none" }}
              title={l.url}
            >
              {l.name}
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(l.id)}
              aria-label={t("removeLink")}
              title={t("removeLink")}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                color: "var(--label-tertiary)",
                cursor: "pointer",
                fontSize: 11,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </span>
        ))}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ fontSize: 13, color: "var(--tint)", cursor: "pointer" }}
          >
            {t("addLink")}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("linkName")}
            className="ios-input"
            style={{ width: 150 }}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("linkUrl")}
            className="ios-input flex-1"
            style={{ minWidth: 180 }}
          />
          <button
            type="submit"
            disabled={pending || !name.trim() || !url.trim()}
            className="ios-btn"
            style={{ height: 32, fontSize: 14 }}
          >
            {t("add")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="ios-btn-ghost"
            style={{ height: 32, fontSize: 14 }}
          >
            {t("cancel")}
          </button>
          {error && (
            <span style={{ width: "100%", fontSize: 13, color: "var(--terracotta)" }}>
              {error}
            </span>
          )}
        </form>
      )}
    </div>
  );
}

function AddPhaseForm({ interns }: { interns: InternOption[] }) {
  const t = useTranslations("template");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [internId, setInternId] = useState<string>(""); // "" = all interns (global)
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const n = name;
    const d = description;
    const target = internId || null;
    startTransition(async () => {
      try {
        await addMilestone({ name: n, description: d, internId: target });
        setName("");
        setDescription("");
        setInternId("");
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
          textAlign: "start",
          fontSize: 15,
          fontWeight: 500,
          color: "#000",
          cursor: "pointer",
        }}
      >
        {t("addPhase")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="ios-card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.43px" }}>
        {t("newPhase")}
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("phaseNamePlaceholder")}
        className="ios-input"
        style={{ marginTop: 12, width: "100%" }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("descriptionOptional")}
        rows={2}
        className="ios-textarea"
        style={{ marginTop: 10, fontSize: 13, color: "var(--label-secondary)" }}
      />
      <div style={{ marginTop: 10 }}>
        <label className="ios-field-label">{t("assignPhase")}</label>
        <select
          value={internId}
          onChange={(e) => setInternId(e.target.value)}
          className="ios-input"
          style={{ width: "100%" }}
        >
          <option value="">{t("allInternsGlobal")}</option>
          {interns.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {internId && (
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--label-tertiary)" }}>
            {t("internPhaseNote")}
          </p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className="ios-btn">
          {t("addPhaseBtn")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="ios-btn-ghost">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
