import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";

interface BaseProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  withArrow?: boolean;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

type ButtonProps = BaseProps &
  (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">)
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  );

export function Button({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  href,
  disabled,
  ...rest
}: ButtonProps) {
  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-[12.5px] rounded-lg",
    md: "px-5 py-2.5 text-[13.5px] rounded-xl",
    lg: "px-6 py-3.5 text-[14.5px] rounded-xl font-semibold",
  }[size];

  const variantStyles = {
    primary:
      "bg-[#F4B52C] text-[#0D0F10] font-semibold hover:bg-[#e0a424] shadow-sm active:scale-[0.99]",
    secondary:
      "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface)] active:scale-[0.99]",
    outline:
      "bg-transparent border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.99]",
    ghost:
      "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]",
    danger:
      "bg-[var(--critical)]/15 border border-[var(--critical)]/40 text-[#F4F1E8] hover:bg-[var(--critical)]/25",
  }[variant];

  const styles = clsx(
    "focus-ring inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 whitespace-nowrap cursor-pointer",
    sizeStyles,
    variantStyles,
    disabled && "opacity-50 pointer-events-none cursor-not-allowed",
    className
  );

  const content = (
    <>
      {children}
      {withArrow && (
        <ArrowRight
          size={15}
          className="transition-transform duration-200 group-hover:translate-x-1 shrink-0"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={clsx(styles, "group")}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      disabled={disabled}
      className={clsx(styles, "group")}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
