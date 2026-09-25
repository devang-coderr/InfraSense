"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListChecks, Camera, LogOut, Bell, Settings } from "lucide-react";
import type { AuthUser } from "@/lib/api/auth";

interface CitizenUserMenuProps {
  user: AuthUser | null;
  loading: boolean;
  onLogout: () => void;
}

export function CitizenUserMenu({ user, loading, onLogout }: CitizenUserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (loading) {
    return <div className="h-8 w-24 rounded-lg bg-[var(--border)]/40 animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        href="/login?role=citizen"
        className="focus-ring text-[12px] font-mono border border-[var(--border)] rounded-lg px-3 py-1.5 hover:bg-[var(--bg-alt)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
      >
        Citizen Sign In
      </Link>
    );
  }

  const initial = user.name ? user.name.trim().charAt(0).toUpperCase() : "C";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="focus-ring flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg-alt)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--text)] transition-colors cursor-pointer"
        aria-expanded={open}
        aria-label="User account menu"
      >
        <span className="h-6 w-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
          {initial}
        </span>
        <span className="max-w-[120px] truncate">{user.name}</span>
        <ChevronDown
          size={14}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow)] z-50">
          <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
            <div className="text-[13px] font-medium text-[var(--text)] truncate">{user.name}</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-mono uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] px-1.5 py-0.5 rounded">
                Citizen
              </span>
            </div>
          </div>

          <Link
            href="/citizen/reports"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
          >
            <ListChecks size={15} className="text-[var(--accent)]" />
            <span>My Reports</span>
          </Link>

          <Link
            href="/citizen/report"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
          >
            <Camera size={15} className="text-[var(--accent)]" />
            <span>Report Issue</span>
          </Link>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
          >
            <Bell size={15} className="text-[var(--accent)]" />
            <span>Notifications</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
          >
            <Settings size={15} className="text-[var(--accent)]" />
            <span>Settings</span>
          </Link>

          <div className="my-1 border-t border-[var(--border)]" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="focus-ring w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-[var(--critical)] hover:bg-[var(--critical)]/10 transition-colors cursor-pointer text-left"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
