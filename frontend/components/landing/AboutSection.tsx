import { SectionHeading } from "@/components/ui/Primitives";

const principles = [
  {
    title: "AI-Powered Triage",
    desc: "Automated defect detection, categorization, and severity scoring to eliminate manual triage bottlenecks.",
  },
  {
    title: "Intelligent Deduplication",
    desc: "Spatial and temporal clustering merges duplicate reports, boosting priority scores for recurring civic issues.",
  },
  {
    title: "Dynamic Priority Engine",
    desc: "Multi-factor municipal urgency indexing based on severity, traffic exposure, nearby schools, and report volume.",
  },
  {
    title: "Department Routing",
    desc: "Automated routing to responsible municipal bodies with full work order tracking and status management.",
  },
  {
    title: "Predictive Analytics",
    desc: "Ward-level risk heatmaps and proactive maintenance recommendations based on aggregate infrastructure health.",
  },
  {
    title: "Transparency & Trust",
    desc: "Explainable AI score breakdowns and end-to-end status tracking for both citizens and municipal authorities.",
  },
];

export function AboutSection() {
  return (
    <section className="relative z-10 container-px py-28 md:py-36 bg-[var(--bg-alt)]">
      <SectionHeading
        eyebrow="About InfraSense"
        title="Built to make infrastructure intelligence accessible."
        description="InfraSense is an AI-driven decision-support platform that helps citizens and authorities understand, prioritise and proactively manage public infrastructure — from a single pothole to a city-wide risk pattern."
      />

      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {principles.map((p) => (
          <div key={p.title} className="card-surface p-6 border border-[var(--border)] rounded-xl">
            <div className="font-semibold text-[15px] mb-2 text-[var(--text)]">{p.title}</div>
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{p.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
