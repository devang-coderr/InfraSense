import { SectionHeading, ScoreBar } from "@/components/ui/Primitives";
import { issues } from "@/lib/mocks";

export function ExplainableAI() {
  const issue = issues[0];
  return (
    <section className="relative z-10 container-px py-28 md:py-36">
      <div className="grid md:grid-cols-2 gap-14 items-start">
        <SectionHeading
          eyebrow="Explainable AI"
          title="AI that explains its decisions."
          description="Every score InfraSense produces — severity, priority, risk — comes with the factors behind it. Judges, officers and citizens can see why, not just what."
        />

        <div className="card-surface p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[12px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                Issue #{issue.id} · {issue.title}
              </div>
              <div className="font-mono text-[15px] mt-1">Why is this priority #1?</div>
            </div>
            <span className="font-mono text-[28px] font-bold text-[var(--critical)]">
              {issue.priorityScore}
            </span>
          </div>
          {issue.priorityFactors.map((f) => (
            <ScoreBar key={f.label} label={f.label} score={f.score} max={f.max} />
          ))}
        </div>
      </div>
    </section>
  );
}
