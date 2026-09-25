import * as React from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Severity, severityColor, severityLabel } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = severityColor[severity] || "var(--accent)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider"
      style={{
        color: color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {severityLabel[severity] || severity}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  size = "md",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "critical" | "low" | "high";
  size?: "sm" | "md";
}) {
  const toneMap = {
    neutral: "text-[var(--text-secondary)] border-[var(--border)] bg-[var(--surface)]",
    accent: "text-[#F4B52C] border-[#F4B52C]/30 bg-[#F4B52C]/10",
    critical: "text-[var(--critical)] border-[var(--critical)]/30 bg-[var(--critical)]/10",
    high: "text-[var(--high)] border-[var(--high)]/30 bg-[var(--high)]/10",
    low: "text-[var(--low)] border-[var(--low)]/30 bg-[var(--low)]/10",
  } as const;

  const sizeMap = {
    sm: "px-2 py-0.5 text-[10.5px]",
    md: "px-2.5 py-1 text-[11.5px]",
  } as const;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-wider font-medium",
        toneMap[tone],
        sizeMap[size]
      )}
    >
      {children}
    </span>
  );
}

export function TechnicalBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[#8D918F] font-mono text-[11px] uppercase tracking-wider",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("card-surface p-5 sm:p-6", className)}>{children}</div>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("panel-surface p-5 sm:p-6", className)}>{children}</div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={clsx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <div className="eyebrow mb-2.5">{eyebrow}</div>
      <h2 className="display-xl text-[clamp(26px,3.6vw,44px)] font-bold text-[var(--text)] mb-3 tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-[var(--text-secondary)] text-[14.5px] sm:text-[15.5px] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export function ScoreBar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[12.5px] mb-1.5">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono text-[var(--text)] font-semibold">
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-alt)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AlertBanner({
  message,
  variant = "error",
  className,
}: {
  message: string;
  variant?: "error" | "warning" | "success" | "info";
  className?: string;
}) {
  const variantStyles = {
    error: "bg-[#B23A2C]/15 border-[#B23A2C]/40 text-[#F4F1E8]",
    warning: "bg-[#C88A2A]/15 border-[#C88A2A]/40 text-[#F4F1E8]",
    success: "bg-[#4C7A5E]/15 border-[#4C7A5E]/40 text-[#F4F1E8]",
    info: "bg-[#1C1F21] border-[#2C2A25] text-[#F4F1E8]",
  }[variant];

  const Icon = {
    error: AlertCircle,
    warning: AlertCircle,
    success: CheckCircle2,
    info: Info,
  }[variant];

  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 p-3 rounded-xl border text-[12.5px] leading-relaxed",
        variantStyles,
        className
      )}
      role="alert"
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">{message}</div>
    </div>
  );
}
