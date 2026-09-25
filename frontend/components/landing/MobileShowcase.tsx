import { SectionHeading } from "@/components/ui/Primitives";

function PhoneFrame({
  rotate,
  z,
  y,
  children,
  className = "",
}: {
  rotate: number;
  z: number;
  y: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-[220px] md:w-[240px] h-[460px] md:h-[500px] rounded-[36px] bg-[var(--surface-elevated)] border border-[var(--border)] p-2.5 shadow-[var(--shadow)] ${className}`}
      style={{
        transform: `perspective(1400px) rotateY(${rotate}deg) translateZ(${z}px) translateY(${y}px)`,
      }}
    >
      <div className="h-full w-full rounded-[26px] bg-[var(--bg)] overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

function MiniAppBar({ title }: { title: string }) {
  return (
    <div className="h-12 flex items-center px-4 bg-[var(--surface)] border-b border-[var(--border)]">
      <span className="text-[12.5px] font-medium">{title}</span>
    </div>
  );
}

export function MobileShowcase() {
  return (
    <section className="relative z-10 container-px py-28 md:py-36 overflow-hidden">
      <SectionHeading
        eyebrow="Mobile experience"
        title="Report once. Stay informed."
        align="center"
        description="Three focused screens carry the entire citizen journey."
      />

      <div className="mt-20 flex justify-center items-end gap-[-40px] flex-wrap md:flex-nowrap">
        <PhoneFrame rotate={14} z={-40} y={30} className="hidden md:block -mr-10">
          <MiniAppBar title="Live Map" />
          <div className="p-3">
            <div className="h-40 rounded-xl bg-[var(--bg-alt)] relative mb-3 overflow-hidden">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--critical)] top-8 left-10" />
              <span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--high)] top-20 left-24" />
              <span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--low)] top-12 left-32" />
            </div>
            <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Nearby infrastructure</div>
          </div>
        </PhoneFrame>

        <PhoneFrame rotate={0} z={20} y={0} className="z-10">
          <MiniAppBar title="Report Issue" />
          <div className="p-3">
            <div className="h-32 rounded-xl bg-gradient-to-br from-[#2b2820] to-[var(--bg)] mb-3 flex items-center justify-center">
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[var(--accent)] text-[var(--bg)] font-semibold">AI SCAN COMPLETE</span>
            </div>
            <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-3 mb-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Category</span>
                <span className="font-semibold">Pothole</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">Severity</span>
                <span className="font-mono font-semibold text-[var(--critical)]">HIGH · 91</span>
              </div>
            </div>
            <div className="rounded-full bg-[var(--text)] text-[var(--bg)] text-center py-2.5 text-[12.5px] font-medium">
              Submit Report
            </div>
          </div>
        </PhoneFrame>

        <PhoneFrame rotate={-14} z={-40} y={30} className="hidden md:block -ml-10">
          <MiniAppBar title="My Reports" />
          <div className="p-3 space-y-2.5">
            {[
              { id: "#1024", label: "Pothole — MG Road", tone: "var(--high)" },
              { id: "#1027", label: "Garbage — Ward 9", tone: "var(--low)" },
              { id: "#1031", label: "Streetlight — Sector 4", tone: "var(--text-muted)" },
            ].map((r) => (
              <div key={r.id} className="rounded-lg border border-[var(--border)] p-2.5">
                <div className="flex justify-between text-[10.5px] font-mono text-[var(--text-muted)] mb-1">
                  <span>{r.id}</span>
                  <span style={{ color: r.tone }}>●</span>
                </div>
                <div className="text-[12px]">{r.label}</div>
              </div>
            ))}
          </div>
        </PhoneFrame>
      </div>
    </section>
  );
}
