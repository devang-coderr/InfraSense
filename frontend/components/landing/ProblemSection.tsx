import { SectionHeading } from "@/components/ui/Primitives";
import { CountUp } from "@/components/ui/CountUp";
import { demoStats } from "@/lib/mocks";

const stats = [
  { label: "Reports", value: demoStats.totalReports },
  { label: "Duplicate reports", value: demoStats.duplicateReports },
  { label: "Critical issues", value: demoStats.criticalIssues },
  { label: "Infrastructure hotspots", value: demoStats.hotspots },
];

export function ProblemSection() {
  return (
    <section className="relative z-10 container-px py-28 md:py-36">
      <SectionHeading
        eyebrow="The problem"
        title="Cities generate signals every day."
        description="The challenge isn't collecting more complaints. It's understanding what they mean."
      />
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
        {stats.map((s) => (
          <div key={s.label} className="border-t border-[var(--border)] pt-5">
            <div className="font-mono text-[clamp(28px,4vw,44px)] font-semibold text-[var(--text)]">
              <CountUp end={s.value} />
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-[12px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
        Sample / demo figures — for illustration only
      </p>
    </section>
  );
}
