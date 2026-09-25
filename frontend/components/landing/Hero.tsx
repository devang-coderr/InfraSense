"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useScrollProgress } from "@/lib/useScrollProgress";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

const CityScene = dynamic(
  () => import("@/components/3d/CityScene").then((m) => m.CityScene),
  { ssr: false }
);

const stages = [
  {
    range: [0, 0.15],
    eyebrow: "01 · See",
    title: "See what your city needs next.",
    body: "InfraSense turns citizen reports, visual evidence and geospatial data into actionable infrastructure intelligence.",
    cta: true,
  },
  {
    range: [0.15, 0.3],
    eyebrow: "02 · Understand",
    title: "Understand every issue.",
    body: "Computer vision classifies the problem and scores its severity — pothole, 94% confidence, severity 91/100.",
  },
  {
    range: [0.3, 0.45],
    eyebrow: "03 · Connect",
    title: "Turn noise into signal.",
    body: "Multiple citizen reports about the same problem are consolidated into a single, verified infrastructure issue.",
  },
  {
    range: [0.45, 0.65],
    eyebrow: "04 · Prioritise",
    title: "Know what matters most.",
    body: "A priority score — weighing severity, traffic, population and location risk — tells authorities what to fix first.",
  },
  {
    range: [0.65, 0.85],
    eyebrow: "05 · Predict",
    title: "Don't wait for failure.",
    body: "Historical patterns feed a risk model that flags where infrastructure problems are likely to emerge next.",
  },
  {
    range: [0.85, 1],
    eyebrow: "06 · Act",
    title: "A smarter way to manage the city.",
    body: "Report → Detect → Consolidate → Prioritise → Resolve → Predict — one continuous intelligence loop.",
    cta: true,
  },
];

export function Hero() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const activeIndex = stages.findIndex(
    (s) => progress >= s.range[0] && progress < s.range[1]
  );
  const active = stages[activeIndex === -1 ? stages.length - 1 : activeIndex];

  return (
    <div ref={ref} className="relative" style={{ height: "620vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D city */}
        <div className="absolute inset-0">
          {!reduceMotion ? (
            <Canvas
              shadows
              dpr={[1, 1.6]}
              camera={{ fov: 42, position: [9, 7, 11] }}
            >
              <Suspense fallback={null}>
                <CityScene progress={progress} />
              </Suspense>
            </Canvas>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[var(--bg)] to-[var(--bg-alt)]" />
          )}
        </div>

        {/* gradient scrim for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/85 via-transparent to-transparent pointer-events-none" />

        {/* overlay narrative text */}
        <div className="relative z-10 h-full container-px flex flex-col justify-center max-w-2xl">
          <div key={active.eyebrow} className="animate-fade-up">
            <div className="eyebrow mb-5">{active.eyebrow}</div>
            <h1 className="display-xl text-[clamp(34px,5.4vw,68px)] mb-6">
              {active.title}
            </h1>
            <p className="text-[var(--text-secondary)] text-[17px] leading-relaxed max-w-lg mb-8">
              {active.body}
            </p>
            {active.cta && (
              <div className="flex flex-wrap gap-3">
                <Button href="/citizen/report" withArrow>
                  Report an Issue
                </Button>
                <Button href="#how-it-works" variant="secondary">
                  Explore the Platform
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* stage progress rail */}
        <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col gap-3">
          {stages.map((s, i) => (
            <div
              key={s.eyebrow}
              className={clsx(
                "h-8 w-[3px] rounded-full transition-all duration-500",
                i === activeIndex ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              )}
            />
          ))}
        </div>

        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
          <span className="eyebrow text-[10.5px] opacity-70">
            SCROLL TO EXPLORE
          </span>
        </div>
      </div>
    </div>
  );
}
