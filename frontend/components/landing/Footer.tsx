import Link from "next/link";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "Citizen Portal", href: "/citizen" },
      { label: "Citizen Login", href: "/login?role=citizen" },
      { label: "Authority Dashboard", href: "/authority" },
      { label: "Authority Login", href: "/login?role=authority" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "GIS Intelligence", href: "/authority/map" },
      { label: "Predictive Risk", href: "/authority/predictions" },
      { label: "Documentation", href: "/about" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/about" },
      { label: "Terms", href: "/about" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--border)] container-px py-16">
      <div className="grid md:grid-cols-[1.4fr_repeat(4,1fr)] gap-10">
        <div>
          <span className="font-semibold tracking-tight text-[15px]">
            INFRA<span className="text-[var(--accent)]">SENSE</span>
          </span>
          <p className="text-[13px] text-[var(--text-muted)] mt-3 max-w-[220px]">
            From reactive infrastructure management to predictive city intelligence.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-4">
              {c.title}
            </div>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="focus-ring text-[13.5px] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-14 pt-6 border-t border-[var(--border)] text-[12px] text-[var(--text-muted)] font-mono">
        InfraSense — SIH 2026 concept build. All data shown is sample/demo data.
      </div>
    </footer>
  );
}
