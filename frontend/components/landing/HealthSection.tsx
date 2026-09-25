import { SectionHeading } from "@/components/ui/Primitives";
import { healthCategories, cityHealthScore } from "@/lib/mocks";

export function HealthSection() {
  return (
    <section id="intelligence" className="relative z-10 container-px py-28 md:py-36">
      <div className="grid md:grid-cols-2 gap-14 items-center">
        <div>
          <SectionHeading
            eyebrow="Infrastructure health"
            title="Know the health of your city — not just its complaints."
            description="A single score, rolled up from every category, gives authorities a city-level picture at a glance."
          />
          <div className="mt-10 flex items-end gap-4">
            <span className="font-mono text-[80px] leading-none font-bold text-[var(--accent)]">
              {cityHealthScore}
            </span>
            <span className="text-[15px] text-[var(--text-secondary)] pb-3">/ 100 city score</span>
          </div>
        </div>

        <div className="card-surface p-6 md:p-8">
          {healthCategories.map((h) => (
            <div key={h.label} className="mb-5 last:mb-0">
              <div className="flex justify-between text-[13.5px] mb-1.5">
                <span>{h.label}</span>
                <span className="font-mono">{h.score}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-alt)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${h.score}%`,
                    background:
                      h.score >= 80
                        ? "var(--low)"
                        : h.score >= 65
                        ? "var(--accent)"
                        : "var(--critical)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
