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
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Private notes</h3>
        <span className="text-xs text-slate-400">Not visible to the intern</span>
      </div>

      {canEdit && (
        <form onSubmit={submit} className="mt-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note about this intern…"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-2 text-right">
            <button
              type="submit"
              disabled={pending || !content.trim()}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Add note
            </button>
          </div>
        </form>
      )}

      <ul className="mt-4 space-y-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{note.author_name ?? "Unknown"}</span>
              <span>{formatDate(note.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {note.content}
            </p>
            {canEdit && (
              <div className="mt-1 text-right">
                <DeleteNoteButton noteId={note.id} internId={internId} />
              </div>
            )}
          </li>
        ))}
        {notes.length === 0 && (
          <li className="text-sm text-slate-400">No notes yet.</li>
        )}
      </ul>
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
      className="text-xs text-slate-400 hover:text-red-600"
    >
      Delete
    </button>
  );
}
