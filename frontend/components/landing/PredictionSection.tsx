import { SectionHeading } from "@/components/ui/Primitives";
import { wardRisks } from "@/lib/mocks";

export function PredictionSection() {
  const top = wardRisks[0];
  return (
    <section className="relative z-10 container-px py-28 md:py-36 bg-[var(--bg-alt)]">
      <SectionHeading
        eyebrow="Predictive risk"
        title="From reactive to predictive."
        description="Identify where infrastructure problems are likely to emerge — before they become critical."
      />

      <div className="mt-14 grid md:grid-cols-[1fr_1.1fr] gap-8">
        <div className="card-surface p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[12px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                {top.ward} · {top.category}
              </div>
              <div className="font-mono text-[48px] font-bold text-[var(--critical)] leading-none mt-1">
                {top.risk}%
              </div>
            </div>
            <span className="text-[11.5px] font-mono uppercase tracking-wide border border-[var(--border)] rounded-full px-3 py-1.5">
              {top.window}
            </span>
          </div>
          <div className="text-[12px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-2">Why</div>
          <ul className="space-y-1.5 mb-6">
            {top.reasons.map((r) => (
              <li key={r} className="text-[13.5px] text-[var(--text-secondary)] pl-4 relative">
                <span className="absolute left-0 text-[var(--accent)]">—</span>
                {r}
              </li>
            ))}
          </ul>
          <div className="text-[12px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Recommended action
          </div>
          <ul className="space-y-1.5">
            {top.recommendedActions.map((r) => (
              <li key={r} className="text-[13.5px] pl-4 relative">
                <span className="absolute left-0 text-[var(--accent)]">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          {wardRisks.map((w) => (
            <div
              key={w.ward}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
            >
              <div>
                <div className="text-[14px] font-medium">{w.ward}</div>
                <div className="text-[12px] text-[var(--text-muted)]">{w.category}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 h-1.5 rounded-full bg-[var(--bg-alt)] overflow-hidden hidden sm:block">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${w.risk}%`,
                      background:
                        w.risk >= 70 ? "var(--critical)" : w.risk >= 45 ? "var(--high)" : "var(--low)",
                    }}
                  />
                </div>
                <span className="font-mono text-[14px] font-semibold w-10 text-right">
                  {w.risk}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
