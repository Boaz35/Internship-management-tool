import { getLocale, getTranslations } from "next-intl/server";
import type { HoursLogRow } from "@/lib/database.types";
import { summarizeHours, projectEndDate, formatDate } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";
import { StatTile } from "./ui";

// Hours summary card: progress toward the target + projected end.
export async function HoursOverview({
  logs,
  target,
  title,
}: {
  logs: HoursLogRow[];
  target: number;
  title?: string;
}) {
  const t = await getTranslations("hoursOverview");
  const locale = await getLocale();
  const s = summarizeHours(logs, target);
  const projected = projectEndDate(s.remaining);
  const heading = title ?? t("title");

  return (
    <div className="ios-card" style={{ padding: "24px 24px 20px" }}>
      <div className="flex items-baseline justify-between">
        <div style={{ fontSize: 15, fontWeight: 590 }}>{heading}</div>
        <div style={{ fontSize: 15, color: "var(--label-secondary)" }}>
          {t("workedOf", { worked: s.worked, target: s.target, percent: s.percent })}
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar percent={s.percent} />
      </div>
      <div className="mt-[18px] grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        <StatTile label={t("worked")} value={t("hoursUnit", { n: s.worked })} />
        <StatTile label={t("remaining")} value={t("hoursUnit", { n: s.remaining })} />
        <StatTile label={t("timeOff")} value={t("hoursUnit", { n: s.vacation + s.sick })} />
        <StatTile
          label={t("projectedEnd")}
          value={s.remaining > 0 ? formatDate(projected, locale) : t("complete")}
        />
      </div>
    </div>
  );
}
