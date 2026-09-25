import { SectionHeading } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

const points = [
  "AI automatically identifies the issue from your photo",
  "Location is captured automatically, editable by hand",
  "Similar nearby reports are detected before you submit",
  "Track your report from submission to resolution",
];

export function CitizenSection() {
  return (
    <section id="platform" className="relative z-10 container-px py-28 md:py-36">
      <div className="grid md:grid-cols-2 gap-14 items-center">
        <div>
          <div className="eyebrow mb-5">For citizens</div>
          <h2 className="display-xl text-[clamp(28px,4vw,44px)] mb-6">
            Report once. Stay informed.
          </h2>
          <p className="text-[var(--text-secondary)] text-[16px] leading-relaxed mb-8 max-w-md">
            No categories to choose, no forms to wrestle with. Point your
            camera at the problem — InfraSense handles the rest.
          </p>
          <ul className="space-y-3 mb-10">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-[14.5px] text-[var(--text-secondary)]">
                <CheckCircle2 size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
          <Button href="/citizen/report" withArrow>
            Report an Issue
          </Button>
        </div>

        <div className="card-surface p-6">
          <div className="eyebrow mb-4">Similar issue found</div>
          <p className="text-[15px] mb-4">
            A nearby infrastructure issue was reported <strong>120m away</strong>.
            4 reports have already been consolidated.
          </p>
          <div className="rounded-xl bg-[var(--bg-alt)] h-32 mb-5 relative overflow-hidden">
            <span className="absolute h-3 w-3 rounded-full bg-[var(--critical)] top-10 left-16 ring-4 ring-[var(--critical)]/20" />
          </div>
          <p className="text-[13.5px] text-[var(--text-secondary)] mb-5">
            Is this the same issue?
          </p>
          <div className="flex gap-3">
            <Button size="sm" className="flex-1 justify-center">
              Yes, this is it
            </Button>
            <Button size="sm" variant="secondary" className="flex-1 justify-center">
              Create new report
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
