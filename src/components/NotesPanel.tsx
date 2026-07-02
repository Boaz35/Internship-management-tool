"use client";

import { useState, useTransition } from "react";
import type { NoteRow } from "@/lib/database.types";
import { addNote, deleteNote } from "@/app/actions/designer";
import { formatDate } from "@/lib/progress";

export function NotesPanel({
  internId,
  notes,
  canEdit = true,
}: {
  internId: string;
  notes: NoteRow[];
  canEdit?: boolean;
}) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    const text = content;
    setContent("");
    startTransition(async () => {
      try {
        await addNote(internId, text);
      } catch {
        setContent(text);
      }
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ padding: "0 20px 8px" }}>
        <div className="ios-section-label" style={{ padding: 0 }}>
          Private notes
        </div>
        <div style={{ fontSize: 12, color: "var(--label-tertiary)" }}>
          Not visible to the intern
        </div>
      </div>

      <div className="ios-card" style={{ padding: "18px 20px 20px" }}>
        {canEdit && (
          <form onSubmit={submit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a note about this intern…"
              rows={3}
              className="ios-textarea"
            />
            <div className="mt-[10px] flex justify-end">
              <button
                type="submit"
                disabled={pending || !content.trim()}
                className="ios-btn"
                style={{ height: 34, fontSize: 14, padding: "0 18px" }}
              >
                Add note
              </button>
            </div>
          </form>
        )}

        <div className={`flex flex-col gap-[10px] ${canEdit ? "mt-4" : ""}`}>
          {notes.map((note) => (
            <div
              key={note.id}
              className="ios-tile"
              style={{ padding: "12px 14px" }}
            >
              <div
                className="flex justify-between"
                style={{ fontSize: 12, color: "var(--label-secondary)" }}
              >
                <span>{note.author_name ?? "Unknown"}</span>
                <span>{formatDate(note.created_at)}</span>
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: 15,
                  lineHeight: "20px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {note.content}
              </p>
              {canEdit && (
                <div className="mt-1 text-right">
                  <DeleteNoteButton noteId={note.id} internId={internId} />
                </div>
              )}
            </div>
          ))}
          {notes.length === 0 && (
            <div style={{ fontSize: 15, color: "var(--label-tertiary)" }}>
              No notes yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteNoteButton({
  noteId,
  internId,
}: {
  noteId: string;
  internId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteNote(noteId, internId);
          } catch {
            /* ignore */
          }
        })
      }
      style={{ fontSize: 12, color: "var(--label-tertiary)", cursor: "pointer" }}
    >
      Delete
    </button>
  );
}
