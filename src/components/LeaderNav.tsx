import Link from "next/link";

const LINKS = [
  { href: "/leader", label: "Overview" },
  { href: "/leader/allocation", label: "People & allocation" },
  { href: "/leader/template", label: "Program template" },
];

export function LeaderNav() {
  return (
    <nav className="flex gap-1 border-b border-slate-200">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-t-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
