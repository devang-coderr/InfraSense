import { SectionHeading } from "@/components/ui/Primitives";

const steps = [
  { n: "01", title: "See", items: ["Photo", "Video", "Voice", "Location"] },
  { n: "02", title: "Understand", items: ["Computer vision", "NLP", "AI classification"] },
  { n: "03", title: "Connect", items: ["Duplicate detection", "GIS", "Historical data"] },
  { n: "04", title: "Decide", items: ["Severity", "Priority", "Risk"] },
  { n: "05", title: "Act", items: ["Work order", "Resolution", "Verification"] },
  { n: "06", title: "Predict", items: ["Future risk", "Hotspots", "Preventive action"] },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 container-px py-28 md:py-36 bg-[var(--bg-alt)]">
      <SectionHeading
        eyebrow="How InfraSense thinks"
        title="One connected intelligence pipeline."
        description="Every citizen report moves through the same six-stage reasoning process — from raw signal to preventive action."
      />

      <div className="mt-16 relative">
        <div className="hidden md:block absolute top-[38px] left-0 right-0 h-px bg-[var(--border)]" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-4">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="hidden md:flex h-[76px] w-[76px] rounded-full border border-[var(--border)] bg-[var(--surface)] items-center justify-center font-mono text-[13px] text-[var(--accent)] mb-5">
                {s.n}
              </div>
              <div className="md:hidden font-mono text-[12px] text-[var(--accent)] mb-2">{s.n}</div>
              <h3 className="font-semibold text-[17px] mb-3">{s.title}</h3>
              <ul className="space-y-1.5">
                {s.items.map((it) => (
                  <li key={it} className="text-[13px] text-[var(--text-secondary)]">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
