import { SectionHeading } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { issues } from "@/lib/mocks";

export function AuthoritySection() {
  const top = issues.slice(0, 3);
  return (
    <section className="relative z-10 container-px py-28 md:py-36 bg-[var(--bg-alt)]">
      <SectionHeading
        eyebrow="For authorities"
        title="See the city as a system."
        description="One command center for every reported issue — mapped, scored and ready to assign."
      />

      <div className="mt-14 card-surface p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { l: "Total issues", v: "1,284" },
            { l: "Critical", v: "87" },
            { l: "Pending", v: "283" },
            { l: "Avg. resolution", v: "3.2d" },
          ].map((s) => (
            <div key={s.l} className="border border-[var(--border)] rounded-xl p-4">
              <div className="font-mono text-[22px] font-semibold">{s.v}</div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-alt)] h-64 relative overflow-hidden">
            {issues.map((i) => (
              <span
                key={i.id}
                className="absolute h-2.5 w-2.5 rounded-full"
                style={{
                  left: `${i.x}%`,
                  top: `${i.y}%`,
                  background:
                    i.severity === "critical"
                      ? "var(--critical)"
                      : i.severity === "high"
                      ? "var(--high)"
                      : i.severity === "medium"
                      ? "var(--medium)"
                      : "var(--low)",
                }}
              />
            ))}
            <span className="absolute bottom-3 left-3 text-[10.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
              Live infrastructure map
            </span>
          </div>

          <div>
            <div className="text-[12px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Priority queue
            </div>
            <div className="space-y-2.5">
              {top.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3"
                >
                  <div>
                    <div className="text-[13.5px] font-medium">{i.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{i.ward}</div>
                  </div>
                  <div className="font-mono text-[15px] font-semibold text-[var(--critical)]">
                    {i.priorityScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button href="/authority" withArrow variant="secondary">
            Explore the authority dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}
