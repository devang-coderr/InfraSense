"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/useAuth";
import {
  User,
  Bell,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Building,
} from "lucide-react";

const PREFS_STORAGE_KEY = "infrasense_notification_preferences";

interface NotificationPreferences {
  emailAlerts: boolean;
  pushAlerts: boolean;
  urgentSms: boolean;
}

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const isAuthority = Boolean(user?.role && user.role !== "citizen");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [urgentSms, setUrgentSms] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load saved preferences from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<NotificationPreferences>;
        if (typeof parsed.emailAlerts === "boolean") setEmailAlerts(parsed.emailAlerts);
        if (typeof parsed.pushAlerts === "boolean") setPushAlerts(parsed.pushAlerts);
        if (typeof parsed.urgentSms === "boolean") setUrgentSms(parsed.urgentSms);
      }
    } catch (e) {
      // Ignore parse/storage errors
    }
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prefs: NotificationPreferences = {
        emailAlerts,
        pushAlerts,
        urgentSms,
      };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to persist notification preferences", e);
    }
  };

  const innerContent = (
    <div>
      {!isAuthority && (
        <div className="mb-4">
          <Link
            href="/citizen"
            className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-mono text-[#8D918F] hover:text-[#F3F0E8] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Citizen Dashboard</span>
          </Link>
        </div>
      )}

      <PageHeader
        eyebrow="Preferences"
        title="Account & Portal Settings"
        description="Manage your user identity details, local notification preferences, and session controls."
      />

      <div className="space-y-6 mt-6">
        {/* Section 1: Account Information */}
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#2C2A25]">
            <User size={16} className="text-[#F4B52C]" />
            <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
              Account Profile
            </h3>
          </div>

          {loading ? (
            <div className="h-20 rounded-xl bg-[#1C1F21] animate-pulse" />
          ) : user ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[var(--accent-soft)] border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[20px] font-bold flex items-center justify-center shrink-0">
                  {user.name ? user.name.trim().charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[16px] font-semibold text-[#F3F0E8]">{user.name}</h4>
                    <span className="text-[10.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2C2A25] text-[#F4B52C] border border-[#F4B52C]/30">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#8D918F] mt-0.5">{user.email}</div>
                  {user.department && (
                    <div className="flex items-center gap-1.5 text-[11.5px] font-mono text-[#4C7A5E] mt-1.5">
                      <Building size={12} />
                      <span>Department: {user.department}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout(user.role === "citizen" ? "citizen" : "authority")}
                className="focus-ring self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-medium bg-[#1C1F21] border border-[var(--critical)]/30 text-[var(--critical)] hover:bg-[var(--critical)]/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-between">
              <span className="text-[13px] text-[#8D918F]">No active session detected.</span>
              <Link
                href="/login"
                className="focus-ring px-3.5 py-1.5 rounded-lg bg-[#F4B52C] text-[#0D0F10] font-semibold text-[12.5px]"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Section 2: Notification Preferences (Persisted in localStorage) */}
        <form onSubmit={handleSavePreferences} className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#F4B52C]" />
              <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                Notification Subscriptions
              </h3>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#4C7A5E] bg-[#4C7A5E]/15 px-2.5 py-1 rounded-full border border-[#4C7A5E]/30">
                <CheckCircle2 size={13} />
                <span>Preferences Saved (Browser Storage)</span>
              </span>
            )}
          </div>

          <p className="text-[12px] text-[#8D918F] mb-4">
            Configure how you receive updates regarding submitted reports and operational dispatches. Preferences are saved locally to your browser.
          </p>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25] cursor-pointer hover:border-[#F4B52C]/30 transition-colors">
              <div>
                <div className="text-[13.5px] font-medium text-[#F3F0E8]">
                  Email Digest & Status Notifications
                </div>
                <div className="text-[12px] text-[#8D918F]">
                  Receive email notifications for issue verification, assignment, and closeout
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="h-4 w-4 accent-[#F4B52C] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25] cursor-pointer hover:border-[#F4B52C]/30 transition-colors">
              <div>
                <div className="text-[13.5px] font-medium text-[#F3F0E8]">
                  In-App Real-Time Alerts
                </div>
                <div className="text-[12px] text-[#8D918F]">
                  Display alert badges and notification drawer updates
                </div>
              </div>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
                className="h-4 w-4 accent-[#F4B52C] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25] cursor-pointer hover:border-[#F4B52C]/30 transition-colors">
              <div>
                <div className="text-[13.5px] font-medium text-[#F3F0E8]">
                  Urgent Hazard SMS
                </div>
                <div className="text-[12px] text-[#8D918F]">
                  Receive direct SMS dispatches for critical safety hazards
                </div>
              </div>
              <input
                type="checkbox"
                checked={urgentSms}
                onChange={(e) => setUrgentSms(e.target.checked)}
                className="h-4 w-4 accent-[#F4B52C] cursor-pointer"
              />
            </label>
          </div>

          <div className="mt-5 pt-4 border-t border-[#2C2A25] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8D918F]">
              Storage: infrasense_notification_preferences
            </span>
            <button
              type="submit"
              className="focus-ring px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#F4B52C] text-[#0D0F10] hover:bg-[#F4B52C]/90 transition-colors cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>

        {/* Section 3: Session Control */}
        {user && (
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-[#F3F0E8]">Session Management</h3>
              <p className="text-[12.5px] text-[#8D918F] mt-0.5">
                Sign out of your active InfraSense session on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={() => logout(user.role === "citizen" ? "citizen" : "authority")}
              className="focus-ring flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-medium bg-[#1C1F21] border border-[var(--critical)]/30 text-[var(--critical)] hover:bg-[var(--critical)]/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isAuthority) {
    return <AuthorityShell>{innerContent}</AuthorityShell>;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 text-[var(--text)]">
      {innerContent}
    </main>
  );
}
