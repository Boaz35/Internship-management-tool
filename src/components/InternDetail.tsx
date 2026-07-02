import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DesignerTaskList } from "@/components/DesignerTaskList";
import { NotesPanel } from "@/components/NotesPanel";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar, SectionLabel } from "@/components/ui";
import {
  formatDate,
  summarizeHours,
  projectEndDate,
} from "@/lib/progress";
import type {
  HoursLogRow,
  InternRow,
  MilestoneRow,
  NoteRow,
  TaskRow,
  UserRow,
} from "@/lib/database.types";

// Full per-intern view, used by the designer and the team leader.
export async function InternDetail({
  internId,
  backHref,
  backLabel,
}: {
  internId: string;
  backHref: string;
  backLabel: string;
}) {
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", internId)
    .single<InternRow>();

  if (!intern) {
    return (
      <div
        className="ios-card"
        style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
      >
        Intern not found or not accessible.
      </div>
    );
  }

  const [
    { data: person },
    { data: milestones },
    { data: tasks },
    { data: logs },
    { data: notes },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", intern.user_id).single<UserRow>(),
    supabase.from("milestones").select("*").order("sequence"),
    supabase.from("tasks").select("*").eq("intern_id", internId),
    supabase
      .from("hours_logs")
      .select("*")
      .eq("intern_id", internId)
      .order("date", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("intern_id", internId)
      .order("created_at", { ascending: false }),
  ]);

  const name = person?.full_name ?? person?.email ?? "Intern";
  const hours = summarizeHours((logs as HoursLogRow[]) ?? [], intern.target_hours);
  const projected = projectEndDate(hours.remaining);

  return (
    <div>
      <Link
        href={backHref}
        className="mb-[14px] inline-flex items-center gap-[6px]"
        style={{ fontSize: 15, color: "var(--tint)" }}
      >
        <svg width="8" height="14" viewBox="0 0 8 14">
          <path
            d="M 7 1 L 1 7 L 7 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{backLabel}</span>
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name} email={person?.email} size={56} seed={internId} />
          <div>
            <h1 className="ios-h1">{name}</h1>
            <p className="ios-subtitle" style={{ marginTop: 2 }}>
              {person?.email} · {formatDate(intern.start_date)} –{" "}
              {formatDate(intern.end_date)}
            </p>
          </div>
        </div>
        <Link
          href={`/summary/${internId}`}
          className="inline-flex flex-shrink-0 items-center gap-[7px]"
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 100,
            background: "rgba(0,122,255,0.15)",
            color: "var(--tint)",
            fontSize: 15,
            fontWeight: 590,
          }}
        >
          <span>Summary document</span>
          <svg width="7" height="12" viewBox="0 0 7 12">
            <path
              d="M 1 1 L 6 6 L 1 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="ios-card mt-7" style={{ padding: "20px 24px" }}>
        <div className="flex items-baseline justify-between">
          <div style={{ fontSize: 15, fontWeight: 590 }}>Hours toward target</div>
          <div style={{ fontSize: 15, color: "var(--label-secondary)" }}>
            {hours.worked} of {hours.target} h
            {hours.remaining > 0
              ? ` · projected end ${formatDate(projected)}`
              : " · complete"}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar percent={hours.percent} />
        </div>
      </div>

      <div
        className="mt-8 grid items-start gap-7"
        style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)" }}
      >
        <div>
          <SectionLabel>Tasks</SectionLabel>
          <DesignerTaskList
            internId={internId}
            milestones={(milestones as MilestoneRow[]) ?? []}
            tasks={(tasks as TaskRow[]) ?? []}
          />
        </div>
        <NotesPanel internId={internId} notes={(notes as NoteRow[]) ?? []} />
      </div>
    </div>
  );
}
