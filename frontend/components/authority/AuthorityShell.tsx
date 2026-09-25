"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  ListOrdered,
  BarChart3,
  TrendingUp,
  Building2,
  LogOut,
  ChevronRight,
  Bell,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

const nav = [
  { href: "/authority", label: "Dashboard", icon: LayoutDashboard },
  { href: "/authority/map", label: "Live Map", icon: Map },
  { href: "/authority/priority", label: "Priority Queue", icon: ListOrdered },
  { href: "/authority/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/authority/predictions", label: "Predictions", icon: TrendingUp },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AuthorityShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "A";
  const roleLabel = user?.department || (user?.role ? user.role.replace("_", " ") : "Municipal Officer");

  return (
    <div className="pt-24 md:pt-28 min-h-screen flex flex-col md:flex-row max-w-[1540px] mx-auto px-3 sm:px-6">
      {/* Sidebar Navigation */}
      <aside className="md:w-[240px] shrink-0 md:sticky md:top-28 md:h-[calc(100vh-8.5rem)] mb-6 md:mb-0 flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[#151718]/80 backdrop-blur-md p-3.5 sm:p-4 shadow-lg">
        <div>
          {/* Header & Mode Badge */}
          <div className="flex items-center justify-between mb-4 md:mb-6 px-1.5 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#F4B52C]" />
              <div className="flex flex-col">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#F4B52C] font-semibold">
                  Command Center
                </span>
                <span className="text-[12px] font-medium text-[var(--text)]">
                  Authority Portal
                </span>
              </div>
            </div>

            {/* Mobile User Control */}
            <div className="flex md:hidden items-center gap-2">
              {loading ? (
                <div className="h-6 w-16 rounded bg-[var(--border)]/40 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-1.5 bg-[#1C1F21] border border-[var(--border)] rounded-lg px-2 py-1">
                  <span className="h-5 w-5 rounded-full bg-[var(--accent-soft)] text-[#F4B52C] font-mono text-[10px] font-bold flex items-center justify-center">
                    {initial}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--text)] max-w-[80px] truncate">
                    {user.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => logout("authority")}
                    title="Sign Out"
                    aria-label="Sign Out"
                    className="focus-ring text-[var(--text-muted)] hover:text-[var(--critical)] p-0.5 cursor-pointer"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login?role=authority"
                  className="focus-ring text-[11px] font-mono border border-[var(--border)] rounded px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text)]"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {nav.map((n) => {
              const active = pathname === n.href;
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`focus-ring flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
                    active
                      ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/35 font-semibold shadow-sm"
                      : "text-[#8D918F] hover:text-[#F3F0E8] hover:bg-[#1C1F21]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={16}
                      className={active ? "text-[#F4B52C]" : "text-[#8D918F]"}
                    />
                    <span>{n.label}</span>
                  </div>
                  {active && (
                    <span className="hidden md:block h-1.5 w-1.5 rounded-full bg-[#F4B52C]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop User Identity & Session Status */}
        <div className="hidden md:block pt-4 border-t border-[var(--border)] mt-auto space-y-2">
          {loading ? (
            <div className="h-14 rounded-xl bg-[var(--border)]/30 animate-pulse p-3" />
          ) : user ? (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#1C1F21] border border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-8 w-8 rounded-full bg-[var(--accent-soft)] text-[#F4B52C] font-mono text-[12px] font-bold flex items-center justify-center shrink-0">
                  {initial}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[var(--text)] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10.5px] font-mono text-[#8D918F] truncate capitalize">
                    {roleLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout("authority")}
                title="Sign Out"
                aria-label="Sign Out"
                className="focus-ring p-1.5 rounded-lg text-[#8D918F] hover:text-[var(--critical)] hover:bg-[var(--critical)]/10 transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link
              href="/login?role=authority"
              className="focus-ring flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[#1C1F21] hover:bg-[#25282A] px-3 py-2.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            >
              <span>Authority Sign In</span>
            </Link>
          )}

          {/* System status indicator */}
          <div className="flex items-center justify-between px-1 text-[10px] font-mono text-[#8D918F]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4C7A5E] pulse-dot" />
              <span>LIVE SYSTEM</span>
            </span>
            <span className="uppercase text-[#6F6B63]">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-8 lg:pl-10 pb-24 min-w-0">{children}</div>
    </div>
  );
}
