"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/useAuth";

const links = [
  { href: "/#platform", label: "Platform" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#intelligence", label: "Intelligence" },
  { href: "/authority", label: "For Authorities" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuOpen]);

  const isCitizenPath = pathname.startsWith("/citizen");
  const isAuthorityPath = pathname.startsWith("/authority");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 sm:pt-4 px-3 sm:px-6 pointer-events-none">
      <nav
        className={`pointer-events-auto transition-all duration-300 flex items-center justify-between ${
          scrolled
            ? "w-full max-w-[1180px] rounded-2xl border border-[var(--border)] bg-[#151718]/90 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-xl"
            : "w-full max-w-[1400px] px-4 sm:px-8 py-2.5 bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-lg py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] pulse-dot" />
          <span className="font-semibold tracking-tight text-[15px] text-[var(--text)]">
            INFRA<span className="text-[var(--accent)]">SENSE</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
          {links.map((l) => {
            const isActive =
              l.href === "/"
                ? pathname === "/"
                : l.href.startsWith("/#")
                ? false
                : pathname.startsWith(l.href);

            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`focus-ring text-[13.5px] transition-colors font-medium py-1 px-1.5 rounded relative ${
                    isActive
                      ? "text-[var(--text)] font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  {l.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1.5 right-1.5 h-[2px] bg-[var(--accent)] rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop Right Actions & Auth Status */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle compact />

          {loading ? (
            <div className="h-8 w-32 rounded-xl bg-[var(--border)]/30 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2 pl-1">
              {user.role === "citizen" ? (
                <Link
                  href="/citizen"
                  className={`focus-ring flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    isCitizenPath
                      ? "bg-[#25282A] border-[var(--accent)]/40 text-[var(--text)] shadow-sm font-semibold"
                      : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded">
                    Citizen
                  </span>
                </Link>
              ) : (
                <Link
                  href="/authority"
                  className={`focus-ring flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    isAuthorityPath
                      ? "bg-[#25282A] border-[var(--accent)]/40 text-[var(--text)] shadow-sm font-semibold"
                      : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded">
                    Officer
                  </span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => logout(user.role === "citizen" ? "citizen" : "authority")}
                title="Sign Out"
                aria-label="Sign Out"
                className="focus-ring p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--critical)] hover:bg-[var(--critical)]/10 border border-transparent hover:border-[var(--critical)]/20 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button href="/login?role=citizen" variant="secondary" size="sm">
                Citizen Portal
              </Button>
              <Button href="/login?role=authority" variant="primary" size="sm">
                Authority Login
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex lg:hidden items-center gap-2.5">
          <ThemeToggle compact />
          <button
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
            className="focus-ring p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text)]"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile Fullscreen Navigation Drawer */}
      {menuOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[100] bg-[#0D0F10]/98 backdrop-blur-xl flex flex-col p-6 sm:p-8 animate-fade-up">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-[var(--border)]">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] pulse-dot" />
              <span className="font-semibold text-[16px] text-[var(--text)]">
                INFRA<span className="text-[var(--accent)]">SENSE</span>
              </span>
            </Link>
            <button
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="focus-ring p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text)]"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Status Card in Mobile Menu */}
          {user && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-mono text-[13px] font-bold flex items-center justify-center">
                  {user.name ? user.name.trim().charAt(0).toUpperCase() : "U"}
                </span>
                <div>
                  <div className="text-[14px] font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] capitalize">
                    {user.role.replace("_", " ")} {user.department ? `· ${user.department}` : ""}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout(user.role === "citizen" ? "citizen" : "authority");
                }}
                className="text-[12px] font-medium text-[var(--critical)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Exit</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <ul className="flex flex-col gap-3 mb-8 overflow-y-auto">
            {links.map((l) => {
              const isActive =
                l.href === "/"
                  ? pathname === "/"
                  : l.href.startsWith("/#")
                  ? false
                  : pathname.startsWith(l.href);

              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={`focus-ring flex items-center justify-between p-3 rounded-xl text-[18px] font-medium transition-colors ${
                      isActive
                        ? "bg-[#25282A] text-[var(--text)] border border-[var(--accent)]/30 font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <span>{l.label}</span>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Mobile Bottom Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[var(--border)]">
            {user ? (
              <Button
                href={user.role === "citizen" ? "/citizen" : "/authority"}
                variant="primary"
                className="justify-center py-3"
                onClick={() => setMenuOpen(false)}
              >
                {user.role === "citizen" ? "Open Citizen Dashboard →" : "Open Command Center →"}
              </Button>
            ) : (
              <>
                <Button
                  href="/login?role=citizen"
                  variant="secondary"
                  className="justify-center py-3"
                  onClick={() => setMenuOpen(false)}
                >
                  Citizen Portal
                </Button>
                <Button
                  href="/login?role=authority"
                  variant="primary"
                  className="justify-center py-3"
                  onClick={() => setMenuOpen(false)}
                >
                  Authority Login
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
